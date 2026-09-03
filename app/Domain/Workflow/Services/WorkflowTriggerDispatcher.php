<?php

namespace App\Domain\Workflow\Services;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Jobs\RunWorkflowsForTenant;
use App\Domain\Workflow\Jobs\RunWorkflowsForThread;
use App\Domain\Workflow\Models\Workflow;
use Illuminate\Support\Collection;

/**
 * Central entry point for firing a workflow trigger for a thread or tenant.
 * Used by model observers and any controller/service that performs an
 * action a workflow trigger should react to (labels changed, inbound
 * message, a new customer signing up, etc).
 */
class WorkflowTriggerDispatcher
{
    public function dispatch(Thread $thread, WorkflowTriggerType $trigger): void
    {
        foreach ($this->matchingWorkflowIds($thread->team_id, $trigger) as $workflowId) {
            RunWorkflowsForThread::dispatch($workflowId, $thread->id, $trigger);
        }
    }

    public function dispatchForTenant(Tenant $tenant, WorkflowTriggerType $trigger): void
    {
        foreach ($this->matchingWorkflowIds($tenant->team_id, $trigger) as $workflowId) {
            RunWorkflowsForTenant::dispatch($workflowId, $tenant->id, $trigger);
        }
    }

    /**
     * @return Collection<int, string>
     */
    private function matchingWorkflowIds(int $teamId, WorkflowTriggerType $trigger)
    {
        $team = Team::find($teamId);

        if ($team) {
            app(TeamContext::class)->set($team);
        }

        return Workflow::query()
            ->where('team_id', $teamId)
            ->where('trigger_type', $trigger)
            ->where('is_enabled', true)
            ->where('status', WorkflowStatus::Published)
            ->pluck('id');
    }
}
