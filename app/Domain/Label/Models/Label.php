<?php

namespace App\Domain\Label\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $color
 * @property string|null $icon
 * @property string|null $description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Collection<int, Thread> $threads
 */
class Label extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'color',
        'icon',
        'description',
    ];

    /**
     * Get all threads with this label.
     *
     * @return BelongsToMany<Thread, $this>
     */
    public function threads(): BelongsToMany
    {
        return $this->belongsToMany(Thread::class, 'thread_labels')
            ->withTimestamps();
    }
}
