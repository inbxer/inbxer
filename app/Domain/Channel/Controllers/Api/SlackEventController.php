<?php

namespace App\Domain\Channel\Controllers\Api;

use App\Domain\Channel\Jobs\ProcessSlackEventJob;
use App\Domain\Channel\Models\SlackEventReceipt;
use App\Domain\Channel\Services\SlackSignatureVerifier;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlackEventController extends Controller
{
    public function __invoke(Request $request, SlackSignatureVerifier $verifier): JsonResponse
    {
        if (! $verifier->verify($request)) {
            return response()->json(['error' => 'Invalid Slack signature'], 401);
        }

        $payload = $request->json()->all();
        if (($payload['type'] ?? null) === 'url_verification') {
            return response()->json(['challenge' => $payload['challenge'] ?? '']);
        }

        $eventId = (string) ($payload['event_id'] ?? '');
        if ($eventId !== '') {
            $receipt = SlackEventReceipt::firstOrCreate(
                ['event_id' => $eventId],
                ['slack_team_id' => (string) ($payload['team_id'] ?? '')],
            );

            if ($receipt->wasRecentlyCreated) {
                ProcessSlackEventJob::dispatch($receipt->id, $payload);
            }
        }

        return response()->json(['ok' => true]);
    }
}
