<?php

namespace App\Domain\Team\Concerns;

use App\Domain\Team\Models\Team;
use Illuminate\Support\Str;

trait GeneratesUniqueTeamSlugs
{
    /**
     * Generate a random, unguessable slug for the team. The slug is the
     * team's public identifier (used throughout the app's URLs), so it is
     * intentionally not derived from the team name — it never needs to
     * change when the team is renamed.
     */
    protected static function generateUniqueTeamSlug(): string
    {
        do {
            $slug = Str::lower(Str::random(12));
        } while (static::withTrashed()->where('slug', $slug)->exists());

        return $slug;
    }
}
