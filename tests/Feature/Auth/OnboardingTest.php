<?php

use App\Domain\Team\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a teamless user is shown the workspace onboarding screen', function () {
    $user = User::factory()->create();
    $user->teams()->detach();

    $response = $this->actingAs($user)->get(route('onboarding.workspace'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('onboarding/workspace'),
    );
});

test('a user with a team is redirected away from onboarding', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('onboarding.workspace'));

    $response->assertRedirect(route('threads.index'));
});

test('submitting the onboarding form creates the workspace and enters it', function () {
    $user = User::factory()->create();
    $user->teams()->detach();
    $user->update(['current_team_id' => null]);

    $response = $this->actingAs($user)->post(route('onboarding.workspace.store'), [
        'name' => 'My Company',
    ]);

    $team = Team::where('name', 'My Company')->firstOrFail();

    expect($team->is_personal)->toBeTrue();
    expect($user->fresh()->current_team_id)->toBe($team->id);
    $response->assertRedirect('/threads');
});
