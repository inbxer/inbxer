<?php

namespace App\Domain\Sla\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Additional conditions that narrow when an SLA policy applies
 * (e.g., only for a specific label, channel, or company).
 *
 * @property int $id
 * @property string $sla_policy_id
 * @property string $condition_type
 * @property string $condition_id
 * @property Carbon|null $created_at
 * @property-read SlaPolicy $slaPolicy
 */
class SlaPolicyCondition extends Model
{
    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = [
        'sla_policy_id',
        'condition_type',
        'condition_id',
    ];

    /**
     * Get the SLA policy this condition belongs to.
     *
     * @return BelongsTo<SlaPolicy, $this>
     */
    public function slaPolicy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class);
    }
}
