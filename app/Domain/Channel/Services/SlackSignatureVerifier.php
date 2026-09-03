<?php

namespace App\Domain\Channel\Services;

use Illuminate\Http\Request;

class SlackSignatureVerifier
{
    public function verify(Request $request): bool
    {
        $secret = (string) config('services.slack.signing_secret');
        $timestamp = (string) $request->header('X-Slack-Request-Timestamp');
        $signature = (string) $request->header('X-Slack-Signature');

        if ($secret === '' || $timestamp === '' || $signature === '' || abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = 'v0='.hash_hmac('sha256', "v0:{$timestamp}:{$request->getContent()}", $secret);

        return hash_equals($expected, $signature);
    }
}
