<?php

namespace App\Domain\Thread\Enums;

enum ThreadStatus: string
{
    case NeedsFirstResponse = 'needs_first_response';
    case NeedsNextResponse = 'needs_next_response';
    case Investigating = 'investigating';
    case CloseTheLoop = 'close_the_loop';
    case WaitingForCustomer = 'waiting_for_customer';
    case PausedForLater = 'paused_for_later';
    case Ignored = 'ignored';
    case Done = 'done';
    case Open = 'open';
    case Snoozed = 'snoozed';
    case Spam = 'spam';

    /**
     * Get the display label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::NeedsFirstResponse, self::Open => 'Needs first response',
            self::NeedsNextResponse => 'Needs next response',
            self::Investigating => 'Investigating',
            self::CloseTheLoop => 'Close the loop',
            self::WaitingForCustomer, self::Snoozed => 'Waiting for customer',
            self::PausedForLater => 'Paused for later',
            self::Ignored => 'Ignored',
            self::Done => 'Done',
            self::Spam => 'Spam',
        };
    }

    /**
     * Get the color associated with the status.
     */
    public function color(): string
    {
        return match ($this) {
            self::NeedsFirstResponse, self::Open => '#60a5fa',
            self::NeedsNextResponse => '#3b82f6',
            self::Investigating => '#a855f7',
            self::CloseTheLoop => '#38bdf8',
            self::WaitingForCustomer, self::Snoozed => '#f59e0b',
            self::PausedForLater => '#ec4899',
            self::Ignored => '#6b7280',
            self::Done => '#10b981',
            self::Spam => '#ef4444',
        };
    }

    /**
     * Determine if this status represents a resolved state.
     */
    public function isResolved(): bool
    {
        return $this === self::Done || $this === self::Ignored || $this === self::Spam;
    }
}
