<?php

namespace App\Domain\Workflow\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string|null $description
 * @property WorkflowStatus $status
 * @property WorkflowTriggerType $trigger_type
 * @property array<string, mixed>|null $trigger_conditions
 * @property bool $is_enabled
 * @property Carbon|null $last_triggered_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Team $team
 * @property-read Collection<int, WorkflowStep> $steps
 * @property-read Collection<int, WorkflowRun> $runs
 */
class Workflow extends Model
{
    use BelongsToTeam, HasUlids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'description',
        'status',
        'trigger_type',
        'trigger_conditions',
        'is_enabled',
        'last_triggered_at',
    ];

    /**
     * Get the steps of this workflow.
     *
     * @return HasMany<WorkflowStep, $this>
     */
    public function steps(): HasMany
    {
        return $this->hasMany(WorkflowStep::class)->orderBy('position');
    }

    /**
     * Get the root-level steps (no parent) of this workflow.
     *
     * @return HasMany<WorkflowStep, $this>
     */
    public function rootSteps(): HasMany
    {
        return $this->hasMany(WorkflowStep::class)
            ->whereNull('parent_step_id')
            ->orderBy('position');
    }

    /**
     * Get all runs of this workflow.
     *
     * @return HasMany<WorkflowRun, $this>
     */
    public function runs(): HasMany
    {
        return $this->hasMany(WorkflowRun::class)->orderByDesc('started_at');
    }

    /**
     * Determine if this workflow can be triggered.
     */
    public function canExecute(): bool
    {
        return $this->is_enabled && $this->status->isExecutable();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => WorkflowStatus::class,
            'trigger_type' => WorkflowTriggerType::class,
            'trigger_conditions' => 'array',
            'is_enabled' => 'boolean',
            'last_triggered_at' => 'datetime',
        ];
    }
}
