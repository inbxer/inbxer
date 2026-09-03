<?php

namespace App\Domain\Channel\Services;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InboundSlackProcessor
{
    public function __construct(private readonly SlackClient $slack) {}

    public function process(array $payload): ?Thread
    {
        $event = $payload['event'] ?? [];
        $workspace = $this->workspace((string) ($payload['team_id'] ?? $event['team'] ?? ''));
        if (! $workspace) {
            return null;
        }

        return match ($event['type'] ?? null) {
            'message' => $this->handleMessage($workspace, $event),
            'reaction_added' => $this->handleReaction($workspace, $event),
            'channel_created' => $this->handleChannelCreated($workspace, $event),
            default => null,
        };
    }

    private function handleMessage(Channel $workspace, array $event, bool $force = false): ?Thread
    {
        if (isset($event['bot_id']) || isset($event['subtype']) || empty($event['channel']) || empty($event['ts'])) {
            return null;
        }

        $settings = $workspace->settings ?? [];
        $channelSetting = collect($settings['connected_channels'] ?? [])
            ->first(fn (array $item): bool => ($item['id'] ?? null) === $event['channel']);
        if (! $channelSetting || ($channelSetting['type'] ?? 'Customer') === 'Disabled') {
            return null;
        }

        $channelMode = $channelSetting['ingestion_mode'] ?? 'team_default';
        $effectiveMode = $channelMode === 'team_default' ? ($settings['ingestion_mode'] ?? 'time_based') : $channelMode;
        if (! $force && $effectiveMode === 'manual_emoji') {
            return null;
        }

        $rootTs = (string) ($event['thread_ts'] ?? $event['ts']);
        $externalId = "slack:{$event['channel']}:{$rootTs}";
        $thread = Thread::where('team_id', $workspace->team_id)->where('external_id', $externalId)->first();

        if (! $thread && isset($event['thread_ts'])) {
            return null;
        }

        if (! $thread) {
            $thread = Cache::lock("slack-thread:{$workspace->team_id}:{$event['channel']}:{$rootTs}", 10)
                ->block(3, fn (): Thread => DB::transaction(function () use ($workspace, $event, $externalId, $rootTs): Thread {
                    $existing = Thread::where('team_id', $workspace->team_id)->where('external_id', $externalId)->first();
                    if ($existing) {
                        return $existing;
                    }

                    $sequence = (Thread::where('team_id', $workspace->team_id)->lockForUpdate()->max('sequence_number') ?? 0) + 1;

                    return Thread::create([
                        'team_id' => $workspace->team_id,
                        'channel_id' => $workspace->id,
                        'sequence_number' => $sequence,
                        'title' => Str::limit(trim((string) ($event['text'] ?? 'Slack support request')), 180),
                        'status' => ThreadStatus::NeedsFirstResponse,
                        'priority' => ThreadPriority::Normal,
                        'external_id' => $externalId,
                        'metadata' => [
                            'slack_channel_id' => $event['channel'],
                            'slack_thread_ts' => $rootTs,
                            'slack_user_id' => $event['user'] ?? null,
                        ],
                    ]);
                }));
        } elseif ($thread->status->isResolved()) {
            $thread->update(['status' => ThreadStatus::NeedsNextResponse, 'resolved_at' => null]);
        }

        $alreadyExists = $thread->timelineEntries()
            ->where('metadata->slack_ts', (string) $event['ts'])
            ->exists();

        if (! $alreadyExists) {
            $entry = $thread->timelineEntries()->create([
                'actor_type' => ActorType::Tenant,
                'actor_id' => $event['user'] ?? null,
                'entry_type' => TimelineEntryType::Message,
                'body' => trim((string) ($event['text'] ?? '')),
                'is_internal' => false,
                'metadata' => [
                    'channel' => 'slack',
                    'slack_ts' => (string) $event['ts'],
                    'slack_thread_ts' => $rootTs,
                    'slack_channel_id' => $event['channel'],
                    'slack_user_id' => $event['user'] ?? null,
                    'files' => $event['files'] ?? [],
                ],
            ]);
            $thread->touch();
            ThreadMessageBroadcast::dispatch($entry);

            $this->autoAssignReplyingAgent($workspace, $thread, $settings, $event['user'] ?? null);
        }

        return $thread;
    }

    /**
     * Assign the thread to the agent who replied via their authorized Slack identity,
     * when the team's "assign on reply from Slack/Teams" setting is enabled.
     */
    private function autoAssignReplyingAgent(Channel $workspace, Thread $thread, array $settings, ?string $slackUserId): void
    {
        if (! $slackUserId || $thread->assigned_to !== null) {
            return;
        }

        $agentUserId = collect($settings['replying_as'] ?? [])
            ->search(fn (array $entry): bool => ($entry['slack_user_id'] ?? null) === $slackUserId);

        if ($agentUserId === false) {
            return;
        }

        $team = $workspace->team;
        $enabled = $team?->settings['workflow']['auto_assignment']['assign_on_reply_from_slack_teams'] ?? false;

        if ($enabled) {
            $thread->update(['assigned_to' => (int) $agentUserId]);
        }
    }

    private function handleReaction(Channel $workspace, array $event): ?Thread
    {
        $item = $event['item'] ?? [];
        if (($item['type'] ?? null) !== 'message' || empty($item['channel']) || empty($item['ts'])) {
            return null;
        }

        $reaction = (string) ($event['reaction'] ?? '');
        $externalId = "slack:{$item['channel']}:{$item['ts']}";
        $thread = Thread::where('team_id', $workspace->team_id)->where('external_id', $externalId)->first();

        if (! $thread && $reaction === (string) config('services.slack.manual_ingestion_reaction')) {
            $message = $this->slack->getMessage($workspace, $item['channel'], $item['ts']);
            if ($message) {
                $message['channel'] = $item['channel'];

                return $this->handleMessage($workspace, $message, true);
            }
        }

        if ($thread && ($workspace->settings['enable_reactions'] ?? true)) {
            $status = match ($reaction) {
                'white_check_mark', 'heavy_check_mark' => ThreadStatus::Done,
                'eyes' => ThreadStatus::Investigating,
                default => null,
            };
            if ($status) {
                $thread->update([
                    'status' => $status,
                    'resolved_at' => $status === ThreadStatus::Done ? now() : null,
                ]);
            }
        }

        return $thread;
    }

    private function handleChannelCreated(Channel $workspace, array $event): null
    {
        $slackChannel = $event['channel'] ?? [];
        $name = (string) ($slackChannel['name'] ?? '');
        $matches = collect($workspace->settings['auto_join_rules'] ?? [])->contains(
            fn (array $rule): bool => match ($rule['type'] ?? null) {
                'prefix' => str_starts_with($name, (string) ($rule['value'] ?? '')),
                'suffix' => str_ends_with($name, (string) ($rule['value'] ?? '')),
                default => false,
            },
        );

        if ($matches && ! empty($slackChannel['id'])) {
            $this->slack->joinChannel($workspace, (string) $slackChannel['id']);
        }

        return null;
    }

    private function workspace(string $slackTeamId): ?Channel
    {
        return Channel::withoutGlobalScopes()
            ->where('type', ChannelType::Slack)
            ->where('is_active', true)
            ->where('settings->slack_team_id', $slackTeamId)
            ->first();
    }
}
