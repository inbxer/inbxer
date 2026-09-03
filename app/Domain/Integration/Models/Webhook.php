<?php

namespace App\Domain\Integration\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $url
 * @property string $secret
 * @property array<int, string> $events
 * @property bool $is_active
 * @property Carbon|null $last_triggered_at
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 */
class Webhook extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'url',
        'secret',
        'events',
        'is_active',
        'last_triggered_at',
        'created_by',
    ];

    /**
     * Determine if this webhook is subscribed to a given event.
     */
    public function isSubscribedTo(string $event): bool
    {
        return in_array($event, $this->events);
    }

    /**
     * Get the user who created this webhook.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
            'last_triggered_at' => 'datetime',
        ];
    }
}
