<?php

namespace App\Domain\HelpCenter\Jobs;

use App\Domain\HelpCenter\Enums\KnowledgeSourceKind;
use App\Domain\HelpCenter\Events\KnowledgeSourceSyncUpdated;
use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\HelpCenter\Models\KnowledgeSource;
use App\Domain\HelpCenter\Services\SitemapParser;
use App\Domain\HelpCenter\Services\WebPageFetcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncKnowledgeSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int */
    public $tries = 3;

    /** @var int */
    public $backoff = 30;

    public function __construct(public readonly string $knowledgeSourceId) {}

    public function handle(SitemapParser $sitemapParser, WebPageFetcher $pageFetcher): void
    {
        $source = KnowledgeSource::withoutGlobalScopes()->find($this->knowledgeSourceId);

        if (! $source || ! $source->is_active) {
            return;
        }

        try {
            $pageUrls = $source->kind === KnowledgeSourceKind::Sitemap
                ? $sitemapParser->parse($source->source_url)
                : [$source->source_url];
        } catch (Throwable $exception) {
            Log::warning("Knowledge source sync failed for source [{$source->id}]: {$exception->getMessage()}");
            $this->markSynced($source, $exception->getMessage());
            throw $exception;
        }

        $syncedUrls = [];
        $lastError = null;

        foreach ($pageUrls as $pageUrl) {
            try {
                $page = $pageFetcher->fetch($pageUrl);
            } catch (Throwable $exception) {
                $lastError = $exception->getMessage();
                Log::warning("Failed to fetch page [{$pageUrl}] for knowledge source [{$source->id}]: {$exception->getMessage()}");

                continue;
            }

            KnowledgeArticle::withoutGlobalScopes()->updateOrCreate(
                [
                    'knowledge_source_id' => $source->id,
                    'url' => $pageUrl,
                ],
                [
                    'team_id' => $source->team_id,
                    'title' => $page['title'],
                    'content_excerpt' => $page['excerpt'],
                ],
            );
            $syncedUrls[] = $pageUrl;
        }

        KnowledgeArticle::withoutGlobalScopes()
            ->where('knowledge_source_id', $source->id)
            ->whereNotIn('url', $syncedUrls ?: ['__none__'])
            ->delete();

        $this->markSynced($source, $syncedUrls === [] ? $lastError : null);
    }

    private function markSynced(KnowledgeSource $source, ?string $error): void
    {
        $source->timestamps = false;
        $source->update([
            'last_synced_at' => now(),
            'last_sync_error' => $error,
        ]);

        KnowledgeSourceSyncUpdated::dispatch($source);
    }
}
