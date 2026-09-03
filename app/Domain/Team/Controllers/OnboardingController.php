<?php

namespace App\Domain\Team\Controllers;

use App\Domain\Team\Actions\CreateTeam;
use App\Domain\Team\Requests\SaveTeamRequest;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * First-run onboarding step: a freshly registered user has no workspace
 * yet, so they're asked to name one before they can use the app.
 */
class OnboardingController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->teams()->exists()) {
            return to_route('threads.index');
        }

        return Inertia::render('onboarding/workspace', [
            'userName' => $request->user()->name,
        ]);
    }

    public function store(SaveTeamRequest $request, CreateTeam $createTeam): RedirectResponse
    {
        $user = $request->user();

        if ($user->teams()->exists()) {
            return to_route('threads.index');
        }

        $team = $createTeam->handle($user, $request->validated('name'), isPersonal: true);

        return redirect('/threads');
    }
}
