<?php

use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowRun;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function escalationWorkflow(Team $team, WorkflowTriggerType $trigger, array $step): Workflow
{
    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Escalation',
        'trigger_type' => $trigger,
        'status' => WorkflowStatus::Published,
        'is_enabled' => true,
    ]);

    $workflow->steps()->create($step + ['position' => 0]);

    return $workflow;
}

test('a card with notify_before_minutes fires the approaching-breach trigger before the deadline', function () {
    $team = Team::factory()->create();
    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'notify_before_minutes' => 10,
        'is_active' => true,
    ]);

    escalationWorkflow($team, WorkflowTriggerType::SlaApproachingBreach, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'About to breach',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    // 25 minutes elapsed of a 30-minute SLA, notify_before is 10 — inside the window.
    $thread->forceFill(['created_at' => now()->subMinutes(25)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    $thread->refresh();
    expect($thread->sla_first_response_notified_at)->not->toBeNull();
    expect($thread->sla_first_response_breached_at)->toBeNull();
    expect($thread->priority)->toBe(ThreadPriority::Urgent);
    expect(
        $thread->timelineEntries()->where('entry_type', TimelineEntryType::Escalation->value)->count(),
    )->toBe(1);
});

test('the approaching-breach trigger does not fire again once already notified', function () {
    $team = Team::factory()->create();
    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'notify_before_minutes' => 10,
        'is_active' => true,
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Already notified',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->forceFill([
        'created_at' => now()->subMinutes(25),
        'sla_first_response_notified_at' => now()->subMinutes(5),
    ])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    expect(
        $thread->timelineEntries()->where('entry_type', TimelineEntryType::Escalation->value)->count(),
    )->toBe(0);
});

test('a card without notify_before_minutes never fires the approaching-breach trigger', function () {
    $team = Team::factory()->create();
    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'is_active' => true,
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'No notify configured',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->forceFill(['created_at' => now()->subMinutes(29)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    expect($thread->fresh()->sla_first_response_notified_at)->toBeNull();
    expect(
        $thread->timelineEntries()->where('entry_type', TimelineEntryType::Escalation->value)->count(),
    )->toBe(0);
});

test('a breach still marks the breach timestamp for compliance reporting when notify_on_breach is off', function () {
    $team = Team::factory()->create();
    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'notify_on_breach' => false,
        'is_active' => true,
    ]);

    escalationWorkflow($team, WorkflowTriggerType::SlaBr, [
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Breached but silent',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->forceFill(['created_at' => now()->subMinutes(45)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    $thread->refresh();
    expect($thread->sla_first_response_breached_at)->not->toBeNull();
    expect($thread->priority)->toBe(ThreadPriority::Normal);
    expect(WorkflowRun::where('thread_id', $thread->id)->exists())->toBeFalse();
});
