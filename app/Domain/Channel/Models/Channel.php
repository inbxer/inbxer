<?php

namespace App\Domain\Channel\Models;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property ChannelType $type
 * @property string $name
 * @property bool $is_active
 * @property array<string, mixed>|null $settings
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Collection<int, Thread> $threads
 */
class Channel extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'type',
        'name',
        'is_active',
        'settings',
    ];

    /**
     * Get all threads received via this channel.
     *
     * @return HasMany<Thread, $this>
     */
    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ChannelType::class,
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }
}
