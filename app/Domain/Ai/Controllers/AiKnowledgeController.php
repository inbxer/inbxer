<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\HelpCenter\Enums\KnowledgeSourceKind;
use App\Domain\HelpCenter\Jobs\SyncKnowledgeSourceJob;
use App\Domain\HelpCenter\Models\KnowledgeSource;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiKnowledgeController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $connection = MintlifyConnection::where('team_id', $team->id)->first();

        $indexed = 0;
        $pending = 0;
        $failed = 0;

        if ($connection) {
            $indexed = MintlifyArticle::where('mintlify_connection_id', $connection->id)->count();
            $pending = $connection->is_active && $connection->last_synced_at === null ? 1 : 0;
        }

        $currentUserId = $request->user()?->id;

        $sources = KnowledgeSource::with('creator')->where('team_id', $team->id)->get();

        $sourceSummaries = $sources->map(function (KnowledgeSource $source) use ($currentUserId) {
            $articlesCount = $source->articles()->count();
            $isPending = $source->is_active && $source->last_synced_at === null && $source->last_sync_error === null;
            $isFailed = $source->last_sync_error !== null;

            return [
                'id' => $source->id,
                'source_url' => $source->source_url,
                'kind' => $source->kind->value,
                'is_active' => $source->is_active,
                'status' => $isFailed ? 'failed' : ($isPending ? 'pending' : 'indexed'),
                'created_at' => $source->created_at?->toIso8601String(),
                'added_by_label' => match (true) {
                    $source->created_by === null => null,
                    $source->created_by === $currentUserId => 'you',
                    default => $source->creator?->name,
                },
                'last_synced_at' => $source->last_synced_at?->toIso8601String(),
                'last_sync_error' => $source->last_sync_error,
                'articles_count' => $articlesCount,
                'indexed_count' => $articlesCount,
                'pending_count' => $isPending ? 1 : 0,
                'failed_count' => $isFailed ? 1 : 0,
            ];
        });

        $sitemaps = $sourceSummaries->where('kind', KnowledgeSourceKind::Sitemap->value)->values();
        $urls = $sourceSummaries->where('kind', KnowledgeSourceKind::Url->value)->values();

        $indexed += $sourceSummaries->sum('indexed_count');
        $pending += $sourceSummaries->sum('pending_count');
        $failed += $sourceSummaries->sum('failed_count');

        return Inertia::render('ai/knowledge-sources', [
            'helpCenters' => $connection ? [[
                'id' => $connection->id,
                'site_url' => $connection->site_url,
                'is_active' => $connection->is_active,
                'last_synced_at' => $connection->last_synced_at?->toIso8601String(),
                'articles_count' => $indexed,
                'indexed_count' => $indexed,
                'pending_count' => $pending,
                'failed_count' => $failed,
            ]] : [],
            'sitemaps' => $sitemaps,
            'urls' => $urls,
            'mintlify_settings_url' => route('settings.integrations.mintlify.index'),
        ]);
    }

    public function storeSitemap(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'source_url' => 'required|url|max:2048',
        ]);

        $source = KnowledgeSource::create([
            'team_id' => $team->id,
            'created_by' => $request->user()?->id,
            'kind' => KnowledgeSourceKind::Sitemap,
            'source_url' => $validated['source_url'],
            'is_active' => true,
        ]);

        SyncKnowledgeSourceJob::dispatch($source->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sitemap added — indexing has started.']);

        return redirect()->back();
    }

    public function storeUrl(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'source_url' => 'required|url|max:2048',
        ]);

        $source = KnowledgeSource::create([
            'team_id' => $team->id,
            'created_by' => $request->user()?->id,
            'kind' => KnowledgeSourceKind::Url,
            'source_url' => $validated['source_url'],
            'is_active' => true,
        ]);

        SyncKnowledgeSourceJob::dispatch($source->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'URL added — indexing has started.']);

        return redirect()->back();
    }

    public function destroySource(Request $request, KnowledgeSource $source): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($source->team_id === $team->id, 403);

        $source->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Knowledge source removed.']);

        return redirect()->back();
    }

    public function resyncSource(Request $request, KnowledgeSource $source): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($source->team_id === $team->id, 403);

        SyncKnowledgeSourceJob::dispatch($source->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resync started.']);

        return redirect()->back();
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
