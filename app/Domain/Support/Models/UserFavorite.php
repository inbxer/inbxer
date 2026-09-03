<?php

namespace App\Domain\Support\Models;

use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFavorite extends Model
{
    protected $fillable = [
        'user_id',
        'team_id',
        'filter_key',
        'title',
        'url',
    ];

    /**
     * Get the user that owns the favorite.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the team that owns the favorite.
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
