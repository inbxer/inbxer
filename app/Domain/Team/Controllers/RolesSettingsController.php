<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RolesSettingsController extends Controller
{
    /**
     * Roles shown on this page — every real, assignable role plus Owner.
     * The legacy Member role is intentionally excluded: it's kept only for
     * memberships created before Support/Viewer existed and is no longer
     * offered anywhere in the UI.
     */
    private const VISIBLE_ROLES = [
        TeamRole::Owner,
        TeamRole::Admin,
        TeamRole::Support,
        TeamRole::Viewer,
    ];

    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        return Inertia::render('settings/roles', [
            'roles' => array_map(fn (TeamRole $role) => [
                'value' => $role->value,
                'label' => $role->label(),
                'description' => $role->description(),
                'permissions' => array_map(
                    fn ($p) => $p->value,
                    $role->permissions(),
                ),
            ], self::VISIBLE_ROLES),
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
