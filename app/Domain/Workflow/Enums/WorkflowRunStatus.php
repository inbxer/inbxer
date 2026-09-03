<?php

namespace App\Domain\Workflow\Enums;

enum WorkflowRunStatus: string
{
    case Running = 'running';
    case Completed = 'completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    /**
     * Get the display label for the run status.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get the color associated with the run status.
     */
    public function color(): string
    {
        return match ($this) {
            self::Running => '#3b82f6',
            self::Completed => '#10b981',
            self::Failed => '#ef4444',
            self::Cancelled => '#6b7280',
        };
    }

    /**
     * Determine if this status represents a terminal state.
     */
    public function isTerminal(): bool
    {
        return in_array($this, [self::Completed, self::Failed, self::Cancelled]);
    }
}
