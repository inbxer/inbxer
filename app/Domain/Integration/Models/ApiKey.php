<?php

namespace App\Domain\Integration\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Machine users for API access. The raw key is shown once at creation;
 * only the bcrypt hash and prefix (first 8 chars) are stored.
 *
 * @property string $id
 * @property int $team_id
 * @property string $name
 * @property string $key_hash
 * @property string $key_prefix
 * @property array<string, bool>|null $permissions
 * @property Carbon|null $last_used_at
 * @property Carbon|null $expires_at
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 */
class ApiKey extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'name',
        'key_hash',
        'key_prefix',
        'permissions',
        'last_used_at',
        'expires_at',
        'created_by',
    ];

    /**
     * Generate a new API key and set the hash + prefix.
     *
     * @return string The raw key (only shown once).
     */
    public static function generateKey(self $apiKey): string
    {
        $rawKey = 'cdk_'.Str::random(40);

        $apiKey->key_prefix = substr($rawKey, 0, 8);
        $apiKey->key_hash = bcrypt($rawKey);

        return $rawKey;
    }

    /**
     * Determine if the API key has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Get the user who created this API key.
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
            'permissions' => 'array',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
