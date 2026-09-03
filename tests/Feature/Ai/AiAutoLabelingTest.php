<?php

use App\Ai\Agents\ThreadLabelingAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function labelingChannel(Team $team): Channel
{
    return Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Email,
        'name' => 'Test email',
        'is_active' => true,
        'settings' => [],
    ]);
}

function labelingThread(Team $team, Channel $channel): Thread
{
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    return Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
}

test('auto-labeling is skipped when disabled', function () {
    ThreadLabelingAgent::fake([['labels' => ['Billing']]]);

    $team = Team::factory()->create();
    Label::create(['team_id' => $team->id, 'name' => 'Billing', 'color' => '#000']);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'live', 'auto_labeling_enabled' => false]);
    $thread = labelingThread($team, labelingChannel($team));

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I have a billing question about my invoice.',
    ]);

    expect($thread->labels()->count())->toBe(0);
});

test('auto-labeling applies a matching existing label', function () {
    ThreadLabelingAgent::fake([['labels' => ['Billing']]]);

    $team = Team::factory()->create();
    $label = Label::create(['team_id' => $team->id, 'name' => 'Billing', 'color' => '#000']);
    Label::create(['team_id' => $team->id, 'name' => 'Bug', 'color' => '#111']);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'auto_labeling_enabled' => true]);
    $thread = labelingThread($team, labelingChannel($team));

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I have a billing question about my invoice.',
    ]);

    expect($thread->labels()->pluck('labels.id')->all())->toBe([$label->id]);
});

test('auto-labeling fails gracefully without crashing', function () {
    ThreadLabelingAgent::fake(function () {
        throw new RuntimeException('provider is down');
    });

    $team = Team::factory()->create();
    Label::create(['team_id' => $team->id, 'name' => 'Billing', 'color' => '#000']);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'auto_labeling_enabled' => true]);
    $thread = labelingThread($team, labelingChannel($team));

    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'I have a billing question about my invoice.',
    ]);

    expect($thread->labels()->count())->toBe(0);
});
