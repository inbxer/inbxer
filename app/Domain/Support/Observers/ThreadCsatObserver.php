<?php

namespace App\Domain\Support\Observers;

use App\Domain\Support\Jobs\SendCsatSurveyJob;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;

/**
 * Sends a CSAT survey whenever a thread is marked Done, after the delay
 * configured on the team's CSAT settings.
 */
class ThreadCsatObserver
{
    public function updated(Thread $thread): void
    {
        if (! $thread->wasChanged('status') || $thread->status !== ThreadStatus::Done) {
            return;
        }

        $delayMinutes = (int) ($thread->team?->settings['csat']['delay_minutes'] ?? 0);

        SendCsatSurveyJob::dispatch($thread->id)->delay(now()->addMinutes($delayMinutes));
    }
}
