<?php

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function similarTestSetup(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    $channel = Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Email,
        'name' => 'Test email',
        'is_active' => true,
        'settings' => [],
    ]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Password reset not working',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $related = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Cannot reset my password',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);

    $unrelated = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Billing question about invoice',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);

    return [$user, $team, $thread, $related, $unrelated];
}

test('similar threads endpoint is disabled when the setting is off', function () {
    [$user, $team, $thread] = similarTestSetup();
    AiSettings::create(['team_id' => $team->id, 'similar_threads_enabled' => false]);

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/similar")
        ->assertStatus(403);
});

test('similar threads endpoint returns keyword-matched threads when enabled', function () {
    [$user, $team, $thread, $related, $unrelated] = similarTestSetup();
    AiSettings::create(['team_id' => $team->id, 'similar_threads_enabled' => true]);

    $response = $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/similar")
        ->assertOk()
        ->json();

    $ids = collect($response['threads'])->pluck('id');

    expect($ids)->toContain($related->id);
    expect($ids)->not->toContain($unrelated->id);
    expect($ids)->not->toContain($thread->id);
});
