<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Team\Models\Team;
use App\Domain\Team\Services\AwayModeService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Lets an agent manually toggle their away status. When enabled, and the
 * current team's away-mode setting requires it, their assigned threads are unassigned.
 */
class AwayStatusController extends Controller
{
    public function update(Request $request, AwayModeService $awayMode): RedirectResponse
    {
        $validated = $request->validate(['is_away' => 'required|boolean']);

        $user = $request->user();
        $team = $user?->currentTeam;

        abort_unless($team instanceof Team, 403);

        if ($validated['is_away']) {
            $awayMode->markAway($user, $team, auto: false);
        } else {
            $awayMode->markAvailable($user);
        }

        return redirect()->back();
    }
}
