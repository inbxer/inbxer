<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Workspace-level general settings: logo, public/internal name, and the
 * list of email domains used to auto-recognize teammates who reply from
 * outside the app (e.g. via Slack/Teams) without a formal invite.
 */
class GeneralSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        return Inertia::render('settings/general', [
            'team' => [
                'id' => $team->id,
                'slug' => $team->slug,
                'name' => $team->name,
                'internal_name' => $team->internal_name,
                'logo_url' => $team->logoUrl(),
                'domains' => $team->settings['domains'] ?? [],
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        Gate::authorize('update', $team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'internal_name' => 'nullable|string|max:255',
            'domains' => 'nullable|array',
            'domains.*' => 'string|max:255',
        ]);

        DB::transaction(function () use ($team, $validated) {
            $team = Team::whereKey($team->id)->lockForUpdate()->firstOrFail();

            $settings = $team->settings ?? [];
            $settings['domains'] = array_values(array_unique(array_filter($validated['domains'] ?? [])));

            $team->update([
                'name' => $validated['name'],
                'internal_name' => $validated['internal_name'] ?? null,
                'settings' => $settings,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workspace settings saved.']);

        return redirect()->back();
    }

    public function uploadLogo(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        Gate::authorize('update', $team);

        $validated = $request->validate([
            'logo' => 'required|image|max:10240',
        ]);

        $team->addMedia($validated['logo'])->toMediaCollection('logo');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Logo updated.']);

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
