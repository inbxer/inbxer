<?php

namespace App\Domain\HelpCenter\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A locally cached Help Center article synced from a team's Mintlify site,
 * used to suggest relevant articles to an agent while replying.
 *
 * @property string $id
 * @property int $team_id
 * @property string $mintlify_connection_id
 * @property string $title
 * @property string $url
 * @property string|null $content_excerpt
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read MintlifyConnection $connection
 */
class MintlifyArticle extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'mintlify_connection_id',
        'title',
        'url',
        'content_excerpt',
    ];

    /**
     * @return BelongsTo<MintlifyConnection, $this>
     */
    public function connection(): BelongsTo
    {
        return $this->belongsTo(MintlifyConnection::class, 'mintlify_connection_id');
    }
}
