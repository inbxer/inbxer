<?php

use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a team member can open the settings overview page', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    $this->actingAs($user)
        ->get('/settings')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/overview'));
});
