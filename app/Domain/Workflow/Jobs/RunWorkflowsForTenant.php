<?php

namespace App\Domain\Workflow\Jobs;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Services\WorkflowEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunWorkflowsForTenant implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $workflowId,
        public readonly string $tenantId,
        public readonly WorkflowTriggerType $trigger,
    ) {}

    public function handle(WorkflowEngine $engine): void
    {
        $workflow = Workflow::find($this->workflowId);
        $tenant = Tenant::find($this->tenantId);

        if (! $workflow || ! $tenant || ! $workflow->canExecute()) {
            return;
        }

        $engine->runForTenant($workflow, $tenant, $this->trigger);
    }
}
