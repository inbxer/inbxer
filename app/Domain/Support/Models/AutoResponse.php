<?php

namespace App\Domain\Support\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A rule that automatically sends a message to a new thread when it matches
 * the configured channels/conditions. Only the first matching enabled rule
 * (ordered by `position`) is sent per thread.
 *
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $message
 * @property array<int, string>|null $channels
 * @property array<string, mixed>|null $conditions
 * @property int $position
 * @property bool $is_enabled
 * @property bool $respect_business_hours
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 */
class AutoResponse extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'message',
        'channels',
        'conditions',
        'position',
        'is_enabled',
        'respect_business_hours',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'conditions' => 'array',
            'position' => 'integer',
            'is_enabled' => 'boolean',
            'respect_business_hours' => 'boolean',
        ];
    }
}
