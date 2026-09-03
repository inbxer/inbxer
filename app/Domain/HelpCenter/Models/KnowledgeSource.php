<?php

namespace App\Domain\HelpCenter\Models;

use App\Domain\HelpCenter\Enums\KnowledgeSourceKind;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A team-configured generic knowledge source: either a sitemap (indexes
 * every page it lists) or a single one-off URL.
 *
 * @property string $id
 * @property int $team_id
 * @property int|null $created_by
 * @property KnowledgeSourceKind $kind
 * @property string $source_url
 * @property bool $is_active
 * @property Carbon|null $last_synced_at
 * @property string|null $last_sync_error
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User|null $creator
 * @property-read Collection<int, KnowledgeArticle> $articles
 */
class KnowledgeSource extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'created_by',
        'kind',
        'source_url',
        'is_active',
        'last_synced_at',
        'last_sync_error',
    ];

    /**
     * @return HasMany<KnowledgeArticle, $this>
     */
    public function articles(): HasMany
    {
        return $this->hasMany(KnowledgeArticle::class);
    }

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
            'kind' => KnowledgeSourceKind::class,
            'is_active' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }
}
