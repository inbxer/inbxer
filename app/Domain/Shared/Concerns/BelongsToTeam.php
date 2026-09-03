<?php

namespace App\Domain\Shared\Concerns;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait for models that belong to a Team (workspace-level multi-tenancy).
 *
 * Provides:
 * - A `team()` BelongsTo relationship
 * - A `scopeForTeam()` query scope for filtering by team
 *
 * @property int $team_id
 * @property-read Team $team
 *
 * @mixin Model
 */
trait BelongsToTeam
{
    /**
     * Boot the BelongsToTeam trait.
     * Automatically registers a global scope to filter queries by active team.
     */
    public static function bootBelongsToTeam(): void
    {
        static::addGlobalScope('team_scope', function (Builder $builder) {
            $context = app(TeamContext::class);
            if ($context->has()) {
                $builder->where($builder->getModel()->qualifyColumn('team_id'), $context->get()->id);
            }
        });
    }

    /**
     * Get the team that owns this resource.
     *
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Scope query to a specific team.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForTeam(Builder $query, Team|int $team): Builder
    {
        $teamId = $team instanceof Team ? $team->id : $team;

        return $query->where($this->qualifyColumn('team_id'), $teamId);
    }
}
