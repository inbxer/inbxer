<?php

use App\Domain\Support\Jobs\SendCsatSurveyJob;
use App\Domain\Support\Mail\CsatSurveyMailable;
use App\Domain\Support\Models\CsatSurvey;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function csatAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

function csatEnabledTeam(): Team
{
    $team = Team::factory()->create();
    $team->update(['settings' => ['csat' => ['enabled' => true, 'message' => 'How did we do?', 'delay_minutes' => 0]]]);

    return $team;
}

test('marking a thread done queues a csat survey job', function () {
    Queue::fake([SendCsatSurveyJob::class]);
    $team = csatEnabledTeam();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->update(['status' => ThreadStatus::Done]);

    Queue::assertPushed(SendCsatSurveyJob::class, fn ($job) => $job->threadId === $thread->id);
});

test('changing a thread to a non-done status does not queue a survey', function () {
    Queue::fake([SendCsatSurveyJob::class]);
    $team = csatEnabledTeam();
    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Help please',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $thread->update(['status' => ThreadStatus::NeedsNextResponse]);

    Queue::assertNotPushed(SendCsatSurveyJob::class);
});

test('the survey job creates a survey and sends the mailable when csat is enabled', function () {
    Mail::fake();
    $team = csatEnabledTeam();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);

    (new SendCsatSurveyJob($thread->id))->handle();

    $survey = CsatSurvey::where('thread_id', $thread->id)->first();
    expect($survey)->not->toBeNull();
    Mail::assertSent(CsatSurveyMailable::class, fn ($mail) => $mail->survey->id === $survey->id);
});

test('the survey job does nothing when csat is disabled for the team', function () {
    Mail::fake();
    $team = Team::factory()->create();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);

    (new SendCsatSurveyJob($thread->id))->handle();

    expect(CsatSurvey::where('thread_id', $thread->id)->exists())->toBeFalse();
    Mail::assertNothingSent();
});

test('the survey job is idempotent and never creates a second survey for the same thread', function () {
    Mail::fake();
    $team = csatEnabledTeam();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);

    (new SendCsatSurveyJob($thread->id))->handle();
    (new SendCsatSurveyJob($thread->id))->handle();

    expect(CsatSurvey::where('thread_id', $thread->id)->count())->toBe(1);
});

test('a customer can view and answer the public survey without logging in', function () {
    $team = csatEnabledTeam();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);
    $survey = CsatSurvey::create([
        'team_id' => $team->id,
        'thread_id' => $thread->id,
        'tenant_id' => $tenant->id,
        'sent_at' => now(),
    ]);

    $this->get("/csat/{$survey->token}")->assertOk();

    $this->post("/csat/{$survey->token}", [
        'rating' => 5,
        'comment' => 'Great support!',
    ])->assertRedirect();

    $survey->refresh();
    expect($survey->rating)->toBe(5);
    expect($survey->comment)->toBe('Great support!');
    expect($survey->responded_at)->not->toBeNull();
    expect($survey->isPositive())->toBeTrue();
});

test('clicking a star rating link in the email quick-records the rating', function () {
    $team = csatEnabledTeam();
    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);
    $survey = CsatSurvey::create([
        'team_id' => $team->id,
        'thread_id' => $thread->id,
        'sent_at' => now(),
    ]);

    $this->get("/csat/{$survey->token}?rating=2")->assertOk();

    expect($survey->fresh()->rating)->toBe(2);
    expect($survey->fresh()->isPositive())->toBeFalse();
});

test('a team admin can update csat settings', function () {
    [$user, $team] = csatAgent();

    $this->actingAs($user)
        ->patch('/settings/csat', [
            'enabled' => true,
            'message' => 'Rate us please',
            'delay_minutes' => 15,
        ])
        ->assertRedirect();

    expect($team->fresh()->settings['csat'])->toBe([
        'enabled' => true,
        'message' => 'Rate us please',
        'delay_minutes' => 15,
    ]);
});

test('the csat settings page shows real recent responses and stats', function () {
    [$user, $team] = csatAgent();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    $thread = Thread::create([
        'team_id' => $team->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help please',
        'status' => ThreadStatus::Done,
        'priority' => ThreadPriority::Normal,
    ]);
    CsatSurvey::create([
        'team_id' => $team->id,
        'thread_id' => $thread->id,
        'tenant_id' => $tenant->id,
        'rating' => 5,
        'responded_at' => now(),
    ]);

    $this->actingAs($user)
        ->get('/settings/csat')
        ->assertInertia(fn ($page) => $page
            ->where('stats.total_responded', 1)
            ->where('stats.positive_percentage', 100)
            ->where('recentResponses.0.tenant_name', 'Cust'));
});
