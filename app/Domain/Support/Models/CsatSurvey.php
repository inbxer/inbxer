<?php

namespace App\Domain\Support\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A customer satisfaction survey sent after a thread is resolved, answered
 * via a token-based public link with no login required.
 *
 * @property string $id
 * @property int $team_id
 * @property string $thread_id
 * @property string|null $tenant_id
 * @property string $token
 * @property int|null $rating
 * @property string|null $comment
 * @property Carbon|null $sent_at
 * @property Carbon|null $responded_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Thread $thread
 * @property-read Tenant|null $tenant
 */
class CsatSurvey extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'thread_id',
        'tenant_id',
        'token',
        'rating',
        'comment',
        'sent_at',
        'responded_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (CsatSurvey $survey) {
            if (empty($survey->token)) {
                $survey->token = Str::random(48);
            }
        });
    }

    /**
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * A rating of 4 or 5 (out of 5) counts as a positive response.
     */
    public function isPositive(): bool
    {
        return $this->rating !== null && $this->rating >= 4;
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'sent_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }
}
