<?php

namespace App\Domain\HelpCenter\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A team's connection to a Mintlify-hosted documentation/Help Center site.
 * There is at most one connection per team.
 *
 * @property string $id
 * @property int $team_id
 * @property string $site_url
 * @property array<string, mixed>|null $settings
 * @property bool $is_active
 * @property Carbon|null $last_synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Collection<int, MintlifyArticle> $articles
 */
class MintlifyConnection extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'site_url',
        'settings',
        'is_active',
        'last_synced_at',
    ];

    /**
     * @return HasMany<MintlifyArticle, $this>
     */
    public function articles(): HasMany
    {
        return $this->hasMany(MintlifyArticle::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }
}
