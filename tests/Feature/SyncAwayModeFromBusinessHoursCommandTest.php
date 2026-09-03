<?php

use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function teamWithBusinessHours(array $schedule): Team
{
    $team = Team::factory()->create([
        'settings' => ['workflow' => ['away_mode' => ['outside_hours_mode' => 'away_mode']]],
    ]);

    BusinessHours::create([
        'team_id' => $team->id,
        'name' => 'Default business hours',
        'timezone' => 'UTC',
        'schedule' => $schedule,
        'is_default' => true,
    ]);

    return $team;
}

test('it marks members away when outside business hours', function () {
    $closedSchedule = collect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
        ->mapWithKeys(fn ($day) => [$day => ['start' => '00:00', 'end' => '00:01']])
        ->all();
    $team = teamWithBusinessHours($closedSchedule);

    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'member']);

    $this->artisan('inbxer:sync-away-mode')->assertSuccessful();

    $user->refresh();
    expect($user->is_away)->toBeTrue();
    expect($user->is_away_auto)->toBeTrue();
});

test('it clears auto-away when back within business hours, but leaves manual away alone', function () {
    $openSchedule = collect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
        ->mapWithKeys(fn ($day) => [$day => ['start' => '00:00', 'end' => '23:59']])
        ->all();
    $team = teamWithBusinessHours($openSchedule);

    $autoAwayUser = User::factory()->create(['current_team_id' => $team->id]);
    $autoAwayUser->update(['is_away' => true, 'is_away_auto' => true]);
    $team->members()->attach($autoAwayUser, ['role' => 'member']);

    $manuallyAwayUser = User::factory()->create(['current_team_id' => $team->id]);
    $manuallyAwayUser->update(['is_away' => true, 'is_away_auto' => false]);
    $team->members()->attach($manuallyAwayUser, ['role' => 'member']);

    $this->artisan('inbxer:sync-away-mode')->assertSuccessful();

    expect($autoAwayUser->refresh()->is_away)->toBeFalse();
    expect($manuallyAwayUser->refresh()->is_away)->toBeTrue();
});

test('it skips teams not configured for away-mode outside hours', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'member']);

    $this->artisan('inbxer:sync-away-mode')->assertSuccessful();

    expect($user->refresh()->is_away)->toBeFalse();
});
