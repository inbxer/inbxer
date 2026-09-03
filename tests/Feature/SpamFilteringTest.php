<?php

use App\Domain\Channel\DTOs\EmailMessageData;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\InboundChatProcessor;
use App\Domain\Channel\Services\InboundEmailProcessor;
use App\Domain\Spam\Services\SpamDetector;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function spamAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('the spam detector matches a blocked keyword', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => true, 'blocked_keywords' => ['crypto giveaway'], 'blocked_domains' => []],
    ]]);

    $detector = app(SpamDetector::class);

    expect($detector->isSpam($team, 'Claim your FREE crypto giveaway now!!'))->toBeTrue();
    expect($detector->isSpam($team, 'Hi, I need help with my invoice.'))->toBeFalse();
});

test('the spam detector matches a blocked sender domain', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => true, 'blocked_keywords' => [], 'blocked_domains' => ['spammy.example']],
    ]]);

    $detector = app(SpamDetector::class);

    expect($detector->isSpam($team, 'Hello there', 'someone@spammy.example'))->toBeTrue();
    expect($detector->isSpam($team, 'Hello there', 'someone@legit.example'))->toBeFalse();
});

test('the spam detector does nothing when disabled', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => false, 'blocked_keywords' => ['giveaway'], 'blocked_domains' => []],
    ]]);

    expect(app(SpamDetector::class)->isSpam($team, 'giveaway giveaway giveaway'))->toBeFalse();
});

test('a new inbound email matching a spam rule creates the thread with spam status', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => true, 'blocked_keywords' => ['viagra'], 'blocked_domains' => []],
    ]]);
    Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Support Email', 'is_active' => true, 'settings' => ['support_email' => "support@{$team->slug}.gg"]]);

    $data = new EmailMessageData(
        fromEmail: 'spammer@example.com',
        fromName: 'Spammer',
        toEmail: "support@{$team->slug}.gg",
        subject: 'Cheap deals',
        textBody: 'Buy viagra online cheap!',
    );

    $thread = app(InboundEmailProcessor::class)->process($data, $team);

    expect($thread->status)->toBe(ThreadStatus::Spam);
});

test('a normal inbound email is not affected by spam filtering', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => true, 'blocked_keywords' => ['viagra'], 'blocked_domains' => []],
    ]]);
    Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Support Email', 'is_active' => true, 'settings' => ['support_email' => "support@{$team->slug}.gg"]]);

    $data = new EmailMessageData(
        fromEmail: 'customer@example.com',
        fromName: 'Real Customer',
        toEmail: "support@{$team->slug}.gg",
        subject: 'Help with my account',
        textBody: 'I cannot log in to my account.',
    );

    $thread = app(InboundEmailProcessor::class)->process($data, $team);

    expect($thread->status)->toBe(ThreadStatus::NeedsFirstResponse);
});

test('a new chat conversation matching a spam rule starts with spam status', function () {
    $team = Team::factory()->create(['settings' => [
        'spam' => ['enabled' => true, 'blocked_keywords' => ['casino bonus'], 'blocked_domains' => []],
    ]]);
    $channel = Channel::create(['team_id' => $team->id, 'type' => ChannelType::Chat, 'name' => 'Widget', 'is_active' => true, 'settings' => ['app_id' => 'app_1']]);

    $thread = app(InboundChatProcessor::class)->startConversation(
        $channel,
        'visitor-1',
        'Get your casino bonus now',
    );

    expect($thread->status)->toBe(ThreadStatus::Spam);
});

test('spam threads are excluded from the default queue size and inbox listing', function () {
    [$user, $team] = spamAgent();
    $team->update(['settings' => ['spam' => ['enabled' => true, 'blocked_keywords' => ['spamword'], 'blocked_domains' => []]]]);
    Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Support Email', 'is_active' => true, 'settings' => ['support_email' => "support@{$team->slug}.gg"]]);

    app(InboundEmailProcessor::class)->process(new EmailMessageData(
        fromEmail: 'spammer@example.com',
        fromName: 'Spammer',
        toEmail: "support@{$team->slug}.gg",
        subject: 'x',
        textBody: 'this is spamword content',
    ), $team);

    $this->actingAs($user)
        ->get('/threads')
        ->assertInertia(fn ($page) => $page->where('threads', fn ($threads) => collect($threads)->isEmpty()));
});

test('an admin can update spam settings and restore a false-positive thread', function () {
    [$user, $team] = spamAgent();
    Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Support Email', 'is_active' => true, 'settings' => ['support_email' => "support@{$team->slug}.gg"]]);

    $this->actingAs($user)
        ->patch('/settings/spam', [
            'enabled' => true,
            'blocked_keywords' => ['bad word'],
            'blocked_domains' => ['blocked.example'],
        ])
        ->assertRedirect();

    expect($team->fresh()->settings['spam'])->toBe([
        'enabled' => true,
        'blocked_keywords' => ['bad word'],
        'blocked_domains' => ['blocked.example'],
    ]);

    $thread = app(InboundEmailProcessor::class)->process(new EmailMessageData(
        fromEmail: 'oops@blocked.example',
        fromName: 'False Positive',
        toEmail: "support@{$team->slug}.gg",
        subject: 'Hi',
        textBody: 'Just a normal question, sorry for the domain match.',
    ), $team->fresh());

    expect($thread->status)->toBe(ThreadStatus::Spam);

    $this->actingAs($user)
        ->post("/settings/spam/{$thread->id}/restore")
        ->assertRedirect();

    expect($thread->fresh()->status)->toBe(ThreadStatus::NeedsFirstResponse);
});
