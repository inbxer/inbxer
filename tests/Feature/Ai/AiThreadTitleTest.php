<?php

use App\Ai\Agents\ThreadTitleAgent;
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

function titleThread(Team $team, string $title): Thread
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
        'title' => $title,
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
}

test('thread titling is skipped when disabled', function () {
    ThreadTitleAgent::fake(['Cannot log in to my account']);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'live', 'thread_titles_enabled' => false]);
    $thread = titleThread($team, 'Email inquiry from cust@example.com');

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I cannot log in to my account, please help.',
    ]);

    expect($thread->fresh()->title)->toBe('Email inquiry from cust@example.com');
});

test('thread titling replaces a generic placeholder title', function () {
    ThreadTitleAgent::fake(['Cannot log in to my account']);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'thread_titles_enabled' => true]);
    $thread = titleThread($team, 'Email inquiry from cust@example.com');

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I cannot log in to my account, please help.',
    ]);

    expect($thread->fresh()->title)->toBe('Cannot log in to my account');
});

test('thread titling leaves a real customer-provided title alone', function () {
    ThreadTitleAgent::fake(['Some generated title']);

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'thread_titles_enabled' => true]);
    $thread = titleThread($team, 'Refund request for order #1234');

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I would like a refund for order #1234.',
    ]);

    expect($thread->fresh()->title)->toBe('Refund request for order #1234');
});

test('thread titling fails gracefully without crashing', function () {
    ThreadTitleAgent::fake(function () {
        throw new RuntimeException('provider is down');
    });

    $team = Team::factory()->create();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'thread_titles_enabled' => true]);
    $thread = titleThread($team, 'Website chat');

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Hello, I need help.',
    ]);

    expect($thread->fresh()->title)->toBe('Website chat');
});
