<?php

namespace App\Domain\Sla\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Tier\Models\Tier;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One SLA target card for a tier, matching the "SLA Commitments" cards
 * shown on the Tiers & SLAs settings page: either a "first response" or
 * "next response" deadline, optionally scoped to specific priorities and
 * labels.
 *
 * @property string $id
 * @property int $team_id
 * @property string|null $tier_id
 * @property string $type "first_response" | "next_response"
 * @property int $minutes
 * @property int|null $notify_before_minutes
 * @property bool $notify_on_breach
 * @property bool $only_business_hours
 * @property array<int, string>|null $priorities
 * @property bool $require_all_labels
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Tier|null $tier
 * @property-read Collection<int, SlaPolicyCondition> $conditions
 */
class SlaPolicy extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'tier_id',
        'type',
        'minutes',
        'notify_before_minutes',
        'notify_on_breach',
        'only_business_hours',
        'priorities',
        'require_all_labels',
        'is_active',
    ];

    /**
     * Get the tier this SLA applies to.
     *
     * @return BelongsTo<Tier, $this>
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(Tier::class);
    }

    /**
     * Get the additional conditions for this SLA policy (currently used to
     * scope a card to specific labels).
     *
     * @return HasMany<SlaPolicyCondition, $this>
     */
    public function conditions(): HasMany
    {
        return $this->hasMany(SlaPolicyCondition::class);
    }

    /**
     * Get the label IDs this card is scoped to (empty = applies regardless
     * of labels).
     *
     * @return array<int, string>
     */
    public function labelIds(): array
    {
        return $this->conditions
            ->where('condition_type', 'label')
            ->pluck('condition_id')
            ->all();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'minutes' => 'integer',
            'notify_before_minutes' => 'integer',
            'notify_on_breach' => 'boolean',
            'only_business_hours' => 'boolean',
            'priorities' => 'array',
            'require_all_labels' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
