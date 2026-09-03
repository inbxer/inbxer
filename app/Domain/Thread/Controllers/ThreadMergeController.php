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

class ThreadMergeController extends Controller
{
    /**
     * Merge the thread into a parent thread.
     */
    public function __invoke(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'parent_thread_id' => 'required|exists:threads,id',
        ]);

        $parentThread = Thread::where('team_id', $team->id)->where('id', $validated['parent_thread_id'])->firstOrFail();

        // Move timeline entries and set child thread status to Ignored
        $thread->timelineEntries()->update(['thread_id' => $parentThread->id]);
        $thread->update(['status' => ThreadStatus::Ignored]);

        $parentThread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => TimelineEntryType::Note,
            'is_internal' => false,
            'body' => "Merged thread T-{$thread->sequence_number} into T-{$parentThread->sequence_number}",
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Threads merged successfully.']);

        return redirect()->route('threads.index', ['thread' => $parentThread->id]);
    }
}
