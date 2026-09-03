<?php

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function aiPreferencesAvatarAgent(): array
{
    $team = Team::factory()->create(['name' => 'Acme Support']);
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('uploading an image sets the avatar url', function () {
    Storage::fake('public');

    [$user, $team] = aiPreferencesAvatarAgent();
    $settings = AiSettings::create(['team_id' => $team->id]);

    $this->actingAs($user)
        ->post('/ai/preferences/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.png'),
        ])
        ->assertRedirect();

    expect($settings->fresh()->avatarUrl())->not->toBeNull();
});

test('uploading a non-image file is rejected', function () {
    Storage::fake('public');

    [$user, $team] = aiPreferencesAvatarAgent();
    $settings = AiSettings::create(['team_id' => $team->id]);

    $this->actingAs($user)
        ->post('/ai/preferences/avatar', [
            'avatar' => UploadedFile::fake()->create('notes.txt', 10),
        ])
        ->assertSessionHasErrors('avatar');

    expect($settings->fresh()->avatarUrl())->toBe(asset('widget/ai-avatar.jpg'));
});

test('removing the avatar clears it back to null', function () {
    Storage::fake('public');

    [$user, $team] = aiPreferencesAvatarAgent();
    $settings = AiSettings::create(['team_id' => $team->id]);

    $this->actingAs($user)->post('/ai/preferences/avatar', [
        'avatar' => UploadedFile::fake()->image('avatar.png'),
    ]);

    expect($settings->fresh()->avatarUrl())->not->toBeNull();

    $this->actingAs($user)
        ->delete('/ai/preferences/avatar')
        ->assertRedirect();

    expect($settings->fresh()->avatarUrl())->toBe(asset('widget/ai-avatar.jpg'));
});
