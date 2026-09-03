<?php

namespace App\Domain\Insights\Controllers;

use App\Domain\Insights\Services\InsightsMetricsService;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class InsightsController extends Controller
{
    public function __construct(private readonly InsightsMetricsService $metrics) {}

    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        return Inertia::render('insights/reporting', [
            'overview' => $this->metrics->overview($team, $this->since($request)),
            'timeframe' => $request->query('timeframe', 'past_month'),
        ]);
    }

    public function team(Request $request): Response
    {
        return $this->breakdownPage($request, 'assignee', 'Team');
    }

    public function companies(Request $request): Response
    {
        return $this->breakdownPage($request, 'company', 'Companies');
    }

    public function tenants(Request $request): Response
    {
        return $this->breakdownPage($request, 'tenant', 'Tenants');
    }

    public function tiers(Request $request): Response
    {
        return $this->breakdownPage($request, 'tier', 'Tiers');
    }

    public function labels(Request $request): Response
    {
        return $this->breakdownPage($request, 'label', 'Labels');
    }

    public function groups(Request $request): Response
    {
        return $this->breakdownPage($request, 'group', 'Groups');
    }

    public function channels(Request $request): Response
    {
        return $this->breakdownPage($request, 'channel', 'Channels');
    }

    public function priorities(Request $request): Response
    {
        return $this->breakdownPage($request, 'priority', 'Priorities');
    }

    public function topIssues(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $rows = Label::where('team_id', $team->id)
            ->withCount(['threads' => function ($query) use ($request) {
                $query->where('threads.created_at', '>=', $this->since($request));
            }])
            ->orderByDesc('threads_count')
            ->get(['id', 'name', 'color'])
            ->map(fn (Label $label) => [
                'label' => $label->name,
                'color' => $label->color,
                'volume' => $label->threads_count,
            ]);

        return Inertia::render('insights/top-issues', [
            'rows' => $rows,
        ]);
    }

    private function breakdownPage(Request $request, string $dimension, string $title): Response
    {
        $team = $this->currentTeam($request);

        return Inertia::render('insights/breakdown', [
            'title' => $title,
            'dimension' => $dimension,
            'rows' => $this->metrics->breakdown($team, $dimension, $this->since($request)),
            'timeframe' => $request->query('timeframe', 'past_month'),
        ]);
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }

    private function since(Request $request): Carbon
    {
        return match ($request->query('timeframe', 'past_month')) {
            'past_week' => Carbon::now()->subWeek(),
            'past_quarter' => Carbon::now()->subMonths(3),
            'all_time' => Carbon::now()->subYears(10),
            default => Carbon::now()->subMonth(),
        };
    }
}
