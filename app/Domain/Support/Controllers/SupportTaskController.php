<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Enums\TaskStatus;
use App\Domain\Support\Models\Task;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupportTaskController extends Controller
{
    /**
     * Display a listing of support tasks.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        // Fetch counts for the tabs (automatically scoped to team!)
        $myTasksCount = Task::where('assigned_to', $user->id)
            ->where('status', TaskStatus::Open)
            ->count();

        $allTasksCount = Task::where('status', TaskStatus::Open)
            ->count();

        $doneTasksCount = Task::where('status', TaskStatus::Done)
            ->count();

        // Get active tab, default to 'my_tasks'
        $tab = $request->query('tab', 'my_tasks');

        // Fetch list based on active tab
        $query = Task::with(['assignee', 'thread', 'tenant', 'company']);

        if ($tab === 'my_tasks') {
            $query->where('assigned_to', $user->id)->where('status', TaskStatus::Open);
        } elseif ($tab === 'all_tasks') {
            $query->where('status', TaskStatus::Open);
        } elseif ($tab === 'done') {
            $query->where('status', TaskStatus::Done);
        }

        $tasks = $query->orderBy('due_at', 'asc')->get();

        // Fetch options for the inline creator and detail side panel
        $teamMembers = $team->members()->select('users.id', 'users.name', 'users.email')->get();
        $companies = Company::orderBy('name')->get();
        $tenants = Tenant::orderBy('name')->get();
        $threads = Thread::whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
            ->orderBy('updated_at', 'desc')
            ->get();

        return Inertia::render('support/tasks', [
            'tasks' => $tasks,
            'tab' => $tab,
            'counts' => [
                'my_tasks' => $myTasksCount,
                'all_tasks' => $allTasksCount,
                'done' => $doneTasksCount,
            ],
            'teamMembers' => $teamMembers,
            'companies' => $companies,
            'tenants' => $tenants,
            'threads' => $threads,
        ]);
    }

    /**
     * Store a newly created support task.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('team_members', 'user_id')->where('team_id', $team->id),
            ],
            'thread_id' => [
                'nullable',
                Rule::exists('threads', 'id')->where('team_id', $team->id),
            ],
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'due_at' => 'nullable|date',
        ]);

        Task::create(array_merge($validated, [
            'team_id' => $team->id,
            'status' => TaskStatus::Open,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task created successfully.']);

        return redirect()->back();
    }

    /**
     * Update the specified support task.
     */
    public function update(Request $request, Task $task): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('team_members', 'user_id')->where('team_id', $team->id),
            ],
            'thread_id' => [
                'nullable',
                Rule::exists('threads', 'id')->where('team_id', $team->id),
            ],
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'company_id' => [
                'nullable',
                Rule::exists('companies', 'id')->where('team_id', $team->id),
            ],
            'due_at' => 'nullable|date',
        ]);

        // If status changes to done, set completed fields
        if (isset($validated['status']) && $validated['status'] === TaskStatus::Done->value && $task->status !== TaskStatus::Done) {
            $task->completed_at = Carbon::now();
            $task->completed_by = $user->id;
        } elseif (isset($validated['status']) && $validated['status'] === TaskStatus::Open->value) {
            $task->completed_at = null;
            $task->completed_by = null;
        }

        $task->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task updated successfully.']);

        return redirect()->back();
    }

    /**
     * Remove the specified support task from storage.
     */
    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task deleted successfully.']);

        return redirect()->back();
    }
}
