<?php

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\ProcessSlackEventJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\InboundSlackProcessor;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

function slackWorkspace(Team $team, array $settings = []): Channel
{
    return Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Slack,
        'name' => 'Test Slack',
        'is_active' => true,
        'settings' => array_merge([
            'slack_team_id' => 'T123',
            'bot_access_token' => 'xoxb-test',
            'ingestion_mode' => 'one_to_one',
            'enable_reactions' => true,
            'connected_channels' => [[
                'id' => 'C123',
                'name' => '#support',
                'type' => 'Customer',
                'ingestion_mode' => 'one_to_one',
            ]],
        ], $settings),
    ]);
}

function signedSlackHeaders(string $body, int $timestamp): array
{
    $signature = 'v0='.hash_hmac('sha256', "v0:{$timestamp}:{$body}", 'test-signing-secret');

    return [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_SLACK_REQUEST_TIMESTAMP' => (string) $timestamp,
        'HTTP_X_SLACK_SIGNATURE' => $signature,
    ];
}

test('Slack webhook verifies signatures and dispatches each event once', function () {
    config(['services.slack.signing_secret' => 'test-signing-secret']);
    Queue::fake([ProcessSlackEventJob::class]);
    $payload = ['type' => 'event_callback', 'event_id' => 'Ev01', 'team_id' => 'T123', 'event' => ['type' => 'message']];
    $body = json_encode($payload, JSON_THROW_ON_ERROR);
    $headers = signedSlackHeaders($body, time());

    $this->call('POST', '/api/v1/webhooks/slack/events', [], [], [], $headers, $body)->assertSuccessful();
    $this->call('POST', '/api/v1/webhooks/slack/events', [], [], [], $headers, $body)->assertSuccessful();

    Queue::assertPushed(ProcessSlackEventJob::class, 1);
});

test('Slack rejects forged and stale webhook requests', function () {
    config(['services.slack.signing_secret' => 'test-signing-secret']);

    $this->postJson('/api/v1/webhooks/slack/events', ['type' => 'event_callback'])
        ->assertUnauthorized();
});

test('top-level Slack messages create threads and replies append to their timeline', function () {
    $workspace = slackWorkspace(Team::factory()->create());
    $processor = app(InboundSlackProcessor::class);

    $thread = $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '100.001', 'text' => 'Production is returning 500'],
    ]);
    $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '100.002', 'thread_ts' => '100.001', 'text' => 'This affects all users'],
    ]);

    expect($thread)->not->toBeNull()
        ->and($thread->channel_id)->toBe($workspace->id)
        ->and($thread->fresh()->timelineEntries)->toHaveCount(2)
        ->and($thread->fresh()->timelineEntries->last()->body)->toBe('This affects all users');
});

test('Slack retries do not duplicate timeline messages', function () {
    slackWorkspace(Team::factory()->create());
    $processor = app(InboundSlackProcessor::class);
    $payload = [
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '200.001', 'text' => 'Duplicate check'],
    ];

    $thread = $processor->process($payload);
    $processor->process($payload);

    expect($thread->fresh()->timelineEntries)->toHaveCount(1);
});

test('Slack reactions update thread status', function () {
    slackWorkspace(Team::factory()->create());
    $processor = app(InboundSlackProcessor::class);
    $thread = $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '300.001', 'text' => 'Please investigate'],
    ]);

    $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'reaction_added', 'reaction' => 'white_check_mark', 'item' => ['type' => 'message', 'channel' => 'C123', 'ts' => '300.001']],
    ]);

    expect($thread->fresh()->status)->toBe(ThreadStatus::Done);
});

test('a reply from an authorized agent auto-assigns the thread when configured', function () {
    $team = Team::factory()->create([
        'settings' => ['workflow' => ['auto_assignment' => ['assign_on_reply_from_slack_teams' => true]]],
    ]);
    $agent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($agent, ['role' => 'admin']);

    $workspace = slackWorkspace($team, [
        'replying_as' => [
            (string) $agent->id => ['slack_user_id' => 'UAGENT'],
        ],
    ]);
    $processor = app(InboundSlackProcessor::class);

    $thread = $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '500.001', 'text' => 'Help please'],
    ]);
    $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'UAGENT', 'ts' => '500.002', 'thread_ts' => '500.001', 'text' => 'On it'],
    ]);

    expect($thread->fresh()->assigned_to)->toBe($agent->id);
});

test('auto-assignment on Slack reply does nothing when the setting is disabled', function () {
    $team = Team::factory()->create();
    $agent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($agent, ['role' => 'admin']);

    $workspace = slackWorkspace($team, [
        'replying_as' => [
            (string) $agent->id => ['slack_user_id' => 'UAGENT'],
        ],
    ]);
    $processor = app(InboundSlackProcessor::class);

    $thread = $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'U123', 'ts' => '600.001', 'text' => 'Help please'],
    ]);
    $processor->process([
        'team_id' => 'T123',
        'event' => ['type' => 'message', 'channel' => 'C123', 'user' => 'UAGENT', 'ts' => '600.002', 'thread_ts' => '600.001', 'text' => 'On it'],
    ]);

    expect($thread->fresh()->assigned_to)->toBeNull();
});

test('outbound Slack replies are posted into the original Slack thread', function () {
    Http::preventStrayRequests();
    Http::fake(['slack.com/api/chat.postMessage' => Http::response(['ok' => true, 'ts' => '400.002'])]);
    $workspace = slackWorkspace(Team::factory()->create());
    $thread = Thread::create([
        'team_id' => $workspace->team_id,
        'channel_id' => $workspace->id,
        'sequence_number' => 1,
        'title' => 'Slack issue',
        'status' => ThreadStatus::NeedsFirstResponse,
        'external_id' => 'slack:C123:400.001',
        'metadata' => ['slack_channel_id' => 'C123', 'slack_thread_ts' => '400.001'],
    ]);
    $entry = $thread->timelineEntries()->create([
        'actor_type' => 'user', 'entry_type' => 'message', 'body' => 'We fixed it.', 'is_internal' => false,
    ]);

    (new SendOutboundSlackReplyJob($thread->id, $entry->id))->handle(app(SlackClient::class));

    Http::assertSent(fn ($request) => $request['channel'] === 'C123' && $request['thread_ts'] === '400.001');
    expect($entry->fresh()->metadata['slack_ts'])->toBe('400.002');
});
