<?php

namespace App\Domain\Ai\Services;

use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Events\AiDraftCreated;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Generates and, depending on the team's AI mode, sends an AI reply for a
 * newly received customer message — mirroring AutoResponseDispatcher's
 * channel/business-hours gating, but keyed off AiSettings::mode instead of
 * a per-rule auto_send flag.
 *
 * Shadow mode logs a suggested reply for manual review. Live mode logs it
 * and immediately sends it. Either way the reply is authored as
 * ActorType::Ai so the workflow/AI observers never re-trigger on it.
 */
class AiDispatcher
{
    private const HANDOFF_MESSAGE = "\n\nI wasn't fully able to answer this — a member of our team will follow up with you shortly.";

    public function __construct(
        private readonly AiReplyGenerator $generator,
        private readonly AiHandoffDetector $handoffDetector,
    ) {}

    public function dispatchFor(Thread $thread): void
    {
        $channelType = $thread->channel?->type?->value;

        if (! $channelType) {
            return;
        }

        // Once a conversation has been handed off to a human, the AI stays
        // quiet on it until a human agent replies (see ThreadReplyController,
        // which clears ai_handoff_at on a human reply).
        if ($thread->ai_handoff_at !== null) {
            return;
        }

        $settings = AiSettings::forTeam($thread->team);

        $channels = $settings->channels ?? [];
        if (! empty($channels) && ! in_array($channelType, $channels, true)) {
            return;
        }

        if ($settings->respect_business_hours && ! $this->isWithinBusinessHours($thread)) {
            return;
        }

        $customerMessage = $this->generator->lastCustomerMessage($thread);

        // The customer explicitly asked for a human — hand off instead of
        // attempting a reply at all.
        if ($this->handoffDetector->customerRequestsHuman($customerMessage)) {
            $this->handOff($thread);

            return;
        }

        try {
            $result = $this->generator->generateForThread($thread, $settings);
        } catch (Throwable) {
            return;
        }

        $log = AiActivityLogEntry::create([
            'team_id' => $thread->team_id,
            'thread_id' => $thread->id,
            'generated_reply' => $result['reply'],
            'matched_articles' => $result['articles']->map(fn ($article) => [
                'id' => $article->id,
                'title' => $article->title,
                'url' => $article->url,
            ])->all(),
            'status' => AiActivityStatus::PendingReview,
        ]);

        // The AI wasn't confident in its own answer — hand off going
        // forward too, on top of the one-off handoff sentence appended
        // below when this draft is sent.
        if ($this->handoffDetector->replyLooksUncertain($result['reply'])) {
            $this->handOff($thread);
        }

        if ($settings->mode === 'live') {
            $this->send($thread, $log, $settings);
        } else {
            AiDraftCreated::dispatch($log);
        }
    }

    /**
     * Flag a thread as needing a human agent — the AI won't attempt to
     * generate or send further replies on it until a human replies.
     */
    private function handOff(Thread $thread): void
    {
        if ($thread->ai_handoff_at === null) {
            $thread->update(['ai_handoff_at' => now()]);
        }
    }

    /**
     * Send the AI-generated reply for real, appending the handoff sentence
     * when the reply looks uncertain and handoff messaging is enabled.
     */
    public function send(Thread $thread, AiActivityLogEntry $log, ?AiSettings $settings = null): void
    {
        $settings ??= AiSettings::forTeam($thread->team);

        $body = $log->generated_reply;

        if ($settings->send_handoff_message && $this->handoffDetector->replyLooksUncertain($body)) {
            $body .= self::HANDOFF_MESSAGE;
        }

        $entry = $thread->timelineEntries()->create([
            'actor_type' => ActorType::Ai,
            'actor_id' => null,
            'entry_type' => TimelineEntryType::Message,
            'is_internal' => false,
            'body' => $body,
            'metadata' => ['is_ai_reply' => true, 'ai_activity_log_id' => $log->id],
        ]);

        ThreadMessageBroadcast::dispatch($entry);

        $this->deliver($thread, $entry->id);

        $log->update(['timeline_entry_id' => $entry->id]);
    }

    private function deliver(Thread $thread, string $entryId): void
    {
        match ($thread->channel?->type) {
            ChannelType::Slack => SendOutboundSlackReplyJob::dispatch($thread->id, $entryId),
            ChannelType::Chat => null,
            default => $this->sendEmail($thread, $entryId),
        };
    }

    private function sendEmail(Thread $thread, string $entryId): void
    {
        $recipient = $thread->tenant?->email;

        if (! $recipient) {
            return;
        }

        SendOutboundEmailReplyJob::dispatch($thread->id, $entryId, $recipient);
    }

    private function isWithinBusinessHours(Thread $thread): bool
    {
        $businessHours = BusinessHours::where('team_id', $thread->team_id)
            ->where('is_default', true)
            ->first();

        return $businessHours && $businessHours->isWithinHours(Carbon::now());
    }
}
