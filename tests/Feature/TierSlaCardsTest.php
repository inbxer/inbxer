<?php

use App\Domain\Label\Models\Label;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function tierSlaAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('saving a tier with SLA cards persists them as real SlaPolicy rows', function () {
    [$user, $team] = tierSlaAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);

    $this->actingAs($user)
        ->patch("/settings/tiers/{$tier->id}", [
            'name' => 'Gold',
            'external_id' => null,
            'priority' => 'normal',
            'slas' => [
                [
                    'id' => 'sla_new_1',
                    'type' => 'first_response',
                    'hours' => 0,
                    'minutes' => 30,
                    'onlyBusinessHours' => false,
                    'priorities' => ['urgent'],
                    'labels' => [],
                    'requireAllLabels' => false,
                    'notifyBeforeHours' => 0,
                    'notifyBeforeMinutes' => 5,
                    'notifyOnBreach' => true,
                ],
            ],
        ])
        ->assertRedirect();

    $policy = SlaPolicy::where('tier_id', $tier->id)->firstOrFail();
    expect($policy->type)->toBe('first_response');
    expect($policy->minutes)->toBe(30);
    expect($policy->notify_before_minutes)->toBe(5);
    expect($policy->notify_on_breach)->toBeTrue();
    expect($policy->priorities)->toBe(['urgent']);
});

test('the tiers page returns real sla cards for each tier, matching the saved policy', function () {
    [$user, $team] = tierSlaAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);
    SlaPolicy::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'type' => 'next_response',
        'minutes' => 90,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get('/settings/tiers')
        ->assertInertia(fn ($page) => $page
            ->where('tiers.0.slas.0.type', 'next_response')
            ->where('tiers.0.slas.0.hours', 1)
            ->where('tiers.0.slas.0.minutes', 30));
});

test('removing a card from the submitted set deletes its policy, and label scoping is saved', function () {
    [$user, $team] = tierSlaAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);
    $label = Label::create(['team_id' => $team->id, 'name' => 'VIP', 'color' => '#f00']);
    $existing = SlaPolicy::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'type' => 'first_response',
        'minutes' => 15,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->patch("/settings/tiers/{$tier->id}", [
            'name' => 'Gold',
            'priority' => 'normal',
            'slas' => [
                [
                    'id' => $existing->id,
                    'type' => 'first_response',
                    'hours' => 0,
                    'minutes' => 15,
                    'onlyBusinessHours' => false,
                    'priorities' => [],
                    'labels' => ['VIP'],
                    'requireAllLabels' => false,
                    'notifyBeforeHours' => 0,
                    'notifyBeforeMinutes' => 0,
                    'notifyOnBreach' => false,
                ],
            ],
        ])
        ->assertRedirect();

    expect(SlaPolicy::count())->toBe(1);
    $existing->refresh();
    expect($existing->labelIds())->toBe([$label->id]);

    // Now submit an empty set — the card should be deleted.
    $this->actingAs($user)
        ->patch("/settings/tiers/{$tier->id}", [
            'name' => 'Gold',
            'priority' => 'normal',
            'slas' => [],
        ])
        ->assertRedirect();

    expect(SlaPolicy::count())->toBe(0);
});

test('a first-response sla card configured on a tier actually breaches for real threads', function () {
    [, $team] = tierSlaAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);
    SlaPolicy::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'type' => 'first_response',
        'minutes' => 30,
        'is_active' => true,
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'title' => 'Overdue',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->forceFill(['created_at' => now()->subMinutes(45)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    expect($thread->fresh()->sla_first_response_breached_at)->not->toBeNull();
});

test('a next-response sla card breaches based on time waiting in needs_next_response', function () {
    [, $team] = tierSlaAgent();
    $tier = Tier::create([
        'team_id' => $team->id,
        'name' => 'Gold',
        'color' => '#fbbf24',
        'default_priority' => ThreadPriority::Normal,
        'position' => 0,
        'is_default' => false,
    ]);
    SlaPolicy::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'type' => 'next_response',
        'minutes' => 20,
        'is_active' => true,
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'tier_id' => $tier->id,
        'title' => 'Waiting on agent',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->update(['status' => ThreadStatus::NeedsNextResponse]);
    $thread->forceFill(['status_changed_at' => now()->subMinutes(30)])->save();

    $this->artisan('inbxer:check-sla-breaches')->assertSuccessful();

    expect($thread->fresh()->sla_next_response_breached_at)->not->toBeNull();
});
