<?php

namespace App\Domain\HelpCenter\Controllers;

use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Services\MintlifyArticleSearchService;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThreadHelpArticleController extends Controller
{
    public function __invoke(Request $request, Thread $thread, MintlifyArticleSearchService $search): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team && $thread->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        return response()->json([
            'articles' => $search->suggestForThread($team, $thread)
                ->map(fn (MintlifyArticle $article) => [
                    'id' => $article->id,
                    'title' => $article->title,
                    'url' => $article->url,
                ])
                ->values(),
        ]);
    }
}
