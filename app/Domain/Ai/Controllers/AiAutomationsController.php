<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiAutomationsController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        return Inertia::render('ai/automations', [
            'settings' => [
                'auto_labeling_enabled' => $settings->auto_labeling_enabled,
                'urgency_detection_enabled' => $settings->urgency_detection_enabled,
                'thread_titles_enabled' => $settings->thread_titles_enabled,
                'thread_catchups_enabled' => $settings->thread_catchups_enabled,
                'similar_threads_enabled' => $settings->similar_threads_enabled,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'auto_labeling_enabled' => 'sometimes|boolean',
            'urgency_detection_enabled' => 'sometimes|boolean',
            'thread_titles_enabled' => 'sometimes|boolean',
            'thread_catchups_enabled' => 'sometimes|boolean',
            'similar_threads_enabled' => 'sometimes|boolean',
        ]);

        $settings->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Automation settings saved.']);

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
