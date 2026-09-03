<?php

namespace App\Domain\Shared\Enums;

use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;

enum EntityType: string
{
    case Thread = 'thread';
    case Tenant = 'tenant';
    case Company = 'company';

    /**
     * Get the display label for the entity type.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get the fully-qualified model class for this entity type.
     *
     * @return class-string
     */
    public function modelClass(): string
    {
        return match ($this) {
            self::Thread => Thread::class,
            self::Tenant => Tenant::class,
            self::Company => Company::class,
        };
    }
}
