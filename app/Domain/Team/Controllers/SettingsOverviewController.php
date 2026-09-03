<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsOverviewController extends Controller
{
    public function index(Request $request): Response
    {
        $this->currentTeam($request);

        return Inertia::render('settings/overview');
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
