<?php

namespace App\Domain\Workflow\Models;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowRunStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $workflow_id
 * @property string|null $thread_id
 * @property string|null $tenant_id
 * @property WorkflowRunStatus $status
 * @property Carbon $started_at
 * @property Carbon|null $completed_at
 * @property string|null $error_message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Workflow $workflow
 * @property-read Thread|null $thread
 * @property-read Tenant|null $tenant
 * @property-read Collection<int, WorkflowRunLog> $logs
 */
class WorkflowRun extends Model
{
    use HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'workflow_id',
        'thread_id',
        'tenant_id',
        'status',
        'started_at',
        'completed_at',
        'error_message',
    ];

    /**
     * Get the workflow this run belongs to.
     *
     * @return BelongsTo<Workflow, $this>
     */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    /**
     * Get the thread this run was triggered for.
     *
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * Get the tenant this run was triggered for.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the step execution logs for this run.
     *
     * @return HasMany<WorkflowRunLog, $this>
     */
    public function logs(): HasMany
    {
        return $this->hasMany(WorkflowRunLog::class, 'run_id')->orderBy('executed_at');
    }

    /**
     * Get the duration of this run in seconds.
     */
    public function durationInSeconds(): ?int
    {
        if ($this->completed_at === null) {
            return null;
        }

        return (int) $this->started_at->diffInSeconds($this->completed_at);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => WorkflowRunStatus::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
