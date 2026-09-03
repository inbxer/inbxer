<?php

namespace App\Domain\Channel\Services;

use App\Domain\Channel\Models\Channel;
use App\Domain\Spam\Services\SpamDetector;
use App\Domain\Tenant\Models\Customer;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class InboundChatProcessor
{
    /**
     * Start a new widget conversation (or return the visitor's existing open thread for this session).
     * Applies the workspace's configured thread defaults (and per-button overrides) automatically —
     * no manual thread-field code required in the embed snippet.
     */
    public function startConversation(
        Channel $channel,
        string $visitorId,
        string $message,
        ?string $visitorName = null,
        ?string $visitorEmail = null,
        ?string $buttonKey = null,
        ?UploadedFile $attachment = null,
    ): Thread {
        $externalId = "chat:{$channel->id}:{$visitorId}";

        $existing = Thread::where('team_id', $channel->team_id)->where('external_id', $externalId)->first();
        if ($existing) {
            $this->appendMessage($existing, $message, null, $attachment);

            return $existing;
        }

        [$tenant, $customer] = $this->resolveVisitor($channel, $visitorId, $visitorName, $visitorEmail);
        [$labelIds, $priority, $tierId] = $this->resolveThreadDetails($channel, $buttonKey);

        $thread = Cache::lock("chat-thread:{$channel->id}:{$visitorId}", 10)
            ->block(3, fn (): Thread => DB::transaction(function () use ($channel, $externalId, $tenant, $visitorId, $visitorName, $visitorEmail, $message, $priority, $tierId, $buttonKey): Thread {
                $existing = Thread::where('team_id', $channel->team_id)->where('external_id', $externalId)->first();
                if ($existing) {
                    return $existing;
                }

                $sequence = (Thread::where('team_id', $channel->team_id)->lockForUpdate()->max('sequence_number') ?? 0) + 1;
                $isSpam = $channel->team
                    ? app(SpamDetector::class)->isSpam($channel->team, $message, $visitorEmail)
                    : false;

                return Thread::create([
                    'team_id' => $channel->team_id,
                    'channel_id' => $channel->id,
                    'tenant_id' => $tenant->id,
                    'tier_id' => $tierId,
                    'sequence_number' => $sequence,
                    'title' => $visitorName ? "Chat with {$visitorName}" : 'Website chat',
                    'status' => $isSpam ? ThreadStatus::Spam : ThreadStatus::NeedsFirstResponse,
                    'priority' => $priority,
                    'external_id' => $externalId,
                    'metadata' => [
                        'chat_app_id' => $channel->settings['app_id'] ?? null,
                        'visitor_id' => $visitorId,
                        'button_key' => $buttonKey,
                    ],
                ]);
            }));

        if (! empty($labelIds)) {
            $thread->labels()->syncWithoutDetaching($labelIds);
        }

        // A brand-new thread already has its correct starting status (including
        // Spam, when flagged) — unlike appendMessage(), this must not run the
        // "reopen if resolved" check meant for replies to an existing thread.
        $entry = $thread->timelineEntries()->create([
            'actor_type' => ActorType::Tenant,
            'actor_id' => $customer->id,
            'entry_type' => TimelineEntryType::Message,
            'body' => trim($message),
            'is_internal' => false,
            'metadata' => ['channel' => 'chat'],
        ]);

        if ($attachment) {
            $entry->addMedia($attachment)
                ->usingName($attachment->getClientOriginalName())
                ->toMediaCollection('attachments');
        }

        ThreadMessageBroadcast::dispatch($entry);

        return $thread;
    }

    /**
     * @return array{0: array<int, string>, 1: ThreadPriority, 2: ?string}
     */
    private function resolveThreadDetails(Channel $channel, ?string $buttonKey): array
    {
        $defaults = $channel->settings['thread_defaults'] ?? [];
        $labelIds = $defaults['label_ids'] ?? [];
        $priorityValue = $defaults['priority'] ?? null;
        $tierId = $defaults['tier_id'] ?? null;

        if ($buttonKey) {
            $button = collect($channel->settings['chat_buttons'] ?? [])
                ->first(fn (array $b): bool => ($b['key'] ?? null) === $buttonKey);

            if ($button) {
                $labelIds = array_values(array_unique([...$labelIds, ...($button['label_ids'] ?? [])]));
                $priorityValue = $button['priority'] ?? $priorityValue;
                $tierId = $button['tier_id'] ?? $tierId;
            }
        }

        $priority = ThreadPriority::tryFrom((string) $priorityValue) ?? ThreadPriority::Normal;

        return [$labelIds, $priority, $tierId ?: null];
    }

    /**
     * Append a reply from the widget visitor to an existing thread.
     */
    public function appendMessage(Thread $thread, string $message, ?string $customerId = null, ?UploadedFile $attachment = null): ThreadTimelineEntry
    {
        if ($thread->status->isResolved()) {
            $thread->update(['status' => ThreadStatus::NeedsNextResponse, 'resolved_at' => null]);
        } else {
            $thread->touch();
        }

        $entry = $thread->timelineEntries()->create([
            'actor_type' => ActorType::Tenant,
            'actor_id' => $customerId,
            'entry_type' => TimelineEntryType::Message,
            'body' => trim($message),
            'is_internal' => false,
            'metadata' => ['channel' => 'chat'],
        ]);

        if ($attachment) {
            $entry->addMedia($attachment)
                ->usingName($attachment->getClientOriginalName())
                ->toMediaCollection('attachments');
        }

        ThreadMessageBroadcast::dispatch($entry);

        return $entry;
    }

    /**
     * @return array{0: Tenant, 1: Customer}
     */
    private function resolveVisitor(Channel $channel, string $visitorId, ?string $visitorName, ?string $visitorEmail): array
    {
        $email = $visitorEmail ? strtolower($visitorEmail) : "visitor-{$visitorId}@chat.invalid";
        $name = $visitorName ?: 'Website visitor';

        $tenant = Tenant::firstOrCreate(
            ['team_id' => $channel->team_id, 'email' => $email],
            ['name' => $name, 'external_id' => $visitorId],
        );

        $customer = Customer::firstOrCreate(
            ['team_id' => $channel->team_id, 'email' => $email],
            ['tenant_id' => $tenant->id, 'name' => $name, 'external_id' => $visitorId],
        );

        return [$tenant, $customer];
    }
}
