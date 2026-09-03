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

class AiSuggestedResponsesController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        return Inertia::render('ai/suggested-responses', [
            'suggestedResponsesEnabled' => $settings->suggested_responses_enabled,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'suggested_responses_enabled' => 'required|boolean',
        ]);

        $settings->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Suggested responses setting saved.']);

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
