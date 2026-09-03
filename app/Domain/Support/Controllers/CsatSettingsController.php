<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\CsatSurvey;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CsatSettingsController extends Controller
{
    private const DEFAULTS = [
        'enabled' => false,
        'message' => 'How would you rate the support you just received?',
        'delay_minutes' => 0,
    ];

    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $settings = array_replace(self::DEFAULTS, $team->settings['csat'] ?? []);

        $recent = CsatSurvey::where('team_id', $team->id)
            ->whereNotNull('responded_at')
            ->with('tenant:id,name')
            ->orderByDesc('responded_at')
            ->limit(20)
            ->get(['id', 'tenant_id', 'rating', 'comment', 'responded_at']);

        $totalResponded = CsatSurvey::where('team_id', $team->id)->whereNotNull('responded_at')->count();
        $totalPositive = CsatSurvey::where('team_id', $team->id)->whereNotNull('responded_at')->where('rating', '>=', 4)->count();

        return Inertia::render('settings/csat', [
            'settings' => $settings,
            'stats' => [
                'total_responded' => $totalResponded,
                'positive_percentage' => $totalResponded > 0 ? round(($totalPositive / $totalResponded) * 100, 1) : null,
            ],
            'recentResponses' => $recent->map(fn (CsatSurvey $s) => [
                'id' => $s->id,
                'tenant_name' => $s->tenant?->name,
                'rating' => $s->rating,
                'comment' => $s->comment,
                'responded_at' => $s->responded_at?->toIso8601String(),
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'enabled' => 'boolean',
            'message' => 'required|string|max:500',
            'delay_minutes' => 'required|integer|min:0|max:10080',
        ]);

        $settings = $team->settings ?? [];
        $settings['csat'] = $validated;
        $team->update(['settings' => $settings]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CSAT settings saved.']);

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
