<?php

namespace App\Domain\HelpCenter\Events;

use App\Domain\HelpCenter\Models\KnowledgeSource;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired whenever a knowledge source (sitemap/URL) finishes a sync attempt,
 * so the Knowledge Sources page can refresh its indexing status live
 * instead of requiring a manual page reload.
 */
class KnowledgeSourceSyncUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly KnowledgeSource $source) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("team.{$this->source->team_id}")];
    }

    public function broadcastAs(): string
    {
        return 'knowledge-source.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->source->id,
            'status' => $this->source->last_sync_error !== null ? 'failed' : 'indexed',
            'last_synced_at' => $this->source->last_synced_at?->toIso8601String(),
            'last_sync_error' => $this->source->last_sync_error,
        ];
    }
}
