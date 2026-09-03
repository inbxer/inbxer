<?php

namespace App\Domain\Channel\Services;

use App\Domain\Channel\DTOs\EmailMessageData;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Spam\Services\SpamDetector;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Customer;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;

class InboundEmailProcessor
{
    /**
     * Process inbound email DTO and append to or create a thread.
     */
    public function process(EmailMessageData $data, ?Team $team = null): Thread
    {
        $team = $team ?? $this->resolveTeamFromEmailData($data);

        // 1. Find or create Tenant & Customer by email
        $tenant = Tenant::firstOrCreate(
            [
                'team_id' => $team->id,
                'email' => strtolower($data->fromEmail),
            ],
            [
                'name' => $data->fromName ?: strtolower($data->fromEmail),
            ]
        );

        $customer = Customer::firstOrCreate(
            [
                'team_id' => $team->id,
                'email' => strtolower($data->fromEmail),
            ],
            [
                'tenant_id' => $tenant->id,
                'name' => $data->fromName ?: strtolower($data->fromEmail),
            ]
        );

        // 2. Find or create Email Channel for this team
        $channel = Channel::firstOrCreate(
            [
                'team_id' => $team->id,
                'type' => ChannelType::Email,
            ],
            [
                'name' => 'Support Email',
                'is_active' => true,
                'settings' => [
                    'support_email' => "support@{$team->slug}.gg",
                ],
            ]
        );

        // 3. Search for existing thread by Reference Tag [#TH-xxxx] or sequence_number or MIME headers
        $thread = $this->findMatchingThread($team->id, $data);

        if (! $thread) {
            $maxSeq = Thread::where('team_id', $team->id)->max('sequence_number') ?? 0;
            $nextSeq = $maxSeq + 1;

            $title = ! empty($data->subject) ? $data->subject : "Email inquiry from {$data->fromEmail}";
            $bodyText = $data->textBody ?: strip_tags($data->htmlBody ?? '');
            $isSpam = app(SpamDetector::class)->isSpam($team, $bodyText, $data->fromEmail);

            $thread = Thread::create([
                'team_id' => $team->id,
                'sequence_number' => $nextSeq,
                'title' => $title,
                'status' => $isSpam ? ThreadStatus::Spam : ThreadStatus::NeedsFirstResponse,
                'priority' => ThreadPriority::Normal,
                'tenant_id' => $tenant->id,
                'external_id' => $data->messageId,
            ]);
        } else {
            // Re-open thread if closed, unless it's an automated auto-responder loop
            if (($thread->status === ThreadStatus::Done || $thread->status === ThreadStatus::Ignored) && ! $data->isAutoReply) {
                $thread->status = ThreadStatus::NeedsFirstResponse;
            }
            $thread->snoozed_until = null;
            $thread->touch();
            $thread->save();
        }

        // 4. Create Timeline Entry for the incoming email
        $entry = ThreadTimelineEntry::create([
            'thread_id' => $thread->id,
            'actor_type' => ActorType::Tenant,
            'actor_id' => $customer->id,
            'entry_type' => TimelineEntryType::Message,
            'body' => $data->textBody ?: (strip_tags($data->htmlBody ?? '') ?: $data->subject),
            'body_html' => $data->htmlBody,
            'is_internal' => false,
            'metadata' => [
                'channel' => 'email',
                'message_id' => $data->messageId,
                'in_reply_to' => $data->inReplyTo,
                'references' => $data->references,
                'from_email' => $data->fromEmail,
                'from_name' => $data->fromName,
                'is_auto_reply' => $data->isAutoReply,
            ],
        ]);

        // Save inbound attachments as media on the entry
        if (! empty($data->attachments)) {
            foreach ($data->attachments as $att) {
                $name = $att['name'] ?? 'attachment';
                $content = $att['content'] ?? '';

                if (! empty($content)) {
                    $decoded = base64_decode($content, true) ?: $content;

                    $entry->addMediaFromString($decoded)
                        ->usingFileName($name)
                        ->usingName($name)
                        ->toMediaCollection('attachments');
                }
            }
        }

        ThreadMessageBroadcast::dispatch($entry);

        return $thread;
    }

