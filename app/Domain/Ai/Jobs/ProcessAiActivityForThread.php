<?php

namespace App\Domain\Ai\Jobs;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiAutomationService;
use App\Domain\Ai\Services\AiDispatcher;
use App\Domain\Thread\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Runs the AI reply dispatch and per-thread automations (auto-labeling,
 * urgency detection, thread titling) in the background, off the request
 * that created the triggering customer message.
 *
 * This must never run synchronously inside a model observer: the AI reply
 * involves a Gemini call that can take several seconds, and running it
 * inline would block the customer's own message from being created/
 * broadcast until the whole AI pipeline finished (visible in the chat
 * widget as the customer's message and the AI's reply appearing at the
 * same time instead of the customer's message showing immediately).
 */
class ProcessAiActivityForThread implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly string $threadId) {}

    public function handle(AiDispatcher $dispatcher, AiAutomationService $automations): void
    {
        $thread = Thread::find($this->threadId);

        if (! $thread) {
            return;
        }

        $dispatcher->dispatchFor($thread);

        $settings = AiSettings::forTeam($thread->team);

        if ($settings->auto_labeling_enabled) {
            $this->run(fn () => $automations->applyAutoLabeling($thread));
        }

        if ($settings->urgency_detection_enabled) {
            $this->run(fn () => $automations->detectUrgency($thread));
        }

        if ($settings->thread_titles_enabled) {
            $this->run(fn () => $automations->generateTitle($thread));
        }
    }

    private function run(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
