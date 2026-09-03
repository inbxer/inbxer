<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ThreadLockController extends Controller
{
    /**
     * Lock the thread.
     */
    public function __invoke(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $thread->update(['status' => ThreadStatus::Ignored]);

        $thread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => TimelineEntryType::Note,
            'is_internal' => false,
            'body' => 'Locked thread.',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thread locked successfully.']);

        return redirect()->back();
    }
}
