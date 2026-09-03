<?php

namespace App\Domain\Workflow\Enums;

enum WorkflowStepType: string
{
    case Trigger = 'trigger';
    case Condition = 'condition';
    case Action = 'action';

    /**
     * Get the display label for the step type.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }
}
