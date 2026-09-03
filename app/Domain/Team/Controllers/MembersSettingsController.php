<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Membership;
use App\Domain\Team\Models\Team;
use App\Domain\Team\Models\TeamInvitation;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MembersSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $activeMembers = $team->members()->get()->map(fn ($member) => [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'role' => $member->pivot->role->value,
            'role_label' => $member->pivot->role->label(),
        ]);

        $pendingInvitations = $team->invitations()
            ->whereNull('accepted_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'role_label' => $invitation->role->label(),
                'created_at' => $invitation->created_at?->toIso8601String(),
            ]);

        // "Other" = invitations that were sent but never accepted before
        // expiring — the closest honest match to a distinct third bucket,
        // since there's no persisted "declined" state on memberships.
        $expiredInvitations = $team->invitations()
            ->whereNull('accepted_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'role_label' => $invitation->role->label(),
                'expired_at' => $invitation->expires_at?->toIso8601String(),
            ]);

        $roleCounts = Membership::where('team_id', $team->id)->get()->countBy(fn (Membership $m) => $m->role->value);

        return Inertia::render('settings/members', [
            'stats' => [
                'owners_and_admins' => $roleCounts->get(TeamRole::Owner->value, 0)
                    + $roleCounts->get(TeamRole::Admin->value, 0),
                'support' => $roleCounts->get(TeamRole::Support->value, 0)
                    + $roleCounts->get(TeamRole::Member->value, 0),
                'viewers' => $roleCounts->get(TeamRole::Viewer->value, 0),
            ],
            'activeMembers' => $activeMembers,
            'invitedMembers' => $pendingInvitations,
            'otherMembers' => $expiredInvitations,
            'availableRoles' => TeamRole::assignable(),
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
