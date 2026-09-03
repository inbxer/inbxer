<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\SimilarThreadsFinder;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThreadSimilarThreadsController extends Controller
{
    public function __invoke(Request $request, Thread $thread, SimilarThreadsFinder $finder): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team && $thread->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $settings = AiSettings::forTeam($team);

        if (! $settings->similar_threads_enabled) {
            return response()->json(['error' => 'Similar threads are not enabled.'], 403);
        }

        return response()->json([
            'threads' => $finder->forThread($thread)
                ->map(fn (Thread $related) => [
                    'id' => $related->id,
                    'title' => $related->title,
                    'status' => $related->status->value,
                ])
                ->values(),
        ]);
    }
}
