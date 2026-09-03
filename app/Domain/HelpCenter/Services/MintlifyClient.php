<?php

namespace App\Domain\HelpCenter\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Talks to a team's public Mintlify Help Center site.
 *
 * Mintlify auto-generates a public, unauthenticated `llms.txt` index at the
 * root of every docs site — a Markdown list of every page, one line per
 * page, in the form `- [Title](URL): description`. That index (and its per
 * page description) is enough to build a searchable local cache without
 * needing an API key or hitting the paid Assistant/Search REST API, so this
 * client fetches and parses it rather than authenticating against Mintlify's
 * REST API.
 */
class MintlifyClient
{
    /**
     * Fetch and parse the `llms.txt` index for a Mintlify site.
     *
     * @return array<int, array{title: string, url: string, excerpt: string|null}>
     */
    public function fetchArticles(string $siteUrl): array
    {
        $response = Http::connectTimeout(5)->timeout(15)->get($this->llmsTxtUrl($siteUrl));

        if ($response->failed()) {
            throw new RuntimeException("Failed to fetch llms.txt from {$siteUrl} (status {$response->status()}).");
        }

        return $this->parseLlmsTxt($response->body());
    }

    /**
     * A cheap connectivity check used by the "Test connection" action: the
     * site is reachable and its llms.txt index parses into at least one
     * article.
     */
    public function testConnection(string $siteUrl): bool
    {
        return count($this->fetchArticles($siteUrl)) > 0;
    }

    private function llmsTxtUrl(string $siteUrl): string
    {
        return rtrim($siteUrl, '/').'/llms.txt';
    }

    /**
     * @return array<int, array{title: string, url: string, excerpt: string|null}>
     */
    private function parseLlmsTxt(string $body): array
    {
        $articles = [];

        foreach (explode("\n", $body) as $line) {
            if (! preg_match('/^-\s*\[(?P<title>[^\]]+)\]\((?P<url>[^)]+)\)\s*(?::\s*(?P<excerpt>.*))?$/', trim($line), $matches)) {
                continue;
            }

            $articles[] = [
                'title' => trim($matches['title']),
                'url' => trim($matches['url']),
                'excerpt' => isset($matches['excerpt']) && $matches['excerpt'] !== '' ? trim($matches['excerpt']) : null,
            ];
        }

        return $articles;
    }
}
