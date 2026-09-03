<?php

namespace App\Domain\Ai\Controllers;

use App\Ai\Agents\ToneRulesAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AiToneController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        return Inertia::render('ai/configuration/tone', [
            'toneRules' => $settings->tone_rules ?? [
                'empathy' => '',
                'language' => '',
                'formality' => '',
                'personality' => '',
                'warmth' => '',
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'tone_rules' => 'required|array',
            'tone_rules.empathy' => 'nullable|string|max:1000',
            'tone_rules.language' => 'nullable|string|max:1000',
            'tone_rules.formality' => 'nullable|string|max:1000',
            'tone_rules.personality' => 'nullable|string|max:1000',
            'tone_rules.warmth' => 'nullable|string|max:1000',
        ]);

        $settings->update(['tone_rules' => $validated['tone_rules']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tone rules saved.']);

        return redirect()->back();
    }

    public function generate(Request $request): JsonResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'description' => 'nullable|string|max:5000',
        ]);

        $agent = new ToneRulesAgent(
            teamName: $team->name,
            customInstructions: filled($validated['description'] ?? null)
                ? $validated['description']
                : $settings->custom_instructions,
        );

        try {
            $response = $agent->prompt('Generate the tone-of-voice profile.');
        } catch (Throwable) {
            return response()->json(['error' => 'Could not generate tone rules right now. Please try again.'], 502);
        }

        return response()->json([
            'tone_rules' => [
                'empathy' => (string) ($response['empathy'] ?? ''),
                'language' => (string) ($response['language'] ?? ''),
                'formality' => (string) ($response['formality'] ?? ''),
                'personality' => (string) ($response['personality'] ?? ''),
                'warmth' => (string) ($response['warmth'] ?? ''),
            ],
        ]);
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
