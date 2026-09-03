<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiReplyGenerator;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Throwable;

class AiPlaygroundController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        return Inertia::render('ai/playground', [
            'settings' => [
                'model' => $settings->model,
                'temperature' => $settings->temperature,
            ],
        ]);
    }

    public function generate(Request $request, AiReplyGenerator $generator): JsonResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        try {
            $result = $generator->generateForText($team, $validated['message'], $settings);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Could not generate a reply right now. Please try again.'], 422);
        }

        return response()->json([
            'reply' => $result['reply'],
            'articles' => $result['articles']->map(fn ($article) => [
                'id' => $article->id,
                'title' => $article->title,
                'url' => $article->url,
            ])->values(),
        ]);
    }

    /**
     * Real token-by-token streaming endpoint for @ai-sdk/react's `useChat`,
     * speaking the Vercel AI SDK data-stream protocol via laravel/ai's
     * built-in `usingVercelDataProtocol()`. `useChat` POSTs the full
     * UIMessage[] transcript on every turn — we only need the latest user
     * message since SupportReplyAgent is stateless per prompt.
     */
    public function stream(Request $request, AiReplyGenerator $generator): StreamableAgentResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'messages' => 'required|array|min:1',
        ]);

        $message = $this->lastUserMessageText($validated['messages']);

        abort_if($message === '', 422, 'No message text found.');

        $built = $generator->agentForText($team, $message, $settings);

        return $built['agent']->stream($message)->usingVercelDataProtocol();
    }

    /**
     * Extract the plain-text content of the last `role: "user"` entry from
     * an AI SDK UIMessage[] payload (each message has a `parts` array with
     * `{type: "text", text: string}` entries among possible others).
     *
     * @param  array<int, array<string, mixed>>  $messages
     */
    private function lastUserMessageText(array $messages): string
    {
        $lastUser = collect($messages)
            ->reverse()
            ->first(fn (array $message) => ($message['role'] ?? null) === 'user');

        if ($lastUser === null) {
            return '';
        }

        return collect($lastUser['parts'] ?? [])
            ->filter(fn ($part) => is_array($part) && ($part['type'] ?? null) === 'text')
            ->pluck('text')
            ->implode('');
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
