<?php

namespace App\Domain\Sla\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessHoursController extends Controller
{
    private const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    /**
     * Display the Business hours settings page.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        $businessHours = BusinessHours::where('team_id', $team->id)
            ->where('is_default', true)
            ->first();

        return Inertia::render('settings/business-hours', [
            'businessHours' => $businessHours ? [
                'id' => $businessHours->id,
                'name' => $businessHours->name,
                'timezone' => $businessHours->timezone,
                'schedule' => $businessHours->schedule,
            ] : null,
            'days' => self::DAYS,
            'timezones' => \DateTimeZone::listIdentifiers(),
        ]);
    }

    /**
     * Create or update the team's default business hours.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'timezone' => 'required|string|max:100',
            'schedule' => 'required|array',
            'schedule.*.start' => 'required|string',
            'schedule.*.end' => 'required|string',
        ]);

        foreach (array_keys($validated['schedule']) as $day) {
            if (! in_array($day, self::DAYS, true)) {
                abort(422, 'Invalid day key.');
            }
        }

        BusinessHours::updateOrCreate(
            ['team_id' => $team->id, 'is_default' => true],
            [
                'name' => 'Default business hours',
                'timezone' => $validated['timezone'],
                'schedule' => $validated['schedule'],
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Business hours saved.']);

        return redirect()->back();
    }
}
