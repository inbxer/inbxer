<?php

use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it moves stale waiting-for-customer threads to done when configured', function () {
    $team = Team::factory()->create([
        'settings' => ['workflow' => ['status' => ['move_waiting_to_done_after' => '1h']]],
    ]);

    $staleThread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Stale thread',
        'status' => ThreadStatus::WaitingForCustomer,
    ]);
    $staleThread->forceFill(['status_changed_at' => now()->subHours(2)])->save();

    $freshThread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Fresh thread',
        'status' => ThreadStatus::WaitingForCustomer,
    ]);
    $freshThread->forceFill(['status_changed_at' => now()->subMinutes(10)])->save();

    $this->artisan('inbxer:auto-close-waiting-threads')->assertSuccessful();

    expect($staleThread->refresh()->status)->toBe(ThreadStatus::Done);
    expect($freshThread->refresh()->status)->toBe(ThreadStatus::WaitingForCustomer);
    expect($staleThread->timelineEntries()->where('metadata->reason', 'auto_close_waiting')->exists())->toBeTrue();
});

test('it skips teams without the setting configured', function () {
    $team = Team::factory()->create();

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Untouched thread',
        'status' => ThreadStatus::WaitingForCustomer,
    ]);
    $thread->forceFill(['status_changed_at' => now()->subDays(5)])->save();

    $this->artisan('inbxer:auto-close-waiting-threads')->assertSuccessful();

    expect($thread->refresh()->status)->toBe(ThreadStatus::WaitingForCustomer);
});
