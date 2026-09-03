<?php

namespace App\Domain\Support\Jobs;

use App\Domain\Support\Mail\CsatSurveyMailable;
use App\Domain\Support\Models\CsatSurvey;
use App\Domain\Thread\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendCsatSurveyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly string $threadId) {}

    public function handle(): void
    {
        $thread = Thread::withoutGlobalScopes()->find($this->threadId);

        if (! $thread || CsatSurvey::withoutGlobalScopes()->where('thread_id', $thread->id)->exists()) {
            return;
        }

        $team = $thread->team;
        $csatSettings = $team->settings['csat'] ?? [];

        if (empty($csatSettings['enabled'])) {
            return;
        }

        $recipient = $thread->tenant?->email;

        if (! $recipient) {
            return;
        }

        $survey = CsatSurvey::create([
            'team_id' => $team->id,
            'thread_id' => $thread->id,
            'tenant_id' => $thread->tenant_id,
            'sent_at' => now(),
        ]);

        $message = $csatSettings['message'] ?? 'How would you rate the support you just received?';

        Mail::to($recipient)->send(new CsatSurveyMailable($survey, $message));
    }
}
