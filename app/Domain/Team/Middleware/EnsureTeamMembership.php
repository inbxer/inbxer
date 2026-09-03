<?php

namespace App\Domain\Team\Middleware;

use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeamMembership
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $minimumRole = null): Response
    {
        $user = $request->user();
        $team = $this->team($request, $user);

        abort_if(! $user || ! $team || ! $user->belongsToTeam($team), 403);

        $this->ensureTeamMemberHasRequiredRole($user, $team, $minimumRole);

        return $next($request);
    }

    /**
     * Ensure the given user has at least the given role, if applicable.
     */
    protected function ensureTeamMemberHasRequiredRole(User $user, Team $team, ?string $minimumRole): void
    {
        if ($minimumRole === null) {
            return;
        }

        $role = $user->teamRole($team);

        $requiredRole = TeamRole::tryFrom($minimumRole);

        abort_if(
            $requiredRole === null ||
            $role === null ||
            ! $role->isAtLeast($requiredRole),
            403,
        );
    }

    /**
     * Get the team associated with the request: an explicit {team} route
     * segment when present (e.g. managing/switching a specific team from
     * settings/teams/{team}/...), otherwise the user's current session team.
     */
    protected function team(Request $request, ?User $user): ?Team
    {
        $team = $request->route('team');

        if (is_string($team)) {
            $team = Team::where('slug', $team)->first();
        }

        return $team ?? $user?->currentTeam;
    }
}
