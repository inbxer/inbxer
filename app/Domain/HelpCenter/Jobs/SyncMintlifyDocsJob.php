<?php

namespace App\Domain\HelpCenter\Jobs;

use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\HelpCenter\Services\MintlifyClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncMintlifyDocsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int */
    public $tries = 3;

    /** @var int */
    public $backoff = 30;

    public function __construct(public readonly string $connectionId) {}

    public function handle(MintlifyClient $client): void
    {
        $connection = MintlifyConnection::withoutGlobalScopes()->find($this->connectionId);

        if (! $connection || ! $connection->is_active) {
            return;
        }

        try {
            $articles = $client->fetchArticles($connection->site_url);
        } catch (\Throwable $exception) {
            Log::warning("Mintlify sync failed for connection [{$connection->id}]: {$exception->getMessage()}");
            throw $exception;
        }

        $syncedUrls = [];

        foreach ($articles as $article) {
            MintlifyArticle::withoutGlobalScopes()->updateOrCreate(
                [
                    'mintlify_connection_id' => $connection->id,
                    'url' => $article['url'],
                ],
                [
                    'team_id' => $connection->team_id,
                    'title' => $article['title'],
                    'content_excerpt' => $article['excerpt'],
                ],
            );
            $syncedUrls[] = $article['url'];
        }

        MintlifyArticle::withoutGlobalScopes()
            ->where('mintlify_connection_id', $connection->id)
            ->whereNotIn('url', $syncedUrls ?: ['__none__'])
            ->delete();

        $connection->timestamps = false;
        $connection->update(['last_synced_at' => now()]);
    }
}
