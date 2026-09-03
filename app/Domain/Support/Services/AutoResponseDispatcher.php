<?php

namespace App\Domain\Support\Services;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Support\Models\AutoResponse;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Services\WorkflowConditionEvaluator;
use Illuminate\Support\Carbon;

/**
 * Sends the first matching enabled auto-response for a newly created thread,
 * delivering it through whichever channel the thread actually came in on.
 */
class AutoResponseDispatcher
{
    public function __construct(private readonly WorkflowConditionEvaluator $conditions) {}

    public function dispatchFor(Thread $thread): void
    {
        $channelType = $thread->channel?->type?->value;

        if (! $channelType) {
            return;
        }

        $rule = AutoResponse::where('team_id', $thread->team_id)
            ->where('is_enabled', true)
            ->orderBy('position')
            ->get()
            ->first(function (AutoResponse $rule) use ($thread, $channelType) {
                $channels = $rule->channels ?? [];

                if (! empty($channels) && ! in_array($channelType, $channels, true)) {
                    return false;
                }

                if ($rule->respect_business_hours && ! $this->isWithinBusinessHours($thread)) {
                    return false;
                }

                return $this->conditions->evaluate($rule->conditions, $thread);
            });

        if (! $rule) {
            return;
        }

        $entry = $thread->timelineEntries()->create([
            'actor_type' => ActorType::System,
            'actor_id' => null,
            'entry_type' => TimelineEntryType::Message,
            'is_internal' => false,
            'body' => $rule->message,
            'metadata' => ['is_auto_reply' => true, 'auto_response_id' => $rule->id],
        ]);

        ThreadMessageBroadcast::dispatch($entry);

        $this->deliver($thread, $entry->id);
    }

    /**
     * Deliver the auto-reply through the thread's channel, mirroring the
     * same per-channel strategy used for regular agent replies
     * (ThreadReplyController): Slack gets a dedicated outbound job, Chat is
     * delivered purely via the broadcast already sent above, and everything
     * else (Email, Form, Discord, MS Teams, API) falls back to email when
     * the customer has one on file.
     */
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
