<?php

namespace App\Domain\HelpCenter\Console\Commands;

use App\Domain\HelpCenter\Jobs\SyncKnowledgeSourceJob;
use App\Domain\HelpCenter\Models\KnowledgeSource;
use Illuminate\Console\Command;

/**
 * Dispatches a sync job for every active generic KnowledgeSource (sitemaps
 * and one-off URLs), refreshing the locally cached article index used for
 * reply suggestions.
 */
class SyncKnowledgeSourcesCommand extends Command
{
    /** @var string */
    protected $signature = 'inbxer:sync-knowledge-sources';

    /** @var string */
    protected $description = 'Sync every active team\'s generic knowledge sources (sitemaps and URLs).';

    public function handle(): void
    {
        KnowledgeSource::withoutGlobalScopes()
            ->where('is_active', true)
            ->each(function (KnowledgeSource $source) {
                SyncKnowledgeSourceJob::dispatch($source->id);
                $this->info("Queued knowledge source sync for source [{$source->id}].");
            });
    }
}
