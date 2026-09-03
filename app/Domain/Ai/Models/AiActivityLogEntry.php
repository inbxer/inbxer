<?php

namespace App\Domain\Ai\Models;

use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A single AI-generated reply attempt for a thread, logged for review
 * (shadow mode) or as a record of what was auto-sent (live mode).
 *
 * @property string $id
 * @property int $team_id
 * @property string $thread_id
 * @property string $generated_reply
 * @property array<int, array<string, mixed>>|null $matched_articles
 * @property AiActivityStatus $status
 * @property int|null $reviewed_by
 * @property string|null $timeline_entry_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Thread $thread
 * @property-read User|null $reviewer
 */
class AiActivityLogEntry extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'thread_id',
        'generated_reply',
        'matched_articles',
        'status',
        'reviewed_by',
        'timeline_entry_id',
    ];

    /**
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Scope to entries with no matched knowledge articles (a "knowledge gap").
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeKnowledgeGaps(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('matched_articles')
                ->orWhereJsonLength('matched_articles', 0);
        });
    }

    /**
     * Scope to entries that were sent to the customer as generated.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeResponded(Builder $query): Builder
    {
        return $query->where('status', AiActivityStatus::Sent->value);
    }

    /**
     * Scope to entries that were rejected and handed off to a human agent.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeHandedOff(Builder $query): Builder
    {
        return $query->where('status', AiActivityStatus::Rejected->value);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'matched_articles' => 'array',
            'status' => AiActivityStatus::class,
        ];
    }
}
