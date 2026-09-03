<?php

namespace App\Domain\Ai\Services;

use App\Domain\Thread\Models\Thread;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Finds other threads in the same team that look related to a given thread,
 * using simple local keyword matching against thread titles — no LLM call.
 * Modeled on MintlifyArticleSearchService's keyword-scoring approach.
 */
class SimilarThreadsFinder
{
    /**
     * @return Collection<int, Thread>
     */
    public function forThread(Thread $thread, int $limit = 5): Collection
    {
        $keywords = $this->keywords((string) $thread->title);

        if ($keywords === []) {
            return collect();
        }

        $candidates = Thread::where('team_id', $thread->team_id)
            ->where('id', '!=', $thread->id)
            ->whereNotNull('title')
            ->latest('created_at')
            ->limit(200)
            ->get(['id', 'title', 'status', 'sequence_number']);

        return $candidates
            ->map(fn (Thread $candidate) => [
                'thread' => $candidate,
                'score' => $this->score($candidate, $keywords),
            ])
            ->filter(fn (array $row) => $row['score'] > 0)
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('thread')
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
    private function score(Thread $candidate, array $keywords): int
    {
        $haystack = Str::lower((string) $candidate->title);
        $score = 0;

        foreach ($keywords as $keyword) {
            if (str_contains($haystack, $keyword)) {
                $score += 1;
            }
        }

        return $score;
    }
}
