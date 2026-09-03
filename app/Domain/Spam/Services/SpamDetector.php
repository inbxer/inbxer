<?php

namespace App\Domain\Spam\Services;

use App\Domain\Team\Models\Team;
use Illuminate\Support\Str;

/**
 * Simple rule-based spam detection for the first inbound message of a new
 * conversation (email or chat widget) — keyword blocklist and sender email
 * domain blocklist, configured per team in `team.settings['spam']`.
 */
class SpamDetector
{
    public function isSpam(Team $team, string $bodyText, ?string $senderEmail = null): bool
    {
        $settings = $team->settings['spam'] ?? [];

        if (empty($settings['enabled'])) {
            return false;
        }

        if ($this->matchesKeyword($bodyText, $settings['blocked_keywords'] ?? [])) {
            return true;
        }

        if ($senderEmail !== null && $this->matchesDomain($senderEmail, $settings['blocked_domains'] ?? [])) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<int, string>  $keywords
     */
    private function matchesKeyword(string $bodyText, array $keywords): bool
    {
        $haystack = Str::lower($bodyText);

        foreach ($keywords as $keyword) {
            $keyword = trim((string) $keyword);

            if ($keyword !== '' && str_contains($haystack, Str::lower($keyword))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>  $blockedDomains
     */
    private function matchesDomain(string $email, array $blockedDomains): bool
    {
        $domain = Str::lower(Str::after($email, '@'));

        if ($domain === '') {
            return false;
        }

        foreach ($blockedDomains as $blocked) {
            if (Str::lower(trim((string) $blocked)) === $domain) {
                return true;
            }
        }

        return false;
    }
}
