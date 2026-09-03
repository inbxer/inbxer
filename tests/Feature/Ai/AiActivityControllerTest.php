<?php

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Models\Channel;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function aiActivityAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

function aiActivityLog(Team $team, Thread $thread, array $overrides = []): AiActivityLogEntry
{
    return AiActivityLogEntry::create(array_merge([
        'team_id' => $team->id,
        'thread_id' => $thread->id,
        'generated_reply' => 'Here is your answer.',
        'matched_articles' => [],
        'status' => AiActivityStatus::PendingReview,
    ], $overrides));
}

test('approving a pending log sends the reply and marks it sent', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    [$user, $team] = aiActivityAgent();
    $channel = Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Email', 'is_active' => true, 'settings' => []]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow']);
    $log = aiActivityLog($team, $thread);

    $this->actingAs($user)
        ->post("/ai/activity/{$log->id}/approve")
        ->assertRedirect();

    $log->refresh();
    expect($log->status)->toBe(AiActivityStatus::Sent);
    Queue::assertPushed(SendOutboundEmailReplyJob::class);
});

test('approving with edited text marks the log as edited', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);

    [$user, $team] = aiActivityAgent();
    $channel = Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Email', 'is_active' => true, 'settings' => []]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow']);
    $log = aiActivityLog($team, $thread);

    $this->actingAs($user)
        ->post("/ai/activity/{$log->id}/approve", ['generated_reply' => 'A better, edited answer.'])
        ->assertRedirect();

    $log->refresh();
    expect($log->status)->toBe(AiActivityStatus::Edited);
    expect($log->generated_reply)->toBe('A better, edited answer.');
});

test('rejecting a log marks it rejected and it shows under the handed-off scope', function () {
    [$user, $team] = aiActivityAgent();
    $channel = Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Email', 'is_active' => true, 'settings' => []]);
    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Help',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $log = aiActivityLog($team, $thread);

    $this->actingAs($user)
        ->post("/ai/activity/{$log->id}/reject")
        ->assertRedirect();

    $log->refresh();
    expect($log->status)->toBe(AiActivityStatus::Rejected);
    expect(AiActivityLogEntry::handedOff()->where('id', $log->id)->exists())->toBeTrue();
});
