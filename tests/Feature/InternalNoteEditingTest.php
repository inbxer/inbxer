<?php

use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('agent can update an internal note and previous version is recorded in edit history', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);

    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Test Thread for Note Editing',
        'status' => ThreadStatus::Open,
    ]);

    $entry = ThreadTimelineEntry::create([
        'thread_id' => $thread->id,
        'actor_type' => ActorType::User,
        'actor_id' => (string) $user->id,
        'entry_type' => TimelineEntryType::Note,
        'body' => 'Initial internal note body text.',
        'is_internal' => true,
    ]);

    $response = $this->actingAs($user)
        ->patch("/threads/{$thread->id}/timeline/{$entry->id}", [
            'body' => 'Updated internal note text.',
        ]);

    $response->assertRedirect();

    $entry->refresh();

    expect($entry->body)->toBe('Updated internal note text.');
    expect($entry->metadata['is_edited'])->toBeTrue();
    expect($entry->metadata['edit_history'])->toBeArray()->toHaveCount(1);
    expect($entry->metadata['edit_history'][0]['body'])->toBe('Initial internal note body text.');
    expect($entry->metadata['edit_history'][0]['edited_by_name'])->toBe($user->name);
});
