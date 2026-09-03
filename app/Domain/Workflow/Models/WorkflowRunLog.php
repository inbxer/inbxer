<?php

namespace App\Domain\Workflow\Models;

use App\Domain\Workflow\Enums\WorkflowRunStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Records the execution result of a single workflow step within a run.
 *
 * @property string $id
 * @property string $run_id
 * @property string|null $step_id
 * @property WorkflowRunStatus $status
 * @property array<string, mixed>|null $input
 * @property array<string, mixed>|null $output
 * @property string|null $error_message
 * @property Carbon $executed_at
 * @property Carbon|null $created_at
 * @property-read WorkflowRun $run
 * @property-read WorkflowStep|null $step
 */
class WorkflowRunLog extends Model
{
    use HasUlids;

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = [
        'run_id',
        'step_id',
        'status',
        'input',
        'output',
        'error_message',
        'executed_at',
    ];

    /**
     * Get the run this log belongs to.
     *
     * @return BelongsTo<WorkflowRun, $this>
     */
    public function run(): BelongsTo
    {
        return $this->belongsTo(WorkflowRun::class, 'run_id');
    }

    /**
     * Get the step that was executed.
     *
     * @return BelongsTo<WorkflowStep, $this>
     */
    public function step(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class, 'step_id');
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
            'input' => 'array',
            'output' => 'array',
            'executed_at' => 'datetime',
        ];
    }
}
