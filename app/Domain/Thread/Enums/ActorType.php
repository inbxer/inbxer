<?php

namespace App\Domain\Thread\Enums;

enum ActorType: string
{
    case User = 'user';
    case Tenant = 'tenant';
    case System = 'system';
    case Ai = 'ai';

    /**
     * Get the display label for the actor type.
     */
    public function label(): string
    {
        return match ($this) {
            self::User => 'Agent',
            self::Tenant => 'Customer',
            self::System => 'System',
            self::Ai => 'AI',
        };
    }

    /**
     * Determine if this actor type represents an automated actor.
     */
    public function isAutomated(): bool
    {
        return in_array($this, [self::System, self::Ai]);
    }
}
