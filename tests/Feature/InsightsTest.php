<?php

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function insightsAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('the reporting overview computes real median first response and resolution times', function () {
    [$user, $team] = insightsAgent();

    $fast = Thread::create([
        'team_id' => $team->id,
        'title' => 'Fast thread',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);
    $fast->forceFill([
        'created_at' => now()->subHours(2),
        'first_response_at' => now()->subHours(2)->addMinutes(10),
        'resolved_at' => now()->subHours(2)->addHour(),
    ])->save();

    $slow = Thread::create([
        'team_id' => $team->id,
        'title' => 'Slow thread',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);
    $slow->forceFill([
        'created_at' => now()->subHours(3),
        'first_response_at' => now()->subHours(3)->addMinutes(30),
        'resolved_at' => now()->subHours(3)->addHours(2),
    ])->save();

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(fn ($page) => $page
            ->where('overview.new_threads', 2)
            ->where('overview.median_first_response_seconds', 1200)
            ->where('overview.median_resolution_seconds', 5400));
});

test('the team breakdown groups thread volume and response times by assignee', function () {
    [$user, $team] = insightsAgent();
    $agent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($agent, ['role' => 'member']);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Assigned thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
        'assigned_to' => $agent->id,
    ]);
    $thread->forceFill([
        'first_response_at' => $thread->created_at->addMinutes(5),
    ])->save();

    $this->actingAs($user)
        ->get('/insights/team')
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.label', $agent->name)
            ->where('rows.0.volume', 1)
            ->where('rows.0.first_response_seconds', 300));
});

test('the priorities breakdown always covers every thread even without other dimensions set', function () {
    [$user, $team] = insightsAgent();

    Thread::create([
        'team_id' => $team->id,
        'title' => 'Urgent thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Urgent,
    ]);

    $this->actingAs($user)
        ->get('/insights/priorities')
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.label', 'Urgent')
            ->where('rows.0.volume', 1));
});

test('the channels breakdown groups by the thread\'s channel', function () {
    [$user, $team] = insightsAgent();
    $channel = Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Slack,
        'name' => 'Support Slack',
        'is_active' => true,
        'settings' => [],
    ]);

    Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'title' => 'Slack thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->get('/insights/channels')
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.label', 'Support Slack')
            ->where('rows.0.volume', 1));
});

test('the tiers breakdown groups untiered threads under "No tier"', function () {
    [$user, $team] = insightsAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);

    Thread::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'title' => 'Gold thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    Thread::create([
        'team_id' => $team->id,
        'title' => 'Untiered thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($user)
        ->get('/insights/tiers')
        ->assertInertia(fn ($page) => $page
            ->has('rows', 2)
            ->where('rows.0.label', 'Gold')
            ->where('rows.1.label', 'No tier'));
});

