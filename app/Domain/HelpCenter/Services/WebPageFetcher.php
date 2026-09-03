<?php

namespace App\Domain\HelpCenter\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Fetches a single web page and extracts a plain-text title/excerpt from it,
 * used to index generic (non-Mintlify) knowledge sources — sitemap pages
 * and one-off URLs — without any external HTML parsing dependency.
 */
class WebPageFetcher
{
    private const EXCERPT_LENGTH = 500;

    /**
     * @return array{title: string, excerpt: string|null}
     *
     * @throws RuntimeException
     */
    public function fetch(string $url): array
    {
        $response = Http::timeout(15)->get($url);

        if ($response->failed()) {
            throw new RuntimeException("Failed to fetch {$url} (status {$response->status()}).");
        }

        return $this->parse($response->body(), $url);
    }

    /**
     * @return array{title: string, excerpt: string|null}
     */
    private function parse(string $html, string $url): array
    {
        if (trim($html) === '') {
            return ['title' => $url, 'excerpt' => null];
        }

        $document = new DOMDocument;

        libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8" ?>'.$html);
        libxml_clear_errors();
        libxml_use_internal_errors(false);

        $xpath = new DOMXPath($document);

        $titleNode = $document->getElementsByTagName('title')->item(0);
        $title = trim((string) ($titleNode ? $titleNode->textContent : ''));
        if ($title === '') {
            $title = $url;
        }

        foreach (['//script', '//style'] as $query) {
            foreach (iterator_to_array($xpath->query($query) ?: []) as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        $bodyNode = $document->getElementsByTagName('body')->item(0);
        $bodyText = ($bodyNode ? $bodyNode->textContent : null)
            ?? $document->textContent
            ?? '';

        $excerpt = trim((string) preg_replace('/\s+/u', ' ', $bodyText));
        $excerpt = $excerpt === '' ? null : mb_substr($excerpt, 0, self::EXCERPT_LENGTH);

        return ['title' => $title, 'excerpt' => $excerpt];
    }
}
