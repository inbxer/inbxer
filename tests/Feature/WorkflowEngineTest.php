<?php

use App\Domain\Label\Models\Label;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowRunStatus;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function workflowAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

function publishedWorkflow(Team $team, WorkflowTriggerType $trigger, array $step): Workflow
{
    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Test workflow',
        'status' => WorkflowStatus::Published,
        'trigger_type' => $trigger,
        'is_enabled' => true,
    ]);

    $workflow->steps()->create($step + ['position' => 0]);

    return $workflow;
}

test('thread created trigger runs and applies a label action', function () {
    [, $team] = workflowAgent();
    $label = Label::create(['team_id' => $team->id, 'name' => 'Urgent', 'color' => '#f00']);

    publishedWorkflow($team, WorkflowTriggerType::ThreadCreated, [
        'type' => 'action',
        'action_type' => 'apply_labels',
        'config' => ['label_ids' => [$label->id]],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'New issue',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->fresh()->labels()->pluck('labels.id'))->toContain($label->id);
    expect(WorkflowRun::where('thread_id', $thread->id)->count())->toBe(1);
});

test('condition step branches correctly and only executes the matching branch action', function () {
    [, $team] = workflowAgent();
    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Branching workflow',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadStatusChanged,
        'is_enabled' => true,
    ]);

    $condition = $workflow->steps()->create([
        'type' => 'condition',
        'action_type' => '',
        'config' => ['logic' => 'and', 'conditions' => [
            ['field' => 'priority', 'operator' => 'is', 'value' => 'urgent'],
        ]],
        'position' => 0,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'set_status',
        'config' => ['status' => 'investigating'],
        'position' => 0,
        'parent_step_id' => $condition->id,
        'branch' => 'if',
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'set_status',
        'config' => ['status' => 'paused_for_later'],
        'position' => 0,
        'parent_step_id' => $condition->id,
        'branch' => 'else',
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Urgent issue',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Urgent,
    ]);

    $thread->update(['status' => ThreadStatus::NeedsNextResponse]);

    expect($thread->fresh()->status)->toBe(ThreadStatus::Investigating);
});

