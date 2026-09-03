<?php

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Models\Channel;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowRunStatus;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowRun;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

test('the assign_to_ai workflow action hands the thread to the AI Agent', function () {
    Queue::fake([SendOutboundEmailReplyJob::class]);
    SupportReplyAgent::fake(['Here is your answer.']);

    $team = Team::factory()->create();
    $channel = Channel::create([
        'team_id' => $team->id,
        'type' => ChannelType::Email,
        'name' => 'Support inbox',
        'is_active' => true,
        'settings' => [],
    ]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'live']);

    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Hand off to AI',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::ThreadCreated,
        'is_enabled' => true,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'assign_to_ai',
        'config' => [],
        'position' => 0,
    ]);

    $thread = Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Need help',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    $log = AiActivityLogEntry::where('thread_id', $thread->id)->first();

    expect($log)->not->toBeNull();
    expect($log->status)->toBe(AiActivityStatus::PendingReview);
    expect($log->generated_reply)->toBe('Here is your answer.');
});

test('assign_to_ai is safely skipped when a workflow runs without a thread', function () {
    $team = Team::factory()->create();

    $workflow = Workflow::create([
        'team_id' => $team->id,
        'name' => 'Thread-less handoff',
        'status' => WorkflowStatus::Published,
        'trigger_type' => WorkflowTriggerType::CustomerCreated,
        'is_enabled' => true,
    ]);

    $workflow->steps()->create([
        'type' => 'action',
        'action_type' => 'assign_to_ai',
        'config' => [],
        'position' => 0,
    ]);

    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'New Customer', 'email' => 'new@example.com']);

    $run = WorkflowRun::where('tenant_id', $tenant->id)->firstOrFail();

    expect($run->status)->toBe(WorkflowRunStatus::Completed);
    expect($run->logs()->first()->output['skipped'])->toBeTrue();
});
