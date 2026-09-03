<?php

namespace App\Domain\Tenant\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToTeam, HasUlids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'tenant_id',
        'company_id',
        'customer_group_id',
        'name',
        'email',
        'phone',
        'avatar_url',
        'external_id',
    ];

    /**
     * Get the tenant (organization instance) this customer belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the company this customer belongs to.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the customer group this customer belongs to.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }
}
