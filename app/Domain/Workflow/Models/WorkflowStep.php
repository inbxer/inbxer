<?php

namespace App\Domain\Workflow\Models;

use App\Domain\Workflow\Enums\WorkflowStepType;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Represents a single step in a workflow. Steps form a tree structure
 * via parent_step_id to support if/else branching.
 *
 * @property string $id
 * @property string $workflow_id
 * @property WorkflowStepType $type
 * @property string $action_type
 * @property array<string, mixed>|null $config
 * @property int $position
 * @property string|null $parent_step_id
 * @property string|null $branch
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Workflow $workflow
 * @property-read WorkflowStep|null $parentStep
 * @property-read Collection<int, WorkflowStep> $children
 */
class WorkflowStep extends Model
{
    use HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'workflow_id',
        'type',
        'action_type',
        'config',
        'position',
        'parent_step_id',
        'branch',
    ];

    /**
     * Get the workflow this step belongs to.
     *
     * @return BelongsTo<Workflow, $this>
     */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    /**
     * Get the parent step (for if/else branching).
     *
     * @return BelongsTo<self, $this>
     */
    public function parentStep(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_step_id');
    }

    /**
     * Get the child steps (branches).
     *
     * @return HasMany<self, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_step_id')->orderBy('position');
    }

    /**
     * Determine if this step is a condition (if/else).
     */
    public function isCondition(): bool
    {
        return $this->type === WorkflowStepType::Condition;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => WorkflowStepType::class,
            'config' => 'array',
            'position' => 'integer',
        ];
    }
}
