<?php

namespace App\Domain\Channel\Jobs;

use App\Domain\Channel\Models\SlackEventReceipt;
use App\Domain\Channel\Services\InboundSlackProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ProcessSlackEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;

    public array $backoff = [1, 5, 15];

    public int $timeout = 30;

    public function __construct(public readonly string $receiptId, public readonly array $payload) {}

    public function handle(InboundSlackProcessor $processor): void
    {
        $processor->process($this->payload);
        SlackEventReceipt::find($this->receiptId)?->update(['processed_at' => now(), 'error' => null]);
    }

    public function failed(?Throwable $exception): void
    {
        SlackEventReceipt::find($this->receiptId)?->update(['error' => $exception?->getMessage()]);
    }
}
