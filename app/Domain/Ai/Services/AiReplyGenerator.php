<?php

namespace App\Domain\Ai\Services;

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Services\KnowledgeArticleSearchService;
use App\Domain\HelpCenter\Services\MintlifyArticleSearchService;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Generates AI support-reply text via the SupportReplyAgent, building the
 * system prompt from a team's AiSettings (custom instructions, tone rules,
 * citation preference) plus any relevant Mintlify Help Center articles and
 * generic KnowledgeArticle entries (from sitemap/URL knowledge sources).
 */
class AiReplyGenerator
{
    private const MAX_ARTICLES = 5;

    public function __construct(
        private readonly MintlifyArticleSearchService $mintlifyArticles,
        private readonly KnowledgeArticleSearchService $knowledgeArticles,
    ) {}

    /**
     * @return array{reply: string, articles: Collection<int, MintlifyArticle|KnowledgeArticle>}
     */
    public function generateForThread(Thread $thread, AiSettings $settings): array
    {
        $articles = $this->mergeArticles(
            $this->mintlifyArticles->suggestForThread($thread->team, $thread),
            $this->knowledgeArticles->suggestForThread($thread->team, $thread),
        );

        $lastCustomerMessage = $this->lastCustomerMessage($thread);

        $reply = $this->generate($thread->team, $lastCustomerMessage, $settings, $articles);

        return ['reply' => $reply, 'articles' => $articles];
    }

    /**
     * The most recent customer-authored message body on a thread (falling
     * back to the thread title if none has a body yet).
     */
    public function lastCustomerMessage(Thread $thread): string
    {
        return (string) ($thread->timelineEntries()
            ->where('actor_type', 'tenant')
            ->whereNotNull('body')
            ->latest('created_at')
            ->value('body') ?? $thread->title);
    }

    /**
     * @return array{reply: string, articles: Collection<int, MintlifyArticle|KnowledgeArticle>}
     */
    public function generateForText(Team $team, string $message, AiSettings $settings): array
    {
        $articles = $this->mergeArticles(
            $this->mintlifyArticles->search($team, $message),
            $this->knowledgeArticles->search($team, $message),
        );

        $reply = $this->generate($team, $message, $settings, $articles);

        return ['reply' => $reply, 'articles' => $articles];
    }

    /**
     * Build a ready-to-stream SupportReplyAgent for a one-off test message
     * (used by the streaming Playground endpoint), plus the articles used
     * as grounding context so callers can surface citations separately.
     *
     * @return array{agent: SupportReplyAgent, articles: Collection<int, MintlifyArticle|KnowledgeArticle>}
     */
    public function agentForText(Team $team, string $message, AiSettings $settings): array
    {
        $articles = $this->mergeArticles(
            $this->mintlifyArticles->search($team, $message),
            $this->knowledgeArticles->search($team, $message),
        );

        $agent = new SupportReplyAgent(
            instructions: $this->buildInstructions($team, $settings, $articles),
            model: $settings->model ?? 'gemini-3.5-flash-lite',
            temperature: $settings->temperature ?? 0.3,
        );

        return ['agent' => $agent, 'articles' => $articles];
    }

    /**
     * Merge Mintlify and generic knowledge-article suggestions, deduped by
     * URL, capped at MAX_ARTICLES combined.
     *
     * @param  Collection<int, MintlifyArticle>  $mintlifyArticles
     * @param  Collection<int, KnowledgeArticle>  $knowledgeArticles
     * @return Collection<int, MintlifyArticle|KnowledgeArticle>
     */
    private function mergeArticles(Collection $mintlifyArticles, Collection $knowledgeArticles): Collection
    {
        return $mintlifyArticles
            ->concat($knowledgeArticles)
            ->unique(fn ($article) => $article->url)
            ->take(self::MAX_ARTICLES)
            ->values();
    }

    /**
     * @param  Collection<int, MintlifyArticle|KnowledgeArticle>  $articles
     */
    private function generate(Team $team, string $message, AiSettings $settings, Collection $articles): string
    {
        $agent = new SupportReplyAgent(
            instructions: $this->buildInstructions($team, $settings, $articles),
            model: $settings->model ?? 'gemini-3.5-flash-lite',
            temperature: $settings->temperature ?? 0.3,
        );

        return (string) $agent->prompt($message)->text;
    }

    /**
     * @param  Collection<int, MintlifyArticle|KnowledgeArticle>  $articles
     */
    private function buildInstructions(Team $team, AiSettings $settings, Collection $articles): string
    {
        $lines = [];

        $lines[] = "You are {$settings->public_name}, the AI support agent for {$team->name}.";
        $lines[] = 'Write a clear, helpful reply to the customer\'s message below.';

        if (filled($settings->custom_instructions)) {
            $lines[] = "Team instructions: {$settings->custom_instructions}";
        }

        $tone = $this->formatToneRules($settings->tone_rules ?? []);
        if ($tone !== null) {
            $lines[] = "Tone — {$tone}";
        }

        if ($articles->isNotEmpty()) {
            $lines[] = 'Relevant Help Center articles you may draw facts from:';

            foreach ($articles as $article) {
                $lines[] = "- {$article->title} ({$article->url}): ".Str::limit((string) $article->content_excerpt, 300);
            }

            if ($settings->show_knowledge_citations) {
                $lines[] = 'Cite the source article for each fact you use from the Help Center content above.';
            }

            if ($settings->include_inline_links) {
                $lines[] = 'Where helpful, include the article URL inline as a link.';
            }
        } else {
            $lines[] = 'No relevant Help Center articles were found. If you are not confident in the answer, say so plainly rather than guessing.';
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array<string, string>  $toneRules
     */
    private function formatToneRules(array $toneRules): ?string
    {
        $labels = [
            'empathy' => 'Empathy',
            'language' => 'Language',
            'formality' => 'Formality',
            'personality' => 'Personality',
            'warmth' => 'Warmth',
        ];

        $parts = [];

        foreach ($labels as $key => $label) {
            if (filled($toneRules[$key] ?? null)) {
                $parts[] = "{$label}: {$toneRules[$key]}";
            }
        }

        return $parts === [] ? null : implode('  ', $parts);
    }
}
