<?php

namespace App\Domain\Support\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Support\Enums\TaskStatus;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $title
 * @property string|null $description
 * @property TaskStatus $status
 * @property ThreadPriority $priority
 * @property int|null $assigned_to
 * @property string|null $thread_id
 * @property string|null $tenant_id
 * @property string|null $company_id
 * @property Carbon|null $due_at
 * @property Carbon|null $completed_at
 * @property int|null $completed_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User|null $assignee
 * @property-read Thread|null $thread
 * @property-read Tenant|null $tenant
 * @property-read Company|null $company
 * @property-read User|null $completedBy
 */
class Task extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'title',
        'description',
        'status',
        'priority',
        'assigned_to',
        'thread_id',
        'tenant_id',
        'company_id',
        'due_at',
        'completed_at',
        'completed_by',
    ];

    /**
     * Get the user assigned to this task.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the thread linked to this task.
     *
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * Get the tenant linked to this task.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the company linked to this task.
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user who completed this task.
     *
     * @return BelongsTo<User, $this>
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Determine if the task is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status->isCompleted();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'priority' => ThreadPriority::class,
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
