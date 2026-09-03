<?php

namespace App\Domain\Sla\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $timezone
 * @property array<string, array{start: string, end: string}> $schedule
 * @property array<int, string>|null $holidays
 * @property bool $is_default
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 */
class BusinessHours extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var string */
    protected $table = 'business_hours';

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'timezone',
        'schedule',
        'holidays',
        'is_default',
    ];

    /**
     * Determine if a given datetime falls within business hours.
     */
    public function isWithinHours(Carbon $dateTime): bool
    {
        $local = $dateTime->copy()->setTimezone($this->timezone);
        $dayName = strtolower($local->format('D'));

        if (! isset($this->schedule[$dayName])) {
            return false;
        }

        $daySchedule = $this->schedule[$dayName];
        $time = $local->format('H:i');

        return $time >= $daySchedule['start'] && $time <= $daySchedule['end'];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'schedule' => 'array',
            'holidays' => 'array',
            'is_default' => 'boolean',
        ];
    }
}
