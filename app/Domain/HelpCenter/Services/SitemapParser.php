<?php

namespace App\Domain\HelpCenter\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Fetches and parses a `sitemap.xml`-style index into a flat list of page
 * URLs, used to bulk-index a documentation/marketing site as a
 * KnowledgeSource without needing an API key.
 */
class SitemapParser
{
    private const MAX_URLS = 100;

    /**
     * @return array<int, string>
     *
     * @throws RuntimeException
     */
    public function parse(string $sitemapUrl): array
    {
        $response = Http::timeout(15)->get($sitemapUrl);

        if ($response->failed()) {
            throw new RuntimeException("Failed to fetch sitemap from {$sitemapUrl} (status {$response->status()}).");
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($response->body());
        libxml_clear_errors();
        libxml_use_internal_errors(false);

        if ($xml === false) {
            throw new RuntimeException("Failed to parse sitemap XML from {$sitemapUrl}.");
        }

        $urls = [];

        foreach ($xml->url ?? [] as $entry) {
            $loc = trim((string) ($entry->loc ?? ''));
            if ($loc !== '') {
                $urls[] = $loc;
            }
        }

        return array_slice(array_values(array_unique($urls)), 0, self::MAX_URLS);
    }
}
