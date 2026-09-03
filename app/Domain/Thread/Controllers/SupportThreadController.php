<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\CustomField\Models\CustomFieldDefinition;
use App\Domain\CustomField\Models\CustomFieldValue;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\Enums\EntityType;
use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\Task;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Services\ThreadListingFilter;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Core thread listing/CRUD. Other thread actions (reply, timeline, labels, tasks,
 * linking, lock, merge, custom fields) live in their own single-purpose controllers
 * alongside this one in App\Domain\Thread\Controllers.
 */
class SupportThreadController extends Controller
{
    /**
     * Display a listing of support threads, filtered by queue or classification.
     */
    public function index(Request $request, ThreadListingFilter $listingFilter, ?string $label = null, ?string $tier = null, ?string $channel = null): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $filter = $listingFilter->resolve($request);

        $query = Thread::with(['channel', 'tenant.company', 'tenant.tier', 'assignee', 'tier', 'labels', 'tasks']);
        $listingFilter->apply($query, $filter, $user->id);

        $threads = $query->orderBy('updated_at', 'desc')->get();

        // Selected thread details if specified or default to first
        $selectedThread = null;
        $recentThreads = [];
        $customFields = [];
        $definitions = [];

        $pendingAiDraft = null;

        $selectedThreadId = $request->query('thread');
        if ($selectedThreadId) {
            $selectedThread = Thread::with(['channel', 'tenant.company.tier', 'tenant.company.owner', 'tenant.groups', 'assignee', 'tier', 'labels', 'timelineEntries.media', 'tasks', 'relatedThreads'])
                ->where('id', $selectedThreadId)
                ->first();

            if ($selectedThread) {
                $log = AiActivityLogEntry::where('thread_id', $selectedThread->id)
                    ->where('status', AiActivityStatus::PendingReview)
                    ->latest('created_at')
                    ->first();

                if ($log) {
                    $pendingAiDraft = [
                        'id' => $log->id,
                        'generated_reply' => $log->generated_reply,
                        'matched_articles' => $log->matched_articles ?? [],
                        'created_at' => $log->created_at?->toIso8601String(),
                    ];
                }
            }
        }

        if ($selectedThread) {
            if ($selectedThread->tenant_id) {
                $recentThreads = Thread::where('tenant_id', $selectedThread->tenant_id)
                    ->where('id', '!=', $selectedThread->id)
                    ->latest('updated_at')
                    ->take(5)
                    ->get();
            }

            // Fetch custom fields values & definitions for this thread context
            $definitions = CustomFieldDefinition::where('entity_type', EntityType::Thread)->get();
            $customFields = CustomFieldValue::where('entity_type', EntityType::Thread)
                ->where('entity_id', $selectedThread->id)
                ->get();
        }

        // Fetch team members list for assignments
        $teamMembers = $team->members()->select('users.id', 'users.name', 'users.email')->get();
        $availableLabels = Label::all();
        $availableTiers = Tier::with('slaPolicies')->get()->map(fn (Tier $tier) => [
            ...$tier->toArray(),
            'sla_first_response_minutes' => $tier->slaPolicies
                ->where('type', 'first_response')->where('is_active', true)
                ->sortBy('minutes')->first()?->minutes,
            'sla_next_response_minutes' => $tier->slaPolicies
                ->where('type', 'next_response')->where('is_active', true)
                ->sortBy('minutes')->first()?->minutes,
        ]);
        $availableTasks = Task::where('team_id', $team->id)->whereNull('thread_id')->get();
        $availableCompanies = Company::where('team_id', $team->id)->orderBy('name')->get();
        $availableGroups = CustomerGroup::where('team_id', $team->id)->orderBy('name')->get();
        $availableTenants = Tenant::where('team_id', $team->id)->orderBy('name')->get();

