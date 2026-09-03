<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Team-wide behavior toggles for assignment, away mode, status transitions,
 * and saved view permissions — distinct from the workflow automation engine.
 */
class TeamWorkflowSettingsController extends Controller
{
    private const DEFAULTS = [
        'sticky_assignment' => [
            'on_snooze' => 'stay_assigned',
            'on_done' => 'stay_assigned',
        ],
        'auto_assignment' => [
            'assign_on_reply_from_slack_teams' => false,
        ],
        'away_mode' => [
            'unassign_on_away' => 'immediately',
            'outside_hours_mode' => 'offline_mode',
        ],
        'status' => [
            'after_reply_outside' => 'waiting_for_customer',
            'move_waiting_to_done_after' => 'never',
        ],
        'saved_views' => [
            'manage_permission' => 'everyone',
        ],
    ];

    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        $settings = array_replace_recursive(self::DEFAULTS, $team->settings['workflow'] ?? []);

        return Inertia::render('settings/workflow-behavior', [
            'settings' => $settings,
            'statusOptions' => array_map(
                fn (ThreadStatus $s) => ['value' => $s->value, 'label' => $s->label()],
                ThreadStatus::cases(),
            ),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        $validated = $request->validate([
            'sticky_assignment.on_snooze' => 'required|string|in:stay_assigned,unassign',
            'sticky_assignment.on_done' => 'required|string|in:stay_assigned,unassign',
            'auto_assignment.assign_on_reply_from_slack_teams' => 'boolean',
            'away_mode.unassign_on_away' => 'required|string|in:immediately,never',
            'away_mode.outside_hours_mode' => 'required|string|in:offline_mode,away_mode',
            'status.after_reply_outside' => 'required|string',
            'status.move_waiting_to_done_after' => 'required|string|in:never,1h,4h,24h,3d',
            'saved_views.manage_permission' => 'required|string|in:everyone,admins',
        ]);

        $settings = $team->settings ?? [];
        $settings['workflow'] = $validated;
        $team->update(['settings' => $settings]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workflow settings saved.']);

        return redirect()->back();
    }
}
