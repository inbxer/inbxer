<?php

namespace App\Domain\Channel\Jobs;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Mail\ThreadReplyMailable;
use App\Domain\Channel\Models\Channel;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendOutboundEmailReplyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $threadId,
        public readonly string $entry_id,
        public readonly string $recipientEmail,
    ) {}

    public function handle(): void
    {
        $thread = Thread::find($this->threadId);
        $entry = ThreadTimelineEntry::find($this->entry_id);

        if (! $thread || ! $entry) {
            return;
        }

        $team = $thread->team;

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Email)
            ->first();

        $configuredEmail = $channel?->settings['support_email'] ?? null;
        $sendingEnabled = $channel?->settings['sending_enabled'] ?? false;

        $fromEmail = (! empty($configuredEmail) && $sendingEnabled && filter_var($configuredEmail, FILTER_VALIDATE_EMAIL))
            ? $configuredEmail
            : config('mail.from.address', 'onboarding@resend.dev');

        $fromName = "{$team->name} Support";

        Mail::to($this->recipientEmail)->send(
            new ThreadReplyMailable(
                thread: $thread,
                entry: $entry,
                fromEmail: $fromEmail,
                fromName: $fromName,
            )
        );
    }
}