test('top issues ranks labels by thread volume in the period', function () {
    [$user, $team] = insightsAgent();
    $urgentLabel = Label::create(['team_id' => $team->id, 'name' => 'Bug', 'color' => '#ef4444']);
    $minorLabel = Label::create(['team_id' => $team->id, 'name' => 'Question', 'color' => '#60a5fa']);

    $t1 = Thread::create([
        'team_id' => $team->id,
        'title' => 'Bug report 1',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $t2 = Thread::create([
        'team_id' => $team->id,
        'title' => 'Bug report 2',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $t3 = Thread::create([
        'team_id' => $team->id,
        'title' => 'A question',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $t1->labels()->attach($urgentLabel);
    $t2->labels()->attach($urgentLabel);
    $t3->labels()->attach($minorLabel);

    $this->actingAs($user)
        ->get('/insights/top-issues')
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.label', 'Bug')
            ->where('rows.0.volume', 2)
            ->where('rows.1.label', 'Question')
            ->where('rows.1.volume', 1));
});

test('the overview daily series count new threads on the correct day and total volume', function () {
    [$user, $team] = insightsAgent();

    $t1 = Thread::create(['team_id' => $team->id, 'title' => 'A', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $t1->forceFill(['created_at' => now()->subDays(2)])->save();
    $t2 = Thread::create(['team_id' => $team->id, 'title' => 'B', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $t2->forceFill(['created_at' => now()->subDays(2)])->save();
    $t3 = Thread::create(['team_id' => $team->id, 'title' => 'C', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $t3->forceFill(['created_at' => now()->subDay()])->save();

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(function ($page) {
            $page->where('overview.new_threads', 3);
            $series = collect($page->toArray()['props']['overview']['new_threads_per_day']);
            $twoDaysAgo = $series->firstWhere('date', now()->subDays(2)->toDateString());
            $oneDayAgo = $series->firstWhere('date', now()->subDay()->toDateString());
            expect($twoDaysAgo['count'])->toBe(2);
            expect($oneDayAgo['count'])->toBe(1);

            return $page;
        });
});

test('threads moved to done and re-opened are counted from real status-change timeline events', function () {
    [$user, $team] = insightsAgent();

    $thread = Thread::create(['team_id' => $team->id, 'title' => 'A', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $thread->timelineEntries()->create([
        'actor_type' => ActorType::User,
        'entry_type' => TimelineEntryType::StatusChange,
        'is_internal' => true,
        'metadata' => ['from' => 'needs_first_response', 'to' => 'done'],
    ]);
    $thread->timelineEntries()->create([
        'actor_type' => ActorType::User,
        'entry_type' => TimelineEntryType::StatusChange,
        'is_internal' => true,
        'metadata' => ['from' => 'done', 'to' => 'needs_next_response'],
    ]);

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(function ($page) {
            $doneTotal = collect($page->toArray()['props']['overview']['done_per_day'])->sum('count');
            $reopenedTotal = collect($page->toArray()['props']['overview']['reopened_per_day'])->sum('count');
            expect($doneTotal)->toBe(1);
            expect($reopenedTotal)->toBe(1);

            return $page;
        });
});

test('the heatmap buckets thread creation into 7x24 real cells', function () {
    [$user, $team] = insightsAgent();

    $thread = Thread::create(['team_id' => $team->id, 'title' => 'A', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $created = now()->startOfWeek()->addHours(9);
    $thread->forceFill(['created_at' => $created])->save();

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(function ($page) use ($created) {
            $cells = collect($page->toArray()['props']['overview']['heatmap']);
            expect($cells)->toHaveCount(7 * 24);
            $cell = $cells->first(fn ($c) => $c['day'] === $created->dayOfWeekIso && $c['hour'] === $created->hour);
            expect($cell['count'])->toBe(1);

            return $page;
        });
});

test('sla compliance is N/A when no active policy exists, and computed correctly when one does', function () {
    [$user, $team] = insightsAgent();

    $thread = Thread::create(['team_id' => $team->id, 'title' => 'A', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $thread->forceFill([
        'created_at' => now()->subHour(),
        'first_response_at' => now()->subHour()->addMinutes(10),
    ])->save();

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(fn ($page) => $page->where('overview.sla_compliance_first_response', null));

    SlaPolicy::create([
        'team_id' => $team->id,
        'type' => 'first_response',
        'minutes' => 30,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(fn ($page) => $page->where('overview.sla_compliance_first_response', 100));
});

test('breached threads only lists unresolved threads with a real breach timestamp', function () {
    [$user, $team] = insightsAgent();

    $breached = Thread::create(['team_id' => $team->id, 'title' => 'Breached', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);
    $breached->forceFill(['sla_first_response_breached_at' => now()])->save();

    $resolvedButBreached = Thread::create(['team_id' => $team->id, 'title' => 'Resolved anyway', 'status' => ThreadStatus::Done, 'priority' => ThreadPriority::Normal]);
    $resolvedButBreached->forceFill(['sla_first_response_breached_at' => now()])->save();

    Thread::create(['team_id' => $team->id, 'title' => 'Healthy', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal]);

    $this->actingAs($user)
        ->get('/insights')
        ->assertInertia(function ($page) use ($breached) {
            $rows = collect($page->toArray()['props']['overview']['breached_threads']);
            expect($rows)->toHaveCount(1);
            expect($rows->first()['id'])->toBe($breached->id);

            return $page;
        });
});

test('next response time is the real gap between an agent\'s first two replies on a thread', function () {
    [$user, $team] = insightsAgent();
    $agent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($agent, ['role' => 'member']);

    $thread = Thread::create(['team_id' => $team->id, 'title' => 'A', 'status' => ThreadStatus::NeedsFirstResponse, 'priority' => ThreadPriority::Normal, 'assigned_to' => $agent->id]);
    $first = $thread->timelineEntries()->create([
        'actor_type' => ActorType::User,
        'actor_id' => (string) $agent->id,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Hi',
    ]);
    $first->forceFill(['created_at' => now()->subHour()])->save();
    $second = $thread->timelineEntries()->create([
        'actor_type' => ActorType::User,
        'actor_id' => (string) $agent->id,
        'entry_type' => TimelineEntryType::Message,
        'is_internal' => false,
        'body' => 'Following up',
    ]);
    $second->forceFill(['created_at' => now()->subHour()->addMinutes(20)])->save();

    $this->actingAs($user)
        ->get('/insights/team')
        ->assertInertia(fn ($page) => $page->where('rows.0.next_response_seconds', 1200));
});
