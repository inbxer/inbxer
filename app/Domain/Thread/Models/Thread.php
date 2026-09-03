<?php

namespace App\Domain\Thread\Models;

use App\Domain\Channel\Models\Channel;
use App\Domain\CustomField\Models\CustomFieldValue;
use App\Domain\Integration\Services\WebhookDispatcher;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Support\Models\Task;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Tier\Models\Tier;
use App\Domain\Workflow\Models\WorkflowRun;
use App\Models\User;
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
 * @property string|null $channel_id
 * @property string|null $tenant_id
 * @property int|null $assigned_to
 * @property string|null $tier_id
 * @property ThreadPriority $priority
 * @property ThreadStatus $status
 * @property Carbon|null $status_changed_at
 * @property string|null $title
 * @property string|null $external_id
 * @property Carbon|null $snoozed_until
 * @property Carbon|null $first_response_at
 * @property Carbon|null $resolved_at
 * @property Carbon|null $sla_first_response_breached_at
 * @property Carbon|null $sla_next_response_breached_at
 * @property Carbon|null $sla_first_response_notified_at
 * @property Carbon|null $sla_next_response_notified_at
 * @property Carbon|null $locked_at
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Team $team
 * @property-read Channel|null $channel
 * @property-read Tenant|null $tenant
 * @property-read User|null $assignee
 * @property-read Tier|null $tier
 * @property-read Collection<int, ThreadParticipant> $participants
 * @property-read Collection<int, Label> $labels
 * @property-read Collection<int, ThreadTimelineEntry> $timelineEntries
 * @property-read Collection<int, CustomFieldValue> $customFieldValues
 * @property-read Collection<int, WorkflowRun> $workflowRuns
 * @property-read Collection<int, Task> $tasks
 */
class Thread extends Model
{
    use BelongsToTeam, HasUlids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'sequence_number',
        'channel_id',
        'tenant_id',
        'assigned_to',
        'tier_id',
        'priority',
        'status',
        'status_changed_at',
        'title',
        'external_id',
        'snoozed_until',
        'first_response_at',
        'resolved_at',
        'sla_first_response_breached_at',
        'sla_next_response_breached_at',
        'sla_first_response_notified_at',
        'sla_next_response_notified_at',
        'locked_at',
        'ai_handoff_at',
        'metadata',
    ];

    /**
     * Get the channel this thread came from.
     *
     * @return BelongsTo<Channel, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    /**
     * Get the tenant (customer) who created this thread.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the agent assigned to this thread.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the tier associated with this thread.
     *
     * @return BelongsTo<Tier, $this>
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(Tier::class);
    }

    /**
     * Get all participants in this thread.
     *
     * @return HasMany<ThreadParticipant, $this>
     */
    public function participants(): HasMany
    {
        return $this->hasMany(ThreadParticipant::class);
    }

    /**
     * Get the labels attached to this thread.
     *
     * @return BelongsToMany<Label, $this>
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'thread_labels')
            ->withPivot('created_at');
    }

    /**
     * Get the timeline entries for this thread (unified timeline).
     *
     * @return HasMany<ThreadTimelineEntry, $this>
     */
    public function timelineEntries(): HasMany
    {
        return $this->hasMany(ThreadTimelineEntry::class)->orderBy('created_at');
    }

    /**
     * Get the custom field values for this thread.
     *
     * @return MorphMany<CustomFieldValue, $this>
     */
    public function customFieldValues(): MorphMany
    {
        return $this->morphMany(CustomFieldValue::class, 'entity');
    }

    /**
     * Get the workflow runs triggered for this thread.
     *
     * @return HasMany<WorkflowRun, $this>
     */
    public function workflowRuns(): HasMany
    {
        return $this->hasMany(WorkflowRun::class);
    }

    /**
     * Get the tasks linked to this thread.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get the threads linked to this thread.
     *
     * @return BelongsToMany<Thread, $this>
     */
    public function relatedThreads(): BelongsToMany
    {
        return $this->belongsToMany(Thread::class, 'thread_relations', 'thread_id', 'related_thread_id')
            ->withTimestamps();
    }

    /**
     * Determine if the thread is currently locked.
     */
    public function isLocked(): bool
    {
        return $this->locked_at !== null;
    }

    /**
     * Determine if the thread is currently snoozed.
     */
    public function isSnoozed(): bool
    {
        return $this->status === ThreadStatus::Snoozed
            && $this->snoozed_until !== null
            && $this->snoozed_until->isFuture();
    }

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        static::created(function (Thread $thread) {
            WebhookDispatcher::dispatch(
                $thread->team_id,
                'thread.created',
                $thread->toArray()
            );
        });

        static::updating(function (Thread $thread) {
            if ($thread->isDirty('status') && ! $thread->isDirty('status_changed_at')) {
                $thread->status_changed_at = Carbon::now();
            }

            if ($thread->isDirty('status') && ! $thread->isDirty('assigned_to') && $thread->assigned_to !== null) {
                $settingKey = match ($thread->status) {
                    ThreadStatus::Snoozed => 'on_snooze',
                    ThreadStatus::Done => 'on_done',
                    default => null,
                };

                if ($settingKey !== null) {
                    $behavior = $thread->team?->settings['workflow']['sticky_assignment'][$settingKey] ?? 'stay_assigned';

                    if ($behavior === 'unassign') {
                        $thread->assigned_to = null;
                    }
                }
            }
        });

        static::updated(function (Thread $thread) {
            WebhookDispatcher::dispatch(
                $thread->team_id,
                'thread.updated',
                $thread->toArray()
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
            'priority' => ThreadPriority::class,
            'status' => ThreadStatus::class,
            'status_changed_at' => 'datetime',
            'snoozed_until' => 'datetime',
            'first_response_at' => 'datetime',
            'resolved_at' => 'datetime',
            'sla_first_response_breached_at' => 'datetime',
            'sla_next_response_breached_at' => 'datetime',
            'sla_first_response_notified_at' => 'datetime',
            'sla_next_response_notified_at' => 'datetime',
            'locked_at' => 'datetime',
            'ai_handoff_at' => 'datetime',
            'metadata' => 'array',
        ];
    }
}