test('label added trigger fires when labels are synced onto a thread', function () {
    [$user, $team] = workflowAgent();
    $label = Label::create(['team_id' => $team->id, 'name' => 'VIP', 'color' => '#0f0']);

    publishedWorkflow($team, WorkflowTriggerType::LabelAdded, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'high'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Needs labeling',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->post("/threads/{$thread->id}/labels", ['label_ids' => [$label->id]])
        ->assertRedirect();

    expect($thread->fresh()->priority)->toBe(ThreadPriority::High);
});

test('inbound message trigger fires when a customer message timeline entry is created', function () {
    [, $team] = workflowAgent();

    publishedWorkflow($team, WorkflowTriggerType::InboundMessage, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'New message',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'body' => 'Hello, I need help',
        'is_internal' => false,
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Urgent);
});

test('an internal note does not fire the inbound message trigger', function () {
    [, $team] = workflowAgent();

    publishedWorkflow($team, WorkflowTriggerType::InboundMessage, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Internal note only',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::User,
        'entry_type' => TimelineEntryType::Note,
        'body' => 'internal note',
        'is_internal' => true,
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Normal);
});

test('thread updated trigger fires generically on any tracked attribute change', function () {
    [, $team] = workflowAgent();

    publishedWorkflow($team, WorkflowTriggerType::ThreadUpdated, [
        'type' => 'action',
        'action_type' => 'add_note',
        'config' => ['body' => 'Thread was updated'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Title before',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->update(['title' => 'Title after']);

    expect(
        $thread->timelineEntries()->where('body', 'Thread was updated')->exists(),
    )->toBeTrue();
});

test('manual trigger can be run against a specific thread from the workflow builder', function () {
    [$user, $team] = workflowAgent();

    $workflow = publishedWorkflow($team, WorkflowTriggerType::Manual, [
        'type' => 'action',
        'action_type' => 'lock_thread',
        'config' => [],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Run me manually',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->post("/workflows/{$workflow->id}/run", ['thread_id' => $thread->id])
        ->assertRedirect();

    expect($thread->fresh()->locked_at)->not->toBeNull();
});

test('manual run is rejected for a non-manual-trigger workflow', function () {
    [$user, $team] = workflowAgent();

    $workflow = publishedWorkflow($team, WorkflowTriggerType::ThreadCreated, [
        'type' => 'action',
        'action_type' => 'lock_thread',
        'config' => [],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Should not run',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->post("/workflows/{$workflow->id}/run", ['thread_id' => $thread->id])
        ->assertStatus(422);
});

test('a step placed after a condition at the same level runs regardless of which branch matched', function () {
    [, $team] = workflowAgent();
    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Merge-back workflow',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadStatusChanged,
        'is_enabled' => true,
    ]);

    $condition = $workflow->steps()->create([
        'type' => 'condition',
        'action_type' => '',
        'config' => ['logic' => 'and', 'conditions' => [
            ['field' => 'priority', 'operator' => 'is', 'value' => 'urgent'],
        ]],
        'position' => 0,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'set_status',
        'config' => ['status' => 'investigating'],
        'position' => 0,
        'parent_step_id' => $condition->id,
        'branch' => 'if',
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'set_status',
        'config' => ['status' => 'paused_for_later'],
        'position' => 0,
        'parent_step_id' => $condition->id,
        'branch' => 'else',
    ]);

    // A sibling of the condition itself (same parent/branch as the condition) —
    // must run after either branch finishes, since it "merges back".
    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'apply_labels',
        'config' => ['label_ids' => []],
        'position' => 1,
    ]);
    $label = Label::create(['team_id' => $team->id, 'name' => 'Reviewed', 'color' => '#00f']);
    $workflow->steps()->where('position', 1)->update(['config' => ['label_ids' => [$label->id]]]);

    $urgentThread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Urgent thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Urgent,
    ]);
    $urgentThread->update(['status' => ThreadStatus::NeedsNextResponse]);

    $normalThread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Normal thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $normalThread->update(['status' => ThreadStatus::NeedsNextResponse]);

    expect($urgentThread->fresh()->status)->toBe(ThreadStatus::Investigating);
    expect($normalThread->fresh()->status)->toBe(ThreadStatus::PausedForLater);
    expect($urgentThread->fresh()->labels()->pluck('labels.id'))->toContain($label->id);
    expect($normalThread->fresh()->labels()->pluck('labels.id'))->toContain($label->id);
});

test('customer created trigger runs a thread-less workflow against the tenant', function () {
    [, $team] = workflowAgent();

    publishedWorkflow($team, WorkflowTriggerType::CustomerCreated, [
        'type' => 'action',
        'action_type' => 'send_http_request',
        'config' => ['url' => 'https://example.test/webhook', 'method' => 'post'],
    ]);

    Http::fake();

    $tenant = Tenant::create([
        'team_id' => $team->id,
        'name' => 'New Customer',
        'email' => 'new@example.com',
    ]);

    Http::assertSent(function ($request) use ($tenant) {
        return $request->url() === 'https://example.test/webhook'
            && $request['tenant_id'] === $tenant->id;
    });

    expect(WorkflowRun::where('tenant_id', $tenant->id)->whereNull('thread_id')->count())->toBe(1);
});

test('thread-only actions are safely skipped when a workflow runs without a thread', function () {
    [, $team] = workflowAgent();

    $workflow = publishedWorkflow($team, WorkflowTriggerType::CustomerCreated, [
        'type' => 'action',
        'action_type' => 'lock_thread',
        'config' => [],
    ]);

    $tenant = Tenant::create([
        'team_id' => $team->id,
        'name' => 'Another Customer',
        'email' => 'another@example.com',
    ]);

    $run = WorkflowRun::where('tenant_id', $tenant->id)->firstOrFail();

    expect($run->status)->toBe(WorkflowRunStatus::Completed);
    expect($run->logs()->first()->output['skipped'])->toBeTrue();
});

test('sla breach command fires the SLA breached trigger once and logs a timeline entry', function () {
    [, $team] = workflowAgent();

    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'is_active' => true,
        'notify_on_breach' => true,
    ]);

    publishedWorkflow($team, WorkflowTriggerType::SlaBr, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Overdue thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->forceFill(['created_at' => now()->subMinutes(45)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    $thread->refresh();
    expect($thread->sla_first_response_breached_at)->not->toBeNull();
    expect($thread->priority)->toBe(ThreadPriority::Urgent);
    expect(
        $thread->timelineEntries()->where('entry_type', TimelineEntryType::SlaBreach->value)->count(),
    )->toBe(1);

    // Running it again must not double-fire the breach.
    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();
    expect(
        $thread->timelineEntries()->where('entry_type', TimelineEntryType::SlaBreach->value)->count(),
    )->toBe(1);
});
