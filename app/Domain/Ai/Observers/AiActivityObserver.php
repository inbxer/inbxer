<?php

namespace App\Domain\Ai\Observers;

use App\Domain\Ai\Jobs\ProcessAiActivityForThread;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\ThreadTimelineEntry;

/**
 * Queues AI processing (reply dispatch + per-thread automations) whenever a
 * customer-facing message is added to a thread. Only listens for
 * ActorType::Tenant entries — never for ActorType::Ai (the AI's own
 * replies) — so the AI can never re-trigger itself in a loop.
 *
 * Deliberately only queues a job here rather than running any AI logic
 * inline: this observer fires synchronously inside the same
 * ThreadTimelineEntry::create() call that saves the customer's message, so
 * anything blocking here (a Gemini call can take several seconds) would
 * delay the customer's own message from being broadcast — visible in the
 * chat widget as the message and the AI's reply appearing at the same
 * time. Mirrors ThreadTimelineEntryWorkflowObserver's same queue-only
 * pattern for the same reason.
 */
class AiActivityObserver
{
    public function created(ThreadTimelineEntry $entry): void
    {
        if ($entry->entry_type !== TimelineEntryType::Message || $entry->actor_type !== ActorType::Tenant) {
            return;
        }

        $thread = $entry->thread;

        if ($thread) {
            ProcessAiActivityForThread::dispatch($thread->id);
        }
    }
}
