<?php

namespace App\Domain\Ai\Enums;

enum AiActivityStatus: string
{
    case PendingReview = 'pending_review';
    case Sent = 'sent';
    case Edited = 'edited';
    case Rejected = 'rejected';

    /**
     * Get the display label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PendingReview => 'Pending Review',
            self::Sent => 'Sent',
            self::Edited => 'Edited',
            self::Rejected => 'Rejected',
        };
    }
}
