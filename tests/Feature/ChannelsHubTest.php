<?php

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Integration\Models\ApiKey;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function channelsHubAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('slack and email show not connected for a team that never configured them', function () {
    [$user, $team] = channelsHubAgent();

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page
            ->where('channels.slack.connected', false)
            ->where('channels.email.connected', false)
            ->where('channels.chat.connected', false)
            ->where('channels.api.connected', false));
});

test('slack shows connected once an active slack channel exists', function () {
    [$user, $team] = channelsHubAgent();
    Channel::create(['team_id' => $team->id, 'type' => ChannelType::Slack, 'name' => 'Workspace', 'is_active' => true]);

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page->where('channels.slack.connected', true));
});

test('the api channel shows connected once a non-expired api key exists', function () {
    [$user, $team] = channelsHubAgent();
    $apiKey = new ApiKey(['team_id' => $team->id, 'name' => 'Test', 'created_by' => $user->id]);
    ApiKey::generateKey($apiKey);
    $apiKey->save();

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page->where('channels.api.connected', true));
});

test('the api channel shows not connected if the only api key is expired', function () {
    [$user, $team] = channelsHubAgent();
    $apiKey = new ApiKey(['team_id' => $team->id, 'name' => 'Test', 'created_by' => $user->id, 'expires_at' => now()->subDay()]);
    ApiKey::generateKey($apiKey);
    $apiKey->save();

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page->where('channels.api.connected', false));
});

test('chat still shows not connected after merely visiting the chat settings page auto-provisions a placeholder channel', function () {
    [$user, $team] = channelsHubAgent();

    // Simulate ChatChannelController::index()'s lazy auto-provisioning of a
    // default channel row with the placeholder example.com chat_url — this
    // alone must never count as "connected".
    Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Chat,
        'name' => 'Website Name',
        'is_active' => true,
        'settings' => ['chat_url' => 'https://www.example.com'],
    ]);

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page->where('channels.chat.connected', false));
});

test('chat shows connected once the widget has a real site url saved', function () {
    [$user, $team] = channelsHubAgent();

    Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Chat,
        'name' => 'My Company',
        'is_active' => true,
        'settings' => ['chat_url' => 'https://my-real-site.com'],
    ]);

    $this->actingAs($user)
        ->get('/settings/channels')
        ->assertInertia(fn ($page) => $page->where('channels.chat.connected', true));
});
