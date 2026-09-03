<?php

namespace App\Domain\Integration\Services;

use App\Domain\Integration\Jobs\DispatchWebhookJob;
use App\Domain\Integration\Models\Webhook;

class WebhookDispatcher
{
    /**
     * Dispatch webhook jobs for all active webhooks subscribed to the given event.
     *
     * @param  array<string, mixed>  $payload
     */
    public static function dispatch(int $teamId, string $event, array $payload): void
    {
        // Fetch webhooks matching team and active state
        $webhooks = Webhook::where('team_id', $teamId)
            ->where('is_active', true)
            ->get();

        foreach ($webhooks as $webhook) {
            if ($webhook->isSubscribedTo($event)) {
                DispatchWebhookJob::dispatch($webhook, $event, $payload);
            }
        }
    }
}
