<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\UserFavorite;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SupportFavoriteController extends Controller
{
    /**
     * Toggle starring a filter/page favorite for the current user and team.
     */
    public function toggle(Request $request): RedirectResponse
    {
        $request->validate([
            'filter_key' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'url' => ['required', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $existing = UserFavorite::where('user_id', $user->id)
            ->where('team_id', $team->id)
            ->where('filter_key', $request->filter_key)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            UserFavorite::create([
                'user_id' => $user->id,
                'team_id' => $team->id,
                'filter_key' => $request->filter_key,
                'title' => $request->title,
                'url' => $request->url,
            ]);
        }

        return back();
    }
}
