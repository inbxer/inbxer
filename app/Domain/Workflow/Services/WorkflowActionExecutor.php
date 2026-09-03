<?php

namespace App\Domain\Workflow\Services;

use App\Domain\Ai\Services\AiDispatcher;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Executes a single workflow action step against a thread. A handful of
 * actions (Slack notification, HTTP request) also support running against a
 * tenant directly for thread-less triggers like "Customer Created"; the rest
 * are thread-only and are skipped when no thread is available.
 */
class WorkflowActionExecutor
{
    public function __construct(private readonly SlackClient $slack) {}

    /**
     * @param  array<string, mixed>|null  $config
     * @return array<string, mixed> output logged against the run
     */
    public function execute(string $actionType, ?array $config, ?Thread $thread, ?Tenant $tenant = null): array
    {
        $config ??= [];

        if (! $thread) {
            return match ($actionType) {
                'send_slack_notification' => $this->sendSlackNotification($config, null, $tenant),
                'send_http_request' => $this->sendHttpRequest($config, null, $tenant),
                default => ['skipped' => true, 'reason' => "Action \"{$actionType}\" requires a thread and this trigger has none."],
            };
        }

        return match ($actionType) {
            'apply_labels' => $this->applyLabels($thread, $config),
            'remove_labels' => $this->removeLabels($thread, $config),
            'assign_to_user' => $this->assignToUser($thread, $config),
            'unassign_thread' => $this->unassignThread($thread),
            'set_priority' => $this->setPriority($thread, $config),
            'set_status' => $this->setStatus($thread, $config),
            'set_tier' => $this->setTier($thread, $config),
            'add_note' => $this->addNote($thread, $config),
            'lock_thread' => $this->lockThread($thread),
            'assign_to_ai' => $this->assignToAi($thread),
            'send_slack_notification' => $this->sendSlackNotification($config, $thread),
            'send_http_request' => $this->sendHttpRequest($config, $thread),
            default => ['skipped' => true, 'reason' => "Unknown action type: {$actionType}"],
        };
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function applyLabels(Thread $thread, array $config): array
    {
        $labelIds = $config['label_ids'] ?? [];
        $existing = $thread->labels()->pluck('labels.id')->all();
        $thread->labels()->syncWithoutDetaching($labelIds);
        $this->logNote($thread, 'Workflow applied '.count($labelIds).' label(s).');

        return ['label_ids' => $labelIds, 'previously_had' => $existing];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function removeLabels(Thread $thread, array $config): array
    {
        $labelIds = $config['label_ids'] ?? [];
        $thread->labels()->detach($labelIds);
        $this->logNote($thread, 'Workflow removed '.count($labelIds).' label(s).');

        return ['label_ids' => $labelIds];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function assignToUser(Thread $thread, array $config): array
    {
        $userId = $config['user_id'] ?? null;
        $thread->update(['assigned_to' => $userId]);
        $this->logNote($thread, $userId ? 'Workflow assigned this thread.' : 'Workflow unassigned this thread.');

        return ['assigned_to' => $userId];
    }

    private function unassignThread(Thread $thread): array
    {
        $thread->update(['assigned_to' => null]);
        $this->logNote($thread, 'Workflow unassigned this thread.');

        return ['assigned_to' => null];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function setPriority(Thread $thread, array $config): array
    {
        $priority = ThreadPriority::tryFrom($config['priority'] ?? '');

        if (! $priority) {
            return ['skipped' => true, 'reason' => 'Invalid priority value'];
        }

        $thread->update(['priority' => $priority]);
        $this->logNote($thread, "Workflow set priority to {$priority->value}.");

        return ['priority' => $priority->value];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function setStatus(Thread $thread, array $config): array
    {
        $status = ThreadStatus::tryFrom($config['status'] ?? '');

        if (! $status) {
            return ['skipped' => true, 'reason' => 'Invalid status value'];
        }

        $thread->update(['status' => $status]);
        $this->logNote($thread, "Workflow changed status to {$status->value}.");

        return ['status' => $status->value];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function setTier(Thread $thread, array $config): array
    {
        $tierId = $config['tier_id'] ?? null;

        if ($tierId && ! Tier::where('id', $tierId)->where('team_id', $thread->team_id)->exists()) {
            return ['skipped' => true, 'reason' => 'Tier not found for this team'];
        }

        $thread->update(['tier_id' => $tierId]);
        $this->logNote($thread, 'Workflow updated the tier for this thread.');

        return ['tier_id' => $tierId];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function addNote(Thread $thread, array $config): array
    {
        $body = (string) ($config['body'] ?? '');

        if ($body === '') {
            return ['skipped' => true, 'reason' => 'Empty note body'];
        }

        $thread->timelineEntries()->create([
            'actor_type' => ActorType::System,
            'actor_id' => null,
            'entry_type' => TimelineEntryType::WorkflowAction,
            'is_internal' => true,
            'body' => $body,
        ]);

        return ['body' => $body];
    }

    private function lockThread(Thread $thread): array
    {
        $thread->update(['status' => ThreadStatus::Ignored, 'locked_at' => now()]);
        $this->logNote($thread, 'Workflow locked this thread.');

        return ['locked' => true];
    }

    private function assignToAi(Thread $thread): array
    {
        app(AiDispatcher::class)->dispatchFor($thread);
        $this->logNote($thread, 'Workflow handed this thread to the AI Agent.');

        return ['assigned_to_ai' => true];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function sendSlackNotification(array $config, ?Thread $thread, ?Tenant $tenant = null): array
    {
        $channelId = $config['channel_id'] ?? null;
        $slackChannelId = $config['slack_channel_id'] ?? null;
        $message = (string) ($config['message'] ?? '');
        $teamId = ($thread ? $thread->team_id : null) ?? ($tenant ? $tenant->team_id : null);

        if (! $channelId || ! $slackChannelId || $message === '' || ! $teamId) {
            return ['skipped' => true, 'reason' => 'Missing Slack channel or message'];
        }

        $channel = Channel::where('team_id', $teamId)
            ->where('type', ChannelType::Slack)
            ->find($channelId);

        if (! $channel) {
            return ['skipped' => true, 'reason' => 'Slack workspace not found'];
        }

        try {
            $this->slack->postMessage($channel, $slackChannelId, $this->interpolate($message, $thread, $tenant));

            return ['sent' => true];
        } catch (\Throwable $exception) {
            report($exception);

            return ['skipped' => true, 'reason' => 'Slack API error: '.$exception->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function sendHttpRequest(array $config, ?Thread $thread, ?Tenant $tenant = null): array
    {
        $url = $config['url'] ?? null;
        $method = strtolower($config['method'] ?? 'post');

        if (! $url) {
            return ['skipped' => true, 'reason' => 'Missing URL'];
        }

        $payload = $thread
            ? [
                'thread_id' => $thread->id,
                'sequence_number' => $thread->sequence_number,
                'status' => $thread->status->value,
                'priority' => $thread->priority->value,
            ]
            : [
                'tenant_id' => $tenant?->id,
                'tenant_name' => $tenant?->name,
                'tenant_email' => $tenant?->email,
            ];

        try {
            $response = Http::timeout(10)->{$method}($url, $payload);

            return ['status_code' => $response->status()];
        } catch (\Throwable $exception) {
            Log::warning('Workflow HTTP action failed: '.$exception->getMessage());

            return ['skipped' => true, 'reason' => 'HTTP request failed'];
        }
    }

    private function interpolate(string $message, ?Thread $thread, ?Tenant $tenant = null): string
    {
        if ($thread) {
            return str_replace(
                ['{{thread.title}}', '{{thread.reference}}', '{{thread.status}}'],
                [$thread->title ?? '', "T-{$thread->sequence_number}", $thread->status->value],
                $message,
            );
        }

        return str_replace(
            ['{{tenant.name}}', '{{tenant.email}}'],
            [$tenant ? $tenant->name : '', $tenant ? $tenant->email : ''],
            $message,
        );
    }

    private function logNote(Thread $thread, string $body): void
    {
        $thread->timelineEntries()->create([
            'actor_type' => ActorType::System,
            'actor_id' => null,
            'entry_type' => TimelineEntryType::WorkflowAction,
            'is_internal' => true,
            'body' => $body,
        ]);
    }
}
