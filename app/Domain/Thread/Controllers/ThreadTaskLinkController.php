<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Enums\TaskStatus;
use App\Domain\Support\Models\Task;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ThreadTaskLinkController extends Controller
{
    /**
     * Link or create a task for the thread.
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
            'task_id' => 'nullable|exists:tasks,id',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $taskTitle = 'Task';

        if (! empty($validated['task_id'])) {
            $task = Task::where('team_id', $team->id)->where('id', $validated['task_id'])->first();
            if ($task) {
                $task->update(['thread_id' => $thread->id]);
                $taskTitle = $task->title;
            }
        } elseif (! empty($validated['title'])) {
            $taskTitle = $validated['title'];
            Task::create([
                'team_id' => $team->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => TaskStatus::Open,
                'priority' => ThreadPriority::Normal,
                'thread_id' => $thread->id,
                'tenant_id' => $thread->tenant_id,
                'company_id' => $thread->tenant?->company_id,
                'assigned_to' => $validated['assigned_to'] ?? $user->id,
            ]);
        }

        $thread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => TimelineEntryType::Note,
            'is_internal' => false,
            'body' => "You linked {$taskTitle}",
            'metadata' => ['action' => 'link_task', 'title' => $taskTitle],
        ]);

        $thread->touch();

        return redirect()->back();
    }
}
