<?php

namespace App\Domain\Thread\Models;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ParticipantRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $thread_id
 * @property int|null $user_id
 * @property string|null $tenant_id
 * @property ParticipantRole $role
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Thread $thread
 * @property-read User|null $user
 * @property-read Tenant|null $tenant
 */
class ThreadParticipant extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'thread_id',
        'user_id',
        'tenant_id',
        'role',
    ];

    /**
     * Get the thread this participant belongs to.
     *
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * Get the user (agent) participant.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the tenant (customer) participant.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => ParticipantRole::class,
        ];
    }
}