    /**
     * Find matching thread by [#TH-xxxx] tag in subject or Message-ID headers.
     */
    protected function findMatchingThread(int $teamId, EmailMessageData $data): ?Thread
    {
        // A. Match sequence number from subject tag like [#TH-102] or [TH-102] or #102
        if (preg_match('/\[#(?:TH-)?(\d+)\]/i', $data->subject, $matches) || preg_match('/#(\d+)/i', $data->subject, $matches)) {
            $seqNumber = (int) $matches[1];
            $thread = Thread::where('team_id', $teamId)
                ->where('sequence_number', $seqNumber)
                ->first();

            if ($thread) {
                return $thread;
            }
        }

        // B. Match external_id or In-Reply-To header
        if (! empty($data->inReplyTo)) {
            $thread = Thread::where('team_id', $teamId)
                ->where('external_id', $data->inReplyTo)
                ->first();

            if ($thread) {
                return $thread;
            }
        }

        // C. Match by clean subject and customer email within last 14 days
        $cleanSubj = $this->cleanSubject($data->subject);
        if (! empty($cleanSubj)) {
            $thread = Thread::where('team_id', $teamId)
                ->where('title', $cleanSubj)
                ->where('created_at', '>=', now()->subDays(14))
                ->latest()
                ->first();

            if ($thread) {
                return $thread;
            }
        }

        return null;
    }

    /**
     * Resolve Team dynamically by inspecting toEmail or forwarding address in email data.
     */
    protected function resolveTeamFromEmailData(EmailMessageData $data): Team
    {
        $toEmail = strtolower($data->toEmail);

        // 1. Try matching unguessable token pattern inbound-{token}@...
        if (preg_match('/inbound-([a-z0-9\-]+)@/i', $toEmail, $matches)) {
            $token = $matches[1];

            // Match by inbound_token in Channel settings
            $channel = Channel::where('type', ChannelType::Email)
                ->where(function ($query) use ($token) {
                    $query->where('settings->inbound_token', $token)
                        ->orWhere('settings->inbound_forwarding_address', 'LIKE', "%{$token}%");
                })->first();

            if ($channel && $channel->team) {
                return $channel->team;
            }

            // Fallback match team by slug if legacy
            $team = Team::where('slug', $token)->first();
            if ($team) {
                return $team;
            }
        }

        // 2. Query Channel model settings for matching support_email or inbound_forwarding_address
        $channel = Channel::where('type', ChannelType::Email)
            ->where(function ($query) use ($toEmail) {
                $query->where('settings->support_email', $toEmail)
                    ->orWhere('settings->inbound_forwarding_address', $toEmail);
            })->first();

        if ($channel && $channel->team) {
            return $channel->team;
        }

        // 3. Query Channel model settings for matching alternate_emails
        $allChannels = Channel::where('type', ChannelType::Email)->get();
        foreach ($allChannels as $c) {
            $altEmails = $c->settings['alternate_emails'] ?? [];
            if (is_array($altEmails)) {
                $altEmailsLower = array_map('strtolower', $altEmails);
                if (in_array($toEmail, $altEmailsLower, true) && $c->team) {
                    return $c->team;
                }
            }
        }

        // Fallback to first team if not matched
        return Team::first();
    }

    /**
     * Strip 'Re:', 'Fwd:', and reference tags from subject for matching.
     */
    protected function cleanSubject(string $subject): string
    {
        $cleaned = preg_replace('/^(?:Re|Fwd|FW|RE):\s*/i', '', $subject);
        $cleaned = preg_replace('/\[#(?:TH-)?\d+\]/i', '', $cleaned);

        return trim($cleaned) ?: 'Email Support Inquiry';
    }
}
