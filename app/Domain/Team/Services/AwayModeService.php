<?php

namespace App\Domain\Team\Services;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;

/**
 * Applies a team's away-mode settings when an agent's presence changes,
 * whether toggled manually or synced automatically from business hours.
 */
class AwayModeService
{
    /**
     * Mark a user away for a team and unassign their threads if configured.
     */
    public function markAway(User $user, Team $team, bool $auto = false): void
    {
        $user->update([
            'is_away' => true,
            'away_at' => now(),
            'is_away_auto' => $auto,
        ]);

        app(TeamContext::class)->set($team);

        $behavior = $team->settings['workflow']['away_mode']['unassign_on_away'] ?? 'immediately';

        if ($behavior !== 'immediately') {
            return;
        }

        Thread::where('team_id', $team->id)
            ->where('assigned_to', $user->id)
            ->where('status', '!=', ThreadStatus::Done)
            ->update(['assigned_to' => null]);
    }

    /**
     * Mark a user available again.
     */
    public function markAvailable(User $user): void
    {
        $user->update([
            'is_away' => false,
            'away_at' => null,
            'is_away_auto' => false,
        ]);
    }
}
