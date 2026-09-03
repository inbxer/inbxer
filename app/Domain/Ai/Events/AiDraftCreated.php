<?php

namespace App\Domain\Ai\Events;

use App\Domain\Ai\Models\AiActivityLogEntry;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired when the AI drafts a reply in Shadow mode (pending review, nothing
 * sent yet) so the thread view can show the draft for approve/reject
 * without a manual page refresh.
 */
class AiDraftCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly AiActivityLogEntry $log) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("team.{$this->log->team_id}")];
    }

    public function broadcastAs(): string
    {
        return 'ai-draft.created';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return ['thread_id' => $this->log->thread_id];
    }
}
