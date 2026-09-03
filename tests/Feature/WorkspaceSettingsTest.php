<?php

use App\Domain\Team\Enums\TeamPermission;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Team;
use App\Domain\Team\Models\TeamInvitation;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function workspaceSettingsAgent(string $role = 'admin'): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => $role]);
    $user->switchTeam($team);

    return [$user, $team];
}

test('support role can message customers but viewer role cannot', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');
    $supportAgent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($supportAgent, ['role' => 'support']);
    $supportAgent->switchTeam($team);
    $viewerAgent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($viewerAgent, ['role' => 'viewer']);
    $viewerAgent->switchTeam($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Customer issue',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($supportAgent)
        ->post("/threads/{$thread->id}/reply", [
            'body' => 'We are on it',
            'is_internal' => false,
        ])
        ->assertRedirect();

    expect($thread->timelineEntries()->where('is_internal', false)->count())->toBe(1);

    $this->actingAs($viewerAgent)
        ->post("/threads/{$thread->id}/reply", [
            'body' => 'Trying to reply anyway',
            'is_internal' => false,
        ])
        ->assertForbidden();

    expect($thread->timelineEntries()->where('is_internal', false)->count())->toBe(1);
});

test('viewer role can still participate in internal discussions', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');
    $viewerAgent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($viewerAgent, ['role' => 'viewer']);
    $viewerAgent->switchTeam($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Internal discussion',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($viewerAgent)
        ->post("/threads/{$thread->id}/reply", [
            'body' => 'Internal note from viewer',
            'is_internal' => true,
        ])
        ->assertRedirect();

    expect($thread->timelineEntries()->where('is_internal', true)->count())->toBe(1);
});

test('the legacy member role keeps its pre-existing ability to message customers', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');
    $legacyMember = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($legacyMember, ['role' => 'member']);
    $legacyMember->switchTeam($team);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Legacy member reply',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $this->actingAs($legacyMember)
        ->post("/threads/{$thread->id}/reply", [
            'body' => 'Still works',
            'is_internal' => false,
        ])
        ->assertRedirect();

    expect($thread->timelineEntries()->where('is_internal', false)->count())->toBe(1);
});

test('role permissions match the roles settings page description exactly', function () {
    expect(TeamRole::Owner->hasPermission(TeamPermission::DeleteTeam))->toBeTrue();

    expect(TeamRole::Admin->hasPermission(TeamPermission::DeleteTeam))->toBeFalse();
    expect(TeamRole::Admin->hasPermission(TeamPermission::ManageApiKeys))->toBeTrue();

    expect(TeamRole::Support->hasPermission(TeamPermission::MessageCustomers))->toBeTrue();

    expect(TeamRole::Viewer->hasPermission(TeamPermission::MessageCustomers))->toBeFalse();
    expect(TeamRole::Viewer->hasPermission(TeamPermission::ViewSupportRequests))->toBeTrue();
    expect(TeamRole::Viewer->hasPermission(TeamPermission::ParticipateInternalDiscussions))->toBeTrue();
});

test('the roles settings page lists owner, admin, support, and viewer with real permissions', function () {
    [$user, $team] = workspaceSettingsAgent('owner');

    $this->actingAs($user)
        ->get('/settings/roles')
        ->assertInertia(fn ($page) => $page
            ->has('roles', 4)
            ->where('roles.0.value', 'owner')
            ->where('roles.2.value', 'support')
            ->where('roles.2.description', 'Can message customers and use all app features.')
            ->where('roles.3.value', 'viewer'));
});

test('the members settings page reports real stats split by role', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');
    $admin = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($admin, ['role' => 'admin']);
    $support = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($support, ['role' => 'support']);
    $viewer = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($viewer, ['role' => 'viewer']);

    $this->actingAs($owner)
        ->get('/settings/members')
        ->assertInertia(fn ($page) => $page
            ->where('stats.owners_and_admins', 2)
            ->where('stats.support', 1)
            ->where('stats.viewers', 1)
            ->has('activeMembers', 4));
});

test('the members settings page separates pending invitations from expired ones', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');

    TeamInvitation::create([
        'team_id' => $team->id,
        'email' => 'pending@example.com',
        'role' => TeamRole::Support,
        'invited_by' => $owner->id,
        'expires_at' => now()->addDays(7),
    ]);
    TeamInvitation::create([
        'team_id' => $team->id,
        'email' => 'expired@example.com',
        'role' => TeamRole::Viewer,
        'invited_by' => $owner->id,
        'expires_at' => now()->subDay(),
    ]);

    $this->actingAs($owner)
        ->get('/settings/members')
        ->assertInertia(fn ($page) => $page
            ->where('invitedMembers.0.email', 'pending@example.com')
            ->where('otherMembers.0.email', 'expired@example.com'));
});

test('general settings page saves public name, internal name, and domains', function () {
    [$owner, $team] = workspaceSettingsAgent('owner');

    $this->actingAs($owner)
        ->patch('/settings/general', [
            'name' => 'Acme Support',
            'internal_name' => 'Acme Internal',
            'domains' => ['acme.com', 'acme.io'],
        ])
        ->assertRedirect();

    $team->refresh();
    expect($team->name)->toBe('Acme Support');
    expect($team->internal_name)->toBe('Acme Internal');
    expect($team->settings['domains'])->toEqualCanonicalizing(['acme.com', 'acme.io']);
});

test('non-owners without UpdateTeam permission cannot save general settings', function () {
    [$viewer, $team] = workspaceSettingsAgent('viewer');

    $this->actingAs($viewer)
        ->patch('/settings/general', [
            'name' => 'Hijacked name',
        ])
        ->assertForbidden();

    expect($team->fresh()->name)->not->toBe('Hijacked name');
});

test('a workspace logo can be uploaded and replaces the previous one', function () {
    Storage::fake('public');
    [$owner, $team] = workspaceSettingsAgent('owner');

    $this->actingAs($owner)
        ->post('/settings/general/logo', [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ])
        ->assertRedirect();

    $team->refresh();
    expect($team->logoUrl())->not->toBeNull();
    expect($team->getMedia('logo'))->toHaveCount(1);

    $this->actingAs($owner)
        ->post('/settings/general/logo', [
            'logo' => UploadedFile::fake()->image('logo-2.png'),
        ])
        ->assertRedirect();

    expect($team->fresh()->getMedia('logo'))->toHaveCount(1);
});
