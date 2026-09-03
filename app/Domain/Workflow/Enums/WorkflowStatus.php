<?php

namespace App\Domain\Workflow\Enums;

enum WorkflowStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    /**
     * Get the display label for the workflow status.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get the color associated with the status.
     */
    public function color(): string
    {
        return match ($this) {
            self::Draft => '#6b7280',
            self::Published => '#10b981',
            self::Archived => '#9ca3af',
        };
    }

    /**
     * Determine if this status allows execution.
     */
    public function isExecutable(): bool
    {
        return $this === self::Published;
    }
}
