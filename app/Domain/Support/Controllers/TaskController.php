<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Enums\TaskStatus;
use App\Domain\Support\Models\Task;
use App\Domain\Thread\Enums\ThreadPriority;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $tasks = Task::with(['assignee', 'thread', 'tenant', 'company'])
            ->orderBy('due_at', 'asc')
            ->paginate(50);

        return response()->json($tasks);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $team = app(TeamContext::class)->get();

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

        $task = Task::create(array_merge($validated, [
            'team_id' => $team->id,
            'status' => TaskStatus::Open,
        ]));

        return response()->json($task, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Task $task): JsonResponse
    {
        return response()->json($task->load(['assignee', 'thread', 'tenant', 'company', 'completedBy']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('team_members', 'user_id')->where('team_id', $team->id),
            ],
            'due_at' => 'nullable|date',
        ]);

        // If status changed to Done, record completion details
        if (isset($validated['status']) && $validated['status'] === TaskStatus::Done->value && ! $task->isCompleted()) {
            $validated['completed_at'] = now();
            // Assign completed_by from the authenticated user context if available
            // Since this is authenticated via API key, it represents a machine key, or if there's a user associated with the request (like via a web session) we check auth()->id().
            $validated['completed_by'] = auth()->id();
        }

        $task->update($validated);

        return response()->json($task);
    }
}
