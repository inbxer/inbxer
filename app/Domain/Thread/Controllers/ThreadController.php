<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class ThreadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        // Automatically scoped to team via BelongsToTeam global scope!
        $threads = Thread::with(['channel', 'tenant', 'assignee', 'tier', 'labels'])
            ->orderBy('updated_at', 'desc')
            ->paginate(50);

        return response()->json($threads);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'channel_id' => [
                'required',
                Rule::exists('channels', 'id')->where('team_id', $team->id),
            ],
            'tenant_id' => [
                'required',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'title' => 'required|string|max:255',
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'status' => ['nullable', Rule::enum(ThreadStatus::class)],
            'body' => 'required|string',
            'is_internal' => 'nullable|boolean',
        ]);

        // Create the thread (team_id is set automatically via TeamContext since we are inside API auth)
        $thread = Thread::create([
            'team_id' => $team->id,
            'channel_id' => $validated['channel_id'],
            'tenant_id' => $validated['tenant_id'],
            'title' => $validated['title'],
            'priority' => $validated['priority'] ?? ThreadPriority::Normal,
            'status' => $validated['status'] ?? ThreadStatus::NeedsFirstResponse,
        ]);

        // Create the initial timeline entry (message/note)
        $thread->timelineEntries()->create([
            'actor_type' => ActorType::Tenant,
            'actor_id' => $validated['tenant_id'],
            'entry_type' => ($validated['is_internal'] ?? false) ? TimelineEntryType::Note : TimelineEntryType::Message,
            'body' => $validated['body'],
            'is_internal' => $validated['is_internal'] ?? false,
        ]);

        return response()->json($thread->load('timelineEntries'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Thread $thread): JsonResponse
    {
        // Thread is already scoped via global team scope!
        return response()->json($thread->load(['channel', 'tenant', 'assignee', 'tier', 'labels', 'timelineEntries']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Thread $thread): JsonResponse
    {
        $team = app(TeamContext::class)->get();

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'status' => ['nullable', Rule::enum(ThreadStatus::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('team_members', 'user_id')->where('team_id', $team->id),
            ],
            'tier_id' => [
                'nullable',
                Rule::exists('tiers', 'id')->where('team_id', $team->id),
            ],
        ]);

        $oldStatus = $thread->status;
        $oldPriority = $thread->priority;
        $oldAssignee = $thread->assigned_to;

        $thread->update($validated);

        // Log timeline events for changes
        if (isset($validated['status']) && $validated['status'] !== $oldStatus->value) {
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::System,
                'entry_type' => TimelineEntryType::StatusChange,
                'metadata' => [
                    'from' => $oldStatus->value,
                    'to' => $validated['status'],
                ],
            ]);
        }

        if (isset($validated['priority']) && $validated['priority'] !== $oldPriority->value) {
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::System,
                'entry_type' => TimelineEntryType::PriorityChange,
                'metadata' => [
                    'from' => $oldPriority->value,
                    'to' => $validated['priority'],
                ],
            ]);
        }

        if (array_key_exists('assigned_to', $validated) && $validated['assigned_to'] !== $oldAssignee) {
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::System,
                'entry_type' => TimelineEntryType::Assignment,
                'metadata' => [
                    'from' => $oldAssignee,
                    'to' => $validated['assigned_to'],
                ],
            ]);
        }

        return response()->json($thread);
    }

    /**
     * Add a message or note to the thread timeline.
     */
    public function addTimelineEntry(Request $request, Thread $thread): JsonResponse
    {
        $validated = $request->validate([
            'actor_type' => ['required', Rule::enum(ActorType::class)],
            'actor_id' => 'required|string', // ULID of tenant or ID of user
            'entry_type' => ['required', Rule::enum(TimelineEntryType::class)],
            'body' => 'required|string',
            'is_internal' => 'nullable|boolean',
        ]);

        $entry = $thread->timelineEntries()->create($validated);

        // Update the thread's updated_at timestamp
        $thread->touch();

        return response()->json($entry, 201);
    }
}
