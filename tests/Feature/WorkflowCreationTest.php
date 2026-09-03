<?php

use App\Domain\Team\Models\Team;
use App\Domain\Workflow\Models\Workflow;
use App\Models\User;

test('creating a blank workflow defaults to Untitled workflow', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $user->teams()->attach($team, ['role' => 'owner']);
    $user->switchTeam($team);

    $response = $this->actingAs($user)->post('/workflows', []);

    $response->assertRedirect();
    $workflow = Workflow::where('team_id', $team->id)->first();
    expect($workflow)->not->toBeNull();
    expect($workflow->name)->toBe('Untitled workflow');
});

test('creating a workflow from a template pre-fills its steps', function () {
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $user->teams()->attach($team, ['role' => 'owner']);
    $user->switchTeam($team);

    $response = $this->actingAs($user)->post('/workflows', [
        'template' => 'urgent-chat-priority',
    ]);

    $response->assertRedirect();
    $workflow = Workflow::where('team_id', $team->id)->first();
    expect($workflow)->not->toBeNull();
    expect($workflow->steps()->count())->toBe(2);
});
