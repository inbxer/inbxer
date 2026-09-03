<?php

namespace App\Domain\Shared;

use App\Domain\Team\Models\Team;

class TeamContext
{
    protected ?Team $team = null;

    /**
     * Set the current active team.
     */
    public function set(Team $team): void
    {
        $this->team = $team;
    }

    /**
     * Get the current active team.
     */
    public function get(): ?Team
    {
        return $this->team;
    }

    /**
     * Check if a team is set in the current context.
     */
    public function has(): bool
    {
        return $this->team !== null;
    }
}
