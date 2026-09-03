<?php

namespace App\Domain\Channel\Jobs;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendOutboundSlackReplyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;

    public array $backoff = [1, 5, 15];

    public int $timeout = 30;

    public function __construct(public readonly string $threadId, public readonly string $entryId) {}

    public function handle(SlackClient $slack): void
    {
        $thread = Thread::with('channel')->find($this->threadId);
        $entry = ThreadTimelineEntry::find($this->entryId);
        if (! $thread || ! $entry || $thread->channel?->type !== ChannelType::Slack) {
            return;
        }

        $metadata = $thread->metadata ?? [];
        $slackChannelId = (string) ($metadata['slack_channel_id'] ?? '');
        $slackThreadTs = (string) ($metadata['slack_thread_ts'] ?? '');
        $userToken = ($thread->channel->settings['replying_as'] ?? [])[(string) $entry->actor_id]['access_token'] ?? null;

        $response = $userToken
            ? $slack->postMessageAsUser($userToken, $slackChannelId, (string) $entry->body, $slackThreadTs)
            : $slack->postMessage($thread->channel, $slackChannelId, (string) $entry->body, $slackThreadTs);
        $entry->update(['metadata' => array_merge($entry->metadata ?? [], [
            'channel' => 'slack',
            'slack_ts' => $response['ts'] ?? null,
        ])]);
    }

    public function failed(?Throwable $exception): void
    {
        report($exception);
    }
}
