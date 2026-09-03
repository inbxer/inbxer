<?php

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Channel\Models\Channel;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Support\Models\AutoResponse;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function autoResponseChannel(Team $team, ChannelType $type): Channel
{
    return Channel::create([
        'team_id' => $team->id,
        'type' => $type,
        'name' => "Test {$type->value}",
        'is_active' => true,
        'settings' => [],
    ]);
}

function autoResponseRule(Team $team, array $overrides = []): AutoResponse
{
    return AutoResponse::create(array_merge([
        'team_id' => $team->id,
        'name' => 'Greeting',
        'message' => 'Thanks for reaching out!',
        'channels' => [],
        'conditions' => ['logic' => 'and', 'conditions' => []],
        'position' => 0,
        'is_enabled' => true,
        'respect_business_hours' => false,
    ], $overrides));
}

test('a new thread on a matching channel gets the auto-reply via email', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    autoResponseRule($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect(
        $thread->timelineEntries()->where('metadata->is_auto_reply', true)->exists(),
    )->toBeTrue();
    Queue::assertPushed(SendOutboundEmailReplyJob::class, fn ($job) => $job->threadId === $thread->id);
});

test('a Slack thread gets the auto-reply delivered via the Slack outbound job', function () {
    Queue::fake([SendOutboundSlackReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Slack);
    autoResponseRule($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    Queue::assertPushed(SendOutboundSlackReplyJob::class, fn ($job) => $job->threadId === $thread->id);
});

test('a Discord thread falls back to email delivery when the tenant has an email', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Discord);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    autoResponseRule($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    Queue::assertPushed(SendOutboundEmailReplyJob::class, fn ($job) => $job->threadId === $thread->id);
});

test('a chat thread is delivered purely via the timeline broadcast with no outbound job', function () {
    Queue::fake([SendOutboundEmailReplyJob::class, SendOutboundSlackReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Chat);
    autoResponseRule($team);

    Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
    Queue::assertNotPushed(SendOutboundSlackReplyJob::class);
});

test('only the first matching enabled rule by position fires', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    autoResponseRule($team, ['name' => 'First', 'message' => 'First message', 'position' => 0]);
    autoResponseRule($team, ['name' => 'Second', 'message' => 'Second message', 'position' => 1]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->timelineEntries()->where('body', 'First message')->exists())->toBeTrue();
    expect($thread->timelineEntries()->where('body', 'Second message')->exists())->toBeFalse();
});

test('a disabled rule never fires', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Email);
    autoResponseRule($team, ['is_enabled' => false]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->timelineEntries()->count())->toBe(0);
    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
});

test('a rule scoped to a different channel type is skipped', function () {
    Queue::fake([SendOutboundSlackReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Slack);
    autoResponseRule($team, ['channels' => ['email']]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->timelineEntries()->count())->toBe(0);
    Queue::assertNotPushed(SendOutboundSlackReplyJob::class);
});

test('a business-hours-gated rule only fires within business hours', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    $openSchedule = collect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
        ->mapWithKeys(fn ($day) => [$day => ['start' => '00:00', 'end' => '23:59']])
        ->all();
    BusinessHours::create([
        'team_id' => $team->id,
        'name' => 'Default',
        'timezone' => 'UTC',
        'schedule' => $openSchedule,
        'is_default' => true,
    ]);

    autoResponseRule($team, ['respect_business_hours' => true]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->timelineEntries()->where('metadata->is_auto_reply', true)->exists())->toBeTrue();
});

test('a business-hours-gated rule is skipped outside business hours', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    $team = Team::factory()->create();
    $channel = autoResponseChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    $closedSchedule = collect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
        ->mapWithKeys(fn ($day) => [$day => ['start' => '00:00', 'end' => '00:01']])
        ->all();
    BusinessHours::create([
        'team_id' => $team->id,
        'name' => 'Default',
        'timezone' => 'UTC',
        'schedule' => $closedSchedule,
        'is_default' => true,
    ]);

    autoResponseRule($team, ['respect_business_hours' => true]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    expect($thread->timelineEntries()->where('metadata->is_auto_reply', true)->exists())->toBeFalse();
    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
});
