<?php

namespace App\Domain\HelpCenter\Console\Commands;

use App\Domain\HelpCenter\Jobs\SyncMintlifyDocsJob;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use Illuminate\Console\Command;

/**
 * Dispatches a sync job for every active Mintlify Help Center connection,
 * refreshing the locally cached article index used for reply suggestions.
 */
class SyncMintlifyDocsCommand extends Command
{
    /** @var string */
    protected $signature = 'inbxer:sync-mintlify-docs';

    /** @var string */
    protected $description = 'Sync every active team\'s Mintlify Help Center article index.';

    public function handle(): void
    {
        MintlifyConnection::withoutGlobalScopes()
            ->where('is_active', true)
            ->each(function (MintlifyConnection $connection) {
                SyncMintlifyDocsJob::dispatch($connection->id);
                $this->info("Queued Mintlify sync for connection [{$connection->id}].");
            });
    }
}
