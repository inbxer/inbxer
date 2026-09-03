<?php

namespace App\Domain\Thread\Enums;

enum ThreadPriority: string
{
    case Urgent = 'urgent';
    case High = 'high';
    case Normal = 'normal';
    case Low = 'low';

    /**
     * Get the display label for the priority.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get the color associated with the priority.
     */
    public function color(): string
    {
        return match ($this) {
            self::Urgent => '#ef4444',
            self::High => '#f97316',
            self::Normal => '#3b82f6',
            self::Low => '#6b7280',
        };
    }

    /**
     * Get the numeric weight for sorting (higher = more urgent).
     */
    public function weight(): int
    {
        return match ($this) {
            self::Urgent => 4,
            self::High => 3,
            self::Normal => 2,
            self::Low => 1,
        };
    }
}
