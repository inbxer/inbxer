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
 * @property string $name
 * @property string|null $shortcut
 * @property string $body
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 */
class Snippet extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'shortcut',
        'body',
        'created_by',
    ];

    /**
     * Get the user who created this snippet.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
