<?php

use App\Domain\Support\Models\SavedView;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function workflowBehaviorAgent(array $teamSettings = [], string $role = 'admin'): array
{
    $team = Team::factory()->create(['settings' => $teamSettings]);
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => $role]);
    $user->switchTeam($team);

    return [$user, $team];
}

test('sticky assignment unassigns on snooze when configured', function () {
    [$user, $team] = workflowBehaviorAgent([
        'workflow' => ['sticky_assignment' => ['on_snooze' => 'unassign']],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Snoozed thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $user->id,
    ]);

    $thread->update(['status' => ThreadStatus::Snoozed]);

    expect($thread->refresh()->assigned_to)->toBeNull();
});

test('sticky assignment keeps assignment on done by default', function () {
    [$user, $team] = workflowBehaviorAgent();

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Done thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $user->id,
    ]);

    $thread->update(['status' => ThreadStatus::Done]);

    expect($thread->refresh()->assigned_to)->toBe($user->id);
});

test('agent going away unassigns their threads when configured', function () {
    [$user, $team] = workflowBehaviorAgent([
        'workflow' => ['away_mode' => ['unassign_on_away' => 'immediately']],
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Assigned thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $user->id,
    ]);

    $this->actingAs($user)
        ->patch('/me/away', ['is_away' => true])
        ->assertRedirect();

    expect($user->refresh()->is_away)->toBeTrue();
    expect($thread->refresh()->assigned_to)->toBeNull();
});

test('saved views can only be managed by admins when restricted', function () {
    [$owner, $team] = workflowBehaviorAgent([
        'workflow' => ['saved_views' => ['manage_permission' => 'admins']],
    ], role: 'admin');

    $member = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($member, ['role' => 'member']);
    $member->switchTeam($team);

    $this->actingAs($member)
        ->post('/saved-views', ['name' => 'My view', 'filters' => []])
        ->assertForbidden();

    $this->actingAs($owner)
        ->post('/saved-views', ['name' => 'Admin view', 'filters' => []])
        ->assertRedirect();

    expect(SavedView::where('team_id', $team->id)->count())->toBe(1);
});

test('saved views are open to everyone by default', function () {
    [$user, $team] = workflowBehaviorAgent();

    $this->actingAs($user)
        ->post('/saved-views', ['name' => 'Everyone view', 'filters' => []])
        ->assertRedirect();

    expect(SavedView::where('team_id', $team->id)->count())->toBe(1);
});

test('saved views appear in the shared sidebar stats and can be deleted', function () {
    [$user, $team] = workflowBehaviorAgent();

    $this->actingAs($user)
        ->post('/saved-views', ['name' => 'VIP customers', 'filters' => ['filter' => 'label:VIP']])
        ->assertRedirect();

    $savedView = SavedView::where('team_id', $team->id)->firstOrFail();

    $this->actingAs($user)
        ->get('/threads')
        ->assertInertia(fn ($page) => $page
            ->where('sidebarStats.savedViews.0.name', 'VIP customers')
            ->where('sidebarStats.canManageSavedViews', true));

    $this->actingAs($user)
        ->delete("/saved-views/{$savedView->id}")
        ->assertRedirect();

    expect(SavedView::where('team_id', $team->id)->count())->toBe(0);
});
