<?php

namespace App\Domain\Workflow\Services;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowRunStatus;
use App\Domain\Workflow\Enums\WorkflowStepType;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowRun;
use App\Domain\Workflow\Models\WorkflowStep;
use Illuminate\Support\Collection;

/**
 * Runs a published workflow against a thread (or, for thread-less triggers
 * like "Customer Created", against a tenant): walks the step tree in order,
 * evaluates condition branches, executes actions, and records a full audit
 * trail via WorkflowRun/WorkflowRunLog.
 */
class WorkflowEngine
{
    public function __construct(
        private readonly WorkflowConditionEvaluator $conditions,
        private readonly WorkflowActionExecutor $actions,
    ) {}

    public function run(Workflow $workflow, Thread $thread, WorkflowTriggerType $trigger): WorkflowRun
    {
        return $this->execute($workflow, $thread, null);
    }

    /**
     * Run a workflow for a trigger that has no associated thread (e.g. a
     * newly created customer). Actions that require a thread are skipped.
     */
    public function runForTenant(Workflow $workflow, Tenant $tenant, WorkflowTriggerType $trigger): WorkflowRun
    {
        return $this->execute($workflow, null, $tenant);
    }

    private function execute(Workflow $workflow, ?Thread $thread, ?Tenant $tenant): WorkflowRun
    {
        $run = WorkflowRun::create([
            'workflow_id' => $workflow->id,
            'thread_id' => $thread?->id,
            'tenant_id' => ($thread ? $thread->tenant_id : null) ?? $tenant?->id,
            'status' => WorkflowRunStatus::Running,
            'started_at' => now(),
        ]);

        try {
            $this->executeSteps($workflow->rootSteps, $thread, $tenant, $run);
            $run->update([
                'status' => WorkflowRunStatus::Completed,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            $run->update([
                'status' => WorkflowRunStatus::Failed,
                'completed_at' => now(),
                'error_message' => $exception->getMessage(),
            ]);
        }

        $workflow->update(['last_triggered_at' => now()]);

        return $run;
    }

    /**
     * @param  Collection<int, WorkflowStep>  $steps
     */
    private function executeSteps(Collection $steps, ?Thread $thread, ?Tenant $tenant, WorkflowRun $run): void
    {
        foreach ($steps as $step) {
            if ($step->type === WorkflowStepType::Trigger) {
                continue;
            }

            if ($step->type === WorkflowStepType::Condition) {
                $matched = $this->conditions->evaluate($step->config, $thread, $tenant);
                $branch = $matched ? 'if' : 'else';

                $run->logs()->create([
                    'step_id' => $step->id,
                    'status' => WorkflowRunStatus::Completed,
                    'input' => $step->config,
                    'output' => ['matched' => $matched, 'branch' => $branch],
                    'executed_at' => now(),
                ]);

                $this->executeSteps(
                    $step->children->where('branch', $branch)->sortBy('position'),
                    $thread,
                    $tenant,
                    $run,
                );

                continue;
            }

            $output = $this->actions->execute($step->action_type, $step->config, $thread, $tenant);

            $run->logs()->create([
                'step_id' => $step->id,
                'status' => WorkflowRunStatus::Completed,
                'input' => $step->config,
                'output' => $output,
                'executed_at' => now(),
            ]);
        }
    }
}
