<?php

namespace App\Domain\HelpCenter\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A locally cached page indexed from a team's generic KnowledgeSource
 * (a sitemap page or a one-off URL), used to suggest relevant articles to
 * an agent while replying — alongside Mintlify Help Center articles.
 *
 * @property string $id
 * @property int $team_id
 * @property string $knowledge_source_id
 * @property string $title
 * @property string $url
 * @property string|null $content_excerpt
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read KnowledgeSource $source
 */
class KnowledgeArticle extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'knowledge_source_id',
        'title',
        'url',
        'content_excerpt',
    ];

    /**
     * @return BelongsTo<KnowledgeSource, $this>
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(KnowledgeSource::class, 'knowledge_source_id');
    }
}
