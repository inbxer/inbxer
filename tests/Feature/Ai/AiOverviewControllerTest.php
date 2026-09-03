<?php

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Team\Models\Team;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function aiOverviewAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('has_assignment_workflows is false when no workflow assigns to the AI Agent', function () {
    [$user, $team] = aiOverviewAgent();
    AiSettings::create(['team_id' => $team->id]);

    $response = $this->actingAs($user)->get('/ai');

    $response->assertInertia(fn ($page) => $page
        ->where('checklist.has_assignment_workflows', false));
});

test('has_assignment_workflows is true once an enabled workflow assigns to the AI Agent', function () {
    [$user, $team] = aiOverviewAgent();
    AiSettings::create(['team_id' => $team->id]);

    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Hand off to AI',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadCreated,
        'is_enabled' => true,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'assign_to_ai',
        'config' => [],
        'position' => 0,
    ]);

    $response = $this->actingAs($user)->get('/ai');

    $response->assertInertia(fn ($page) => $page
        ->where('checklist.has_assignment_workflows', true));
});

test('has_assignment_workflows is false again once the workflow is disabled', function () {
    [$user, $team] = aiOverviewAgent();
    AiSettings::create(['team_id' => $team->id]);

    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Hand off to AI',
        'status' => WorkflowStatus::Draft,
        'trigger_type' => WorkflowTriggerType::ThreadCreated,
        'is_enabled' => false,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'assign_to_ai',
        'config' => [],
        'position' => 0,
    ]);

    $response = $this->actingAs($user)->get('/ai');

    $response->assertInertia(fn ($page) => $page
        ->where('checklist.has_assignment_workflows', false));
});
