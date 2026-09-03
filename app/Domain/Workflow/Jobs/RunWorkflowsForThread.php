<?php

namespace App\Domain\Workflow\Jobs;

use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Services\WorkflowEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunWorkflowsForThread implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $workflowId,
        public readonly string $threadId,
        public readonly WorkflowTriggerType $trigger,
    ) {}

    public function handle(WorkflowEngine $engine): void
    {
        $workflow = Workflow::find($this->workflowId);
        $thread = Thread::find($this->threadId);

        if (! $workflow || ! $thread || ! $workflow->canExecute()) {
            return;
        }

        $engine->run($workflow, $thread, $this->trigger);
    }
}
