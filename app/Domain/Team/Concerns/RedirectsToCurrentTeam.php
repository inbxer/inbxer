<?php

namespace App\Domain\Team\Concerns;

use Illuminate\Http\Request;

trait RedirectsToCurrentTeam
{
    /**
     * Resolve the path to redirect to after auth: straight to onboarding if
     * the user has no workspace yet, otherwise the given path as-is (team
     * context now comes from the session, not the URL).
     */
    protected function redirectPathForCurrentTeam(Request $request, string $redirect): string
    {
        $user = $request->user();

        if (! $user || ! $user->teams()->exists()) {
            return route('onboarding.workspace');
        }

        return $redirect;
    }
}
