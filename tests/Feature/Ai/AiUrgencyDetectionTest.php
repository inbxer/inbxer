<?php

use App\Ai\Agents\ThreadUrgencyAgent;
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
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function urgencyThread(Team $team, ?ThreadPriority $priority = null): Thread
{
    $channel = Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Email,
        'name' => 'Test email',
        'is_active' => true,
        'settings' => [],
    ]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    return Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => $priority ?? ThreadPriority::Normal,
    ]);
}

test('urgency detection is skipped when disabled', function () {
    ThreadUrgencyAgent::fake([['priority' => 'urgent']]);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'live', 'urgency_detection_enabled' => false]);
    $thread = urgencyThread($team);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Our production system is down, this is critical!',
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Normal);
});

test('urgency detection sets priority when enabled', function () {
    ThreadUrgencyAgent::fake([['priority' => 'urgent']]);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'urgency_detection_enabled' => true]);
    $thread = urgencyThread($team);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Our production system is down, this is critical!',
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Urgent);
});

test('urgency detection does not clobber an already explicit priority', function () {
    ThreadUrgencyAgent::fake([['priority' => 'urgent']]);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'urgency_detection_enabled' => true]);
    $thread = urgencyThread($team, ThreadPriority::Low);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Our production system is down, this is critical!',
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Low);
});

test('urgency detection fails gracefully without crashing', function () {
    ThreadUrgencyAgent::fake(function () {
        throw new RuntimeException('provider is down');
    });

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'urgency_detection_enabled' => true]);
    $thread = urgencyThread($team);

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Our production system is down, this is critical!',
    ]);

    expect($thread->fresh()->priority)->toBe(ThreadPriority::Normal);
});
