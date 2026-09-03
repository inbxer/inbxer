<?php

namespace App\Domain\Integration\Jobs;

use App\Domain\Integration\Models\Webhook;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DispatchWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 30;

    /**
     * Create a new job instance.
     *
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        protected Webhook $webhook,
        protected string $event,
        protected array $payload
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if (! $this->webhook->is_active) {
            return;
        }

        $payloadData = [
            'id' => (string) Str::ulid(),
            'event' => $this->event,
            'timestamp' => now()->toIso8601String(),
            'data' => $this->payload,
        ];

        $jsonPayload = json_encode($payloadData, JSON_THROW_ON_ERROR);

        // Sign the payload using HMAC-SHA256
        $signature = hash_hmac('sha256', $jsonPayload, $this->webhook->secret);

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'X-Inbxer-Signature' => $signature,
            'User-Agent' => 'Inbxer-Webhook-Dispatcher/1.0',
        ])
            ->timeout(10)
            ->withBody($jsonPayload, 'application/json')
            ->post($this->webhook->url);

        if ($response->failed()) {
            Log::warning("Webhook dispatch failed to URL: {$this->webhook->url}. Status: {$response->status()}");
            throw new \Exception("Webhook failed with status: {$response->status()}");
        }

        // Update last triggered timestamp
        $this->webhook->timestamps = false;
        $this->webhook->update([
            'last_triggered_at' => now(),
        ]);
    }
}
