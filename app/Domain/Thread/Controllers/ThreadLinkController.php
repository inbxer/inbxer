<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ThreadLinkController extends Controller
{
    /**
     * Link another thread to the current thread.
     */
    public function store(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'target_thread_id' => 'required|exists:threads,id',
        ]);

        $targetThread = Thread::where('team_id', $team->id)->where('id', $validated['target_thread_id'])->firstOrFail();

        $thread->relatedThreads()->syncWithoutDetaching([$targetThread->id]);
        $targetThread->relatedThreads()->syncWithoutDetaching([$thread->id]);

        $threadTitleStr = "T-{$targetThread->sequence_number} {$targetThread->title}";

        $thread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => TimelineEntryType::Note,
            'is_internal' => false,
            'body' => "You linked {$threadTitleStr}",
            'metadata' => ['action' => 'link_thread', 'title' => $threadTitleStr],
        ]);

        $thread->touch();

        return redirect()->back();
    }

    /**
     * Unlink a thread.
     */
    public function destroy(Request $request, Thread $thread, Thread $relatedThread): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $thread->relatedThreads()->detach($relatedThread->id);
        $relatedThread->relatedThreads()->detach($thread->id);

        $thread->touch();

        return redirect()->back();
    }
}
