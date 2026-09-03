<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiAutomationService;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ThreadAiSummaryController extends Controller
{
    public function __invoke(Request $request, Thread $thread, AiAutomationService $automations): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team && $thread->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $settings = AiSettings::forTeam($team);

        if (! $settings->thread_catchups_enabled) {
            return response()->json(['error' => 'Thread catch-ups are not enabled.'], 403);
        }

        try {
            $summary = $automations->summarize($thread);
        } catch (Throwable) {
            return response()->json(['error' => 'Could not generate a summary right now.'], 502);
        }

        return response()->json(['summary' => $summary]);
    }
}
