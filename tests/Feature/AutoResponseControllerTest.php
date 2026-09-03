<?php

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\AutoResponse;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a member of multiple teams cannot manage another team auto-response until they switch into it', function () {
    // Team context now comes only from the session (current_team_id), not
    // the URL, so a member of multiple teams must switch into a team before
    // managing its resources — this guards that access control.
    $user = User::factory()->create();
    $team = Team::factory()->create();
    $team->members()->attach($user, ['role' => 'admin']);

    $autoResponse = AutoResponse::create([
        'team_id' => $team->id,
        'name' => 'Greeting',
        'message' => 'Hello!',
        'channels' => [],
        'conditions' => ['logic' => 'and', 'conditions' => []],
        'position' => 0,
        'is_enabled' => false,
    ]);

    $this->actingAs($user)
        ->get("/settings/autoresponses/{$autoResponse->id}")
        ->assertForbidden();

    $user->switchTeam($team);
    // Reset the TeamContext singleton left over from the request above —
    // in production each request gets a fresh container, but the test
    // client reuses the same one across these two simulated requests.
    app(TeamContext::class)->set($team);

    $this->actingAs($user)
        ->get("/settings/autoresponses/{$autoResponse->id}")
        ->assertSuccessful();

    $this->actingAs($user)
        ->patch("/settings/autoresponses/{$autoResponse->id}", [
            'name' => 'Updated greeting',
            'message' => 'Hi there!',
        ])
        ->assertRedirect();

    expect($autoResponse->fresh()->name)->toBe('Updated greeting');

    $this->actingAs($user)
        ->post("/settings/autoresponses/{$autoResponse->id}/toggle")
        ->assertRedirect();

    expect($autoResponse->fresh()->is_enabled)->toBeTrue();

    $this->actingAs($user)
        ->delete("/settings/autoresponses/{$autoResponse->id}")
        ->assertRedirect();

    expect(AutoResponse::find($autoResponse->id))->toBeNull();
});
