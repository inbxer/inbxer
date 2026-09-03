<?php

use App\Ai\Agents\ThreadSummaryAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function summaryTestSetup(): array
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
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'My order has not arrived yet.',
    ]);

    return [$user, $team, $thread];
}

test('thread summary endpoint is disabled when the setting is off', function () {
    [$user, $team, $thread] = summaryTestSetup();
    AiSettings::updateOrCreate(['team_id' => $team->id], ['thread_catchups_enabled' => false]);

    ThreadSummaryAgent::fake(['The customer is waiting on a late order.']);

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-summary")
        ->assertStatus(403);
});

test('thread summary endpoint returns a summary when enabled', function () {
    [$user, $team, $thread] = summaryTestSetup();
    AiSettings::updateOrCreate(['team_id' => $team->id], ['thread_catchups_enabled' => true]);

    ThreadSummaryAgent::fake(['The customer is waiting on a late order.']);

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-summary")
        ->assertOk()
        ->assertJson(['summary' => 'The customer is waiting on a late order.']);
});

test('thread summary endpoint fails gracefully on agent error', function () {
    [$user, $team, $thread] = summaryTestSetup();
    AiSettings::updateOrCreate(['team_id' => $team->id], ['thread_catchups_enabled' => true]);

    ThreadSummaryAgent::fake(function () {
        throw new RuntimeException('provider is down');
    });

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-summary")
        ->assertStatus(502)
        ->assertJsonStructure(['error']);
});
