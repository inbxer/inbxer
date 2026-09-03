<?php

use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function workflowRunsAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('the runs page lists real workflow executions with their step logs', function () {
    [$user, $team] = workflowRunsAgent();

    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Auto-tag urgent',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadCreated,
        'is_enabled' => true,
    ]);
    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'set_priority',
        'config' => ['priority' => 'urgent'],
        'position' => 0,
    ]);

    Thread::create([
        'team_id' => $team->id,
        'title' => 'Trigger me',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->get('/workflows/runs')
        ->assertInertia(fn ($page) => $page
            ->where('runs.data.0.workflow_name', 'Auto-tag urgent')
            ->where('runs.data.0.status', 'completed')
            ->has('runs.data.0.logs', 1)
            ->where('runs.data.0.logs.0.action_type', 'set_priority')
            ->where('runs.data.0.subject.type', 'thread'));
});

test('the runs page only shows runs belonging to the current team', function () {
    [$user, $team] = workflowRunsAgent();
    $otherTeam = Team::factory()->create();

    $otherWorkflow = Workflow::create([
        'team_id' => $otherTeam->id,
        'name' => 'Other team workflow',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadCreated,
        'is_enabled' => true,
    ]);
    $otherWorkflow->steps()->create([
        'type' => 'action',
        'action_type' => 'lock_thread',
        'config' => [],
        'position' => 0,
    ]);
    Thread::create([
        'team_id' => $otherTeam->id,
        'title' => 'Other team thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->get('/workflows/runs')
        ->assertInertia(fn ($page) => $page->has('runs.data', 0));
});
