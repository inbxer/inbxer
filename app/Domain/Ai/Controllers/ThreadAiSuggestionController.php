<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiReplyGenerator;
use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ThreadAiSuggestionController extends Controller
{
    public function __invoke(Request $request, Thread $thread, AiReplyGenerator $generator): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team && $thread->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $settings = AiSettings::forTeam($team);

        if (! $settings->suggested_responses_enabled) {
            return response()->json(['error' => 'Suggested responses are not enabled.'], 403);
        }

        try {
            $result = $generator->generateForThread($thread, $settings);
        } catch (Throwable $e) {
            return response()->json(['error' => 'Could not generate a suggestion right now.'], 502);
        }

        return response()->json([
            'reply' => $result['reply'],
            'articles' => $result['articles']
                ->map(fn (MintlifyArticle|KnowledgeArticle $article) => [
                    'id' => $article->id,
                    'title' => $article->title,
                    'url' => $article->url,
                ])
                ->values(),
        ]);
    }
}
