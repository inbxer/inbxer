<?php

namespace App\Domain\HelpCenter\Services;

use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Suggests locally cached generic KnowledgeArticle rows (from sitemap or
 * one-off URL sources) relevant to a thread, using the same keyword-scoring
 * algorithm as MintlifyArticleSearchService so both can feed the AI reply
 * prompt identically.
 */
class KnowledgeArticleSearchService
{
    /**
     * @return Collection<int, KnowledgeArticle>
     */
    public function suggestForThread(Team $team, Thread $thread, int $limit = 5): Collection
    {
        $lastCustomerMessage = $thread->timelineEntries()
            ->where('actor_type', ActorType::Tenant)
            ->whereNotNull('body')
            ->latest('created_at')
            ->value('body');

        if (! $lastCustomerMessage) {
            return collect();
        }

        return $this->search($team, $lastCustomerMessage, $limit);
    }

    /**
     * @return Collection<int, KnowledgeArticle>
     */
    public function search(Team $team, string $text, int $limit = 5): Collection
    {
        $keywords = $this->keywords($text);

        if ($keywords === []) {
            return collect();
        }

        $articles = KnowledgeArticle::where('team_id', $team->id)->get();

        return $articles
            ->map(fn (KnowledgeArticle $article) => [
                'article' => $article,
                'score' => $this->score($article, $keywords),
            ])
            ->filter(fn (array $row) => $row['score'] > 0)
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('article')
            ->values();
    }

    /**
     * @return array<int, string>
     */
    private function keywords(string $text): array
    {
        $words = collect(preg_split('/[^\p{L}\p{N}]+/u', Str::lower($text)) ?: [])
            ->filter(fn (string $word) => mb_strlen($word) >= 4)
            ->unique()
            ->values();

        return $words->take(12)->all();
    }

    /**
     * @param  array<int, string>  $keywords
     */
    private function score(KnowledgeArticle $article, array $keywords): int
    {
        $haystack = Str::lower($article->title.' '.$article->content_excerpt);
        $score = 0;

        foreach ($keywords as $keyword) {
            if (str_contains($haystack, $keyword)) {
                $score += str_contains(Str::lower($article->title), $keyword) ? 3 : 1;
            }
        }

        return $score;
    }
}
