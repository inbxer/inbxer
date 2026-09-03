<?php

use App\Domain\Channel\DTOs\EmailMessageData;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Services\InboundEmailProcessor;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Customer;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

test('inbound email processor creates customer and new thread if none exists', function () {
    $team = Team::factory()->create();

    $emailData = new EmailMessageData(
        fromEmail: 'alice@company.com',
        fromName: 'Alice Smith',
        toEmail: "support@{$team->slug}.gg",
        subject: 'Cannot access API endpoint',
        textBody: 'Hello, I am getting a 403 error when calling /api/v1/threads.',
        htmlBody: '<p>Hello, I am getting a 403 error when calling /api/v1/threads.</p>',
        messageId: '<msg-101@company.com>',
    );

    /** @var InboundEmailProcessor $processor */
    $processor = app(InboundEmailProcessor::class);
    $thread = $processor->process($emailData, $team);

    expect($thread)->not->toBeNull();
    expect($thread->title)->toBe('Cannot access API endpoint');
    expect($thread->status)->toBe(ThreadStatus::NeedsFirstResponse);

    $customer = Customer::where('email', 'alice@company.com')->first();
    expect($customer)->not->toBeNull();
    expect($customer->name)->toBe('Alice Smith');

    expect($thread->timelineEntries)->toHaveCount(1);
    expect($thread->timelineEntries->first()->body)->toContain('403 error');
});

test('inbound email processor matches existing thread via subject tag', function () {
    $team = Team::factory()->create();

    $tenant = Tenant::create([
        'team_id' => $team->id,
        'name' => 'Bob Corp',
        'email' => 'bob@corp.com',
    ]);

    $existingThread = Thread::create([
        'team_id' => $team->id,
        'sequence_number' => 105,
        'tenant_id' => $tenant->id,
        'title' => 'Billing Inquiry',
        'status' => ThreadStatus::Done,
    ]);

    $emailData = new EmailMessageData(
        fromEmail: 'bob@corp.com',
        fromName: 'Bob Corp',
        toEmail: "support@{$team->slug}.gg",
        subject: 'Re: Billing Inquiry [#TH-105]',
        textBody: 'I have a follow-up question regarding invoice #1002.',
    );

    /** @var InboundEmailProcessor $processor */
    $processor = app(InboundEmailProcessor::class);
    $updatedThread = $processor->process($emailData, $team);

    expect($updatedThread->id)->toBe($existingThread->id);
    expect($updatedThread->status)->toBe(ThreadStatus::NeedsFirstResponse);
    expect($updatedThread->timelineEntries)->toHaveCount(1);
});

test('inbound email webhook endpoint processes email payload', function () {
    $team = Team::factory()->create();

    $response = $this->postJson('/api/v1/webhooks/email/inbound', [
        'From' => 'charlie@dev.io',
        'FromName' => 'Charlie Dev',
        'To' => 'support@zad.gg',
        'Subject' => 'Feature Request: Webhooks',
        'TextBody' => 'Please add webhooks for custom events.',
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('success', true);

    $this->assertDatabaseHas('customers', [
        'email' => 'charlie@dev.io',
    ]);
});

test('inbound email processor dynamically resolves correct team from recipient email', function () {
    $teamA = Team::factory()->create(['slug' => 'acme-corp']);
    $teamB = Team::factory()->create(['slug' => 'stark-industries']);

    $emailData = new EmailMessageData(
        fromEmail: 'client@external.com',
        fromName: 'External Client',
        toEmail: 'inbound-stark-industries@ieentiadre.resend.app',
        subject: 'Hardware Repair Needed',
        textBody: 'Need repair for Mark 85 armor.',
    );

    /** @var InboundEmailProcessor $processor */
    $processor = app(InboundEmailProcessor::class);
    $thread = $processor->process($emailData);

    expect($thread->team_id)->toBe($teamB->id);
    expect($thread->team_id)->not->toBe($teamA->id);
});

test('agent posting external reply dispatches outbound email job', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);

    $user = User::factory()->create();
    $team = Team::factory()->create();
    $user->teams()->attach($team, ['role' => 'owner']);
    $user->switchTeam($team);

    $tenant = Tenant::create([
        'team_id' => $team->id,
        'name' => 'Dave Client',
        'email' => 'dave@client.com',
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'sequence_number' => 200,
        'tenant_id' => $tenant->id,
        'title' => 'Urgent Issue',
        'status' => ThreadStatus::NeedsFirstResponse,
    ]);

    $response = $this->actingAs($user)->post("/threads/{$thread->id}/reply", [
        'body' => 'Here is the fix for your issue.',
        'is_internal' => false,
    ]);

    if ($response->status() !== 302) {
        dump($response->status(), $response->content());
    }

    $response->assertRedirect();

    Queue::assertPushed(SendOutboundEmailReplyJob::class);
});
