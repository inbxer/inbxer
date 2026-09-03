<?php

namespace App\Domain\Tier\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Models\Thread;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $color
 * @property ThreadPriority $default_priority
 * @property int $position
 * @property bool $is_default
 * @property string|null $external_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Collection<int, SlaPolicy> $slaPolicies
 */
class Tier extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'color',
        'default_priority',
        'position',
        'is_default',
        'external_id',
    ];

    /**
     * Get the SLA policies associated with this tier.
     *
     * @return HasMany<SlaPolicy, $this>
     */
    public function slaPolicies(): HasMany
    {
        return $this->hasMany(SlaPolicy::class);
    }

    /**
     * Get the threads associated with this tier.
     *
     * @return HasMany<Thread, $this>
     */
    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class, 'tier_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'default_priority' => ThreadPriority::class,
            'position' => 'integer',
            'is_default' => 'boolean',
        ];
    }
}
