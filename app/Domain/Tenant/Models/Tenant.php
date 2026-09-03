<?php

namespace App\Domain\Tenant\Models;

use App\Domain\CustomField\Models\CustomFieldValue;
use App\Domain\Integration\Services\WebhookDispatcher;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string|null $company_id
 * @property string|null $external_id
 * @property string $name
 * @property string $email
 * @property string|null $avatar_url
 * @property string|null $phone
 * @property string|null $timezone
 * @property string|null $locale
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Team $team
 * @property-read Company|null $company
 * @property-read Collection<int, Thread> $threads
 * @property-read Collection<int, CustomerGroup> $groups
 * @property-read Collection<int, CustomFieldValue> $customFieldValues
 */
class Tenant extends Model
{
    use BelongsToTeam, HasUlids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'company_id',
        'external_id',
        'name',
        'email',
        'avatar_url',
        'phone',
        'timezone',
        'locale',
        'metadata',
        'tier_id',
    ];

    /**
     * Get the tier associated with the tenant.
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(Tier::class);
    }

    /**
     * Get the company this tenant belongs to.
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get all threads created by this tenant.
     *
     * @return HasMany<Thread, $this>
     */
    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class);
    }

    /**
     * Get the individual customers belonging to this tenant.
     *
     * @return HasMany<Customer, $this>
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Get the customer groups this tenant belongs to.
     *
     * @return BelongsToMany<CustomerGroup, $this>
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(CustomerGroup::class, 'customer_group_members')
            ->withTimestamps();
    }

    /**
     * Get the custom field values for this tenant.
     *
     * @return MorphMany<CustomFieldValue, $this>
     */
    public function customFieldValues(): MorphMany
    {
        return $this->morphMany(CustomFieldValue::class, 'entity');
    }

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        static::created(function (Tenant $tenant) {
            WebhookDispatcher::dispatch(
                $tenant->team_id,
                'tenant.created',
                $tenant->toArray()
            );
        });

        static::updated(function (Tenant $tenant) {
            WebhookDispatcher::dispatch(
                $tenant->team_id,
                'tenant.updated',
                $tenant->toArray()
            );
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}
