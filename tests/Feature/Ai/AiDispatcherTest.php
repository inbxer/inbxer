<?php

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Channel\Models\Channel;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function aiChannel(Team $team, ChannelType $type): Channel
{
    return Channel::create([
        'team_id' => $team->id,
        'type' => $type,
        'name' => "Test {$type->value}",
        'is_active' => true,
        'settings' => [],
    ]);
}

function aiSettings(Team $team, array $overrides = []): AiSettings
{
    return AiSettings::create(array_merge([
        'team_id' => $team->id,
        'mode' => 'shadow',
    ], $overrides));
}

function aiThread(Team $team, Channel $channel, ?Tenant $tenant = null): Thread
{
    return Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant?->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
}

function customerMessage(Thread $thread, string $body = 'How do I reset my password?'): void
{
    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => $body,
    ]);
}

test('shadow mode logs a pending review entry but sends nothing', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    aiSettings($team, ['mode' => 'shadow']);
    $thread = aiThread($team, $channel, $tenant);

    customerMessage($thread);

    $log = AiActivityLogEntry::where('thread_id', $thread->id)->first();
    expect($log)->not->toBeNull();
    expect($log->status)->toBe(AiActivityStatus::PendingReview);
    expect($log->generated_reply)->toBe('Here is your answer.');

    expect($thread->timelineEntries()->where('actor_type', ActorType::Ai)->exists())->toBeFalse();
    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
});

test('live mode logs and immediately sends the reply', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    aiSettings($team, ['mode' => 'live']);
    $thread = aiThread($team, $channel, $tenant);

    customerMessage($thread);

    $log = AiActivityLogEntry::where('thread_id', $thread->id)->first();
    expect($log)->not->toBeNull();

    expect($thread->timelineEntries()->where('actor_type', ActorType::Ai)->exists())->toBeTrue();
    Queue::assertPushed(SendOutboundEmailReplyJob::class, fn ($job) => $job->threadId === $thread->id);
});

test('a channel not enabled for AI replies is skipped', function () {
    Queue::fake([SendOutboundSlackReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Slack);
    aiSettings($team, ['mode' => 'live', 'channels' => ['email']]);
    $thread = aiThread($team, $channel);

    customerMessage($thread);

    expect(AiActivityLogEntry::where('thread_id', $thread->id)->exists())->toBeFalse();
    Queue::assertNotPushed(SendOutboundSlackReplyJob::class);
});

test('a business-hours-gated team is skipped outside business hours', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Email);
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

    aiSettings($team, ['mode' => 'live', 'respect_business_hours' => true]);
    $thread = aiThread($team, $channel, $tenant);

    customerMessage($thread);

    expect(AiActivityLogEntry::where('thread_id', $thread->id)->exists())->toBeFalse();
    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
});

test('an agent failure is caught safely and no log is created', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(function () {
        throw new RuntimeException('provider is down');
    });

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    aiSettings($team, ['mode' => 'live']);
    $thread = aiThread($team, $channel, $tenant);

    customerMessage($thread);

    expect(AiActivityLogEntry::where('thread_id', $thread->id)->exists())->toBeFalse();
    Queue::assertNotPushed(SendOutboundEmailReplyJob::class);
});

test('the AI does not re-trigger itself when its own reply is added to the timeline', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = aiChannel($team, ChannelType::Email);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    aiSettings($team, ['mode' => 'live']);
    $thread = aiThread($team, $channel, $tenant);

    customerMessage($thread);

    SupportReplyAgent::assertPromptedTimes(1);
});
