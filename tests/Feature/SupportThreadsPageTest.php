<?php

use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function threadsPageAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('guests cannot open the support threads workspace', function () {
    $team = Team::factory()->create();

    $this->get('/threads')
        ->assertRedirect(route('login'));
});

test('agent can open the threads workspace with its display data', function () {
    [$user, $team] = threadsPageAgent();

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Customer cannot access billing',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $user->id,
    ]);

    $this->actingAs($user)
        ->get("/threads?thread={$thread->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('support/threads')
            ->where('filter', 'all')
            ->has('threads', 1)
            ->where('threads.0.id', $thread->id)
            ->where('threads.0.title', 'Customer cannot access billing')
            ->where('selectedThread.id', $thread->id)
            ->has('teamMembers', 1)
            ->has('availableLabels')
            ->has('availableTiers')
            ->has('availableCompanies')
            ->has('availableTenants'));
});

test('thread queue routes resolve to the expected filter', function (string $path, string $filter) {
    [$user, $team] = threadsPageAgent();

    $this->actingAs($user)
        ->get($path)
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('support/threads')
            ->where('filter', $filter));
})->with([
    'all threads' => ['/threads/all', 'all'],
    'my threads' => ['/threads/yours', 'my_threads'],
    'unassigned threads' => ['/threads/unassigned', 'unassigned'],
    'saved views' => ['/threads/views', 'views'],
]);

test('filtering by a specific assignee only returns their threads', function () {
    [$user, $team] = threadsPageAgent();
    $otherAgent = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($otherAgent, ['role' => 'admin']);

    $mine = Thread::create([
        'team_id' => $team->id,
        'title' => 'Assigned to me',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $user->id,
    ]);
    Thread::create([
        'team_id' => $team->id,
        'title' => 'Assigned to someone else',
        'status' => ThreadStatus::NeedsFirstResponse,
        'assigned_to' => $otherAgent->id,
    ]);

    $this->actingAs($user)
        ->get("/threads?filter=user:{$user->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('support/threads')
            ->where('filter', "user:{$user->id}")
            ->has('threads', 1)
            ->where('threads.0.id', $mine->id));
});
