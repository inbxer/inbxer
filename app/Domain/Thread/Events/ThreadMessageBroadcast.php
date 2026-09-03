<?php

namespace App\Domain\Thread\Events;

use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired whenever a new customer-facing message is added to a thread, from any channel
 * (Slack, email, chat widget, or an agent reply). Broadcast synchronously (no queue worker
 * required) to the team's dashboard channel, and additionally to a public channel for the
 * chat widget when the thread came from a Chat channel.
 */
class ThreadMessageBroadcast implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public ThreadTimelineEntry $entry) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $thread = $this->entry->thread;
        $channels = [new PrivateChannel("team.{$thread->team_id}")];

        $externalId = $thread->external_id ?? '';
        if (! $this->entry->is_internal && str_starts_with($externalId, 'chat:')) {
            $channels[] = new Channel('chat.'.str_replace(':', '.', $externalId));
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.created';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $thread = $this->entry->thread;

        return [
            'thread_id' => $thread->id,
            'sequence_number' => $thread->sequence_number,
            'message' => [
                'id' => $this->entry->id,
                'body' => $this->entry->body,
                'from' => match ($this->entry->actor_type) {
                    ActorType::Tenant => 'visitor',
                    ActorType::Ai => 'ai',
                    default => 'agent',
                },
                'attachments' => $this->entry->metadata['attachments'] ?? [],
                'created_at' => $this->entry->created_at?->toIso8601String(),
            ],
        ];
    }
}
