<?php

namespace App\Domain\Thread\Enums;

enum ParticipantRole: string
{
    case Author = 'author';
    case Assignee = 'assignee';
    case Cc = 'cc';
    case Follower = 'follower';

    /**
     * Get the display label for the participant role.
     */
    public function label(): string
    {
        return match ($this) {
            self::Author => 'Author',
            self::Assignee => 'Assignee',
            self::Cc => 'CC',
            self::Follower => 'Follower',
        };
    }
}
