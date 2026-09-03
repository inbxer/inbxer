<?php

namespace App\Domain\Support\Models;

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
 * @property int $created_by
 * @property string $name
 * @property array<string, mixed>|null $filters
 * @property int $position
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 */
class SavedView extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'created_by',
        'name',
        'filters',
        'position',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'position' => 'integer',
        ];
    }
}
