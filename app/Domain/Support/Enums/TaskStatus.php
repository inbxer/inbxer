<?php

namespace App\Domain\Support\Enums;

enum TaskStatus: string
{
    case Open = 'open';
    case Done = 'done';

    /**
     * Get the display label for the task status.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Determine if this status represents a completed task.
     */
    public function isCompleted(): bool
    {
        return $this === self::Done;
    }
}
