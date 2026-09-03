<?php

namespace App\Domain\HelpCenter\Controllers;

use App\Domain\HelpCenter\Jobs\SyncMintlifyDocsJob;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\HelpCenter\Services\MintlifyClient;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SettingsMintlifyController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $connection = MintlifyConnection::where('team_id', $team->id)->first();

        return Inertia::render('settings/integrations/mintlify', [
            'connection' => $connection ? [
                'id' => $connection->id,
                'site_url' => $connection->site_url,
                'is_active' => $connection->is_active,
                'last_synced_at' => $connection->last_synced_at?->toIso8601String(),
                'articles_count' => $connection->articles()->count(),
            ] : null,
        ]);
    }

    public function store(Request $request, MintlifyClient $client): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'site_url' => 'required|url|max:255',
        ]);

        $this->assertReachable($client, $validated['site_url']);

        $connection = MintlifyConnection::updateOrCreate(
            ['team_id' => $team->id],
            [
                'site_url' => rtrim($validated['site_url'], '/'),
                'is_active' => true,
            ],
        );

        SyncMintlifyDocsJob::dispatch($connection->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mintlify Help Center connected. Syncing articles now.']);

        return redirect()->back();
    }

    public function update(Request $request, MintlifyConnection $connection, MintlifyClient $client): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($connection->team_id === $team->id, 404);

        $validated = $request->validate([
            'site_url' => 'required|url|max:255',
            'is_active' => 'boolean',
        ]);

        if (rtrim($validated['site_url'], '/') !== $connection->site_url) {
            $this->assertReachable($client, $validated['site_url']);
        }

        $connection->update([
            'site_url' => rtrim($validated['site_url'], '/'),
            'is_active' => $validated['is_active'] ?? $connection->is_active,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mintlify connection updated.']);

        return redirect()->back();
    }

    public function syncNow(Request $request, MintlifyConnection $connection): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($connection->team_id === $team->id, 404);

        SyncMintlifyDocsJob::dispatch($connection->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sync started.']);

        return redirect()->back();
    }

    public function destroy(Request $request, MintlifyConnection $connection): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($connection->team_id === $team->id, 404);

        $connection->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mintlify connection removed.']);

        return redirect()->back();
    }

    private function assertReachable(MintlifyClient $client, string $siteUrl): void
    {
        try {
            if (! $client->testConnection($siteUrl)) {
                throw ValidationException::withMessages(['site_url' => 'Could not find any articles at this site\'s llms.txt index.']);
            }
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable) {
            throw ValidationException::withMessages(['site_url' => 'Could not reach this Mintlify site. Check the URL and try again.']);
        }
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
