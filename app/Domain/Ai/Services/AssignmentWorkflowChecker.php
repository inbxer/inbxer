<?php

namespace App\Domain\Ai\Services;

use App\Domain\Team\Models\Team;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowStep;
use Illuminate\Support\Collection;

/**
 * Determines whether a team has a real, enabled workflow that hands threads
 * off to the AI Agent (an `assign_to_ai` action step, anywhere in the
 * workflow's step tree — including nested inside if/else branches).
 */
class AssignmentWorkflowChecker
{
    private const ACTION_TYPE = 'assign_to_ai';

    /**
     * Whether the team has at least one enabled workflow containing an
     * `assign_to_ai` action step.
     */
    public function hasAssignmentWorkflow(Team $team): bool
    {
        return $this->findAssignmentWorkflows($team)->isNotEmpty();
    }

    /**
     * The team's enabled workflows that contain an `assign_to_ai` action
     * step anywhere in their step tree.
     *
     * @return Collection<int, Workflow>
     */
    public function findAssignmentWorkflows(Team $team): Collection
    {
        return Workflow::where('team_id', $team->id)
            ->where('is_enabled', true)
            ->with('steps')
            ->get()
            ->filter(fn (Workflow $workflow) => $this->treeContainsAssignToAi($workflow->steps))
            ->values();
    }

    /**
     * Recursively scan a flat collection of workflow steps (which form a
     * tree via parent_step_id) for an `assign_to_ai` action step.
     *
     * @param  Collection<int, WorkflowStep>  $steps
     */
    private function treeContainsAssignToAi(Collection $steps): bool
    {
        return $steps->contains(fn ($step) => $step->action_type === self::ACTION_TYPE);
    }
}