        return Inertia::render('support/threads', [
            'threads' => $threads,
            'selectedThread' => $selectedThread,
            'pendingAiDraft' => $pendingAiDraft,
            'recentThreads' => $recentThreads,
            'filter' => $filter,
            'teamMembers' => $teamMembers,
            'availableLabels' => $availableLabels,
            'availableTiers' => $availableTiers,
            'availableTasks' => $availableTasks,
            'availableCompanies' => $availableCompanies,
            'availableGroups' => $availableGroups,
            'availableTenants' => $availableTenants,
            'customFields' => $customFields,
            'definitions' => $definitions,
        ]);
    }

    /**
     * Create a new support thread and immediately redirect to it.
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
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
            'title' => 'nullable|string|max:255',
        ]);

        // Sequential per team sequence number
        $maxSeq = Thread::where('team_id', $team->id)->max('sequence_number') ?? 0;
        $nextSeq = $maxSeq + 1;

        $title = ! empty($validated['title']) ? $validated['title'] : "T-{$nextSeq} Support request";

        $thread = Thread::create([
            'team_id' => $team->id,
            'sequence_number' => $nextSeq,
            'title' => $title,
            'status' => ThreadStatus::NeedsFirstResponse,
            'priority' => ThreadPriority::Normal,
            'tenant_id' => $validated['tenant_id'] ?? null,
            'assigned_to' => $user->id,
        ]);

        $thread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => TimelineEntryType::Note,
            'body' => 'Thread created.',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thread created successfully.']);

        return redirect()->route('threads.index', [
            'thread' => $thread->id,
        ]);
    }

    /**
     * Update the specified support thread meta fields.
     */
    public function update(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(ThreadStatus::class)],
            'priority' => ['nullable', Rule::enum(ThreadPriority::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('team_members', 'user_id')->where('team_id', $team->id),
            ],
            'tier_id' => [
                'nullable',
                Rule::exists('tiers', 'id')->where('team_id', $team->id),
            ],
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->where('team_id', $team->id),
            ],
        ]);

        $oldStatus = $thread->status;
        $oldPriority = $thread->priority;
        $oldAssignee = $thread->assigned_to;
        $oldTierId = $thread->tier_id;
        $oldTenantId = $thread->tenant_id;

        $thread->update($validated);

        // Timeline Entry logging for EVERY change
        if (isset($validated['status']) && $validated['status'] !== $oldStatus->value) {
            $newStatusLabel = ThreadStatus::tryFrom($validated['status'])?->label() ?? $validated['status'];
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::User,
                'actor_id' => (string) $user->id,
                'entry_type' => TimelineEntryType::StatusChange,
                'metadata' => ['from' => $oldStatus->value, 'to' => $validated['status']],
                'body' => "Changed status to {$newStatusLabel}.",
            ]);
        }

        if (isset($validated['priority']) && $validated['priority'] !== $oldPriority->value) {
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::User,
                'actor_id' => (string) $user->id,
                'entry_type' => TimelineEntryType::PriorityChange,
                'metadata' => ['from' => $oldPriority->value, 'to' => $validated['priority']],
                'body' => "Changed priority to {$validated['priority']}.",
            ]);
        }

        if (array_key_exists('assigned_to', $validated) && $validated['assigned_to'] !== $oldAssignee) {
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::User,
                'actor_id' => (string) $user->id,
                'entry_type' => TimelineEntryType::Assignment,
                'metadata' => ['from' => $oldAssignee, 'to' => $validated['assigned_to']],
                'body' => $validated['assigned_to'] ? 'Reassigned thread.' : 'Unassigned thread.',
            ]);
        }

        if (array_key_exists('tier_id', $validated) && $validated['tier_id'] !== $oldTierId) {
            $tierName = $thread->tier->name ?? 'no tier';
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::User,
                'actor_id' => (string) $user->id,
                'entry_type' => TimelineEntryType::Note,
                'body' => "Changed thread tier to {$tierName}.",
            ]);
        }

        if (array_key_exists('tenant_id', $validated) && $validated['tenant_id'] !== $oldTenantId) {
            $customerName = $thread->tenant->name ?? 'Customer';
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::User,
                'actor_id' => (string) $user->id,
                'entry_type' => TimelineEntryType::Note,
                'body' => "Changed customer to {$customerName}.",
            ]);
        }

        return redirect()->back();
    }
}
