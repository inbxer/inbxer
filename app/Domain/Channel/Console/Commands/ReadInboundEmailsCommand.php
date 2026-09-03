<?php

namespace App\Domain\Channel\Console\Commands;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use IMAP\Connection;

class ReadInboundEmailsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inbxer:read-emails';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Read unread emails from configured IMAP channels and create threads.';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        if (! function_exists('imap_open')) {
            $this->error('PHP IMAP extension is not enabled. Cannot read emails.');
            Log::error('PHP IMAP extension is missing in this environment.');

            return;
        }

        $channels = Channel::where('type', ChannelType::Email)
            ->where('is_active', true)
            ->get();

        $this->info("Found {$channels->count()} active Email channels to process.");

        foreach ($channels as $channel) {
            $this->processChannel($channel);
        }
    }

    /**
     * Connect and process messages for a channel.
     */
    protected function processChannel(Channel $channel): void
    {
        $settings = $channel->settings;

        if (empty($settings['host']) || empty($settings['username']) || empty($settings['password'])) {
            $this->warn("Missing IMAP settings for channel [{$channel->name}]. Skipping.");

            return;
        }

        $host = $settings['host'];
        $port = $settings['port'] ?? 993;
        $username = $settings['username'];
        $password = $settings['password'];
        $encryption = $settings['encryption'] ?? 'ssl'; // ssl, tls, or none

        // Construct IMAP mailbox connection string
        $flags = "/imap/{$encryption}/validate-cert";
        if ($encryption === 'none') {
            $flags = '/imap/novalidate-cert';
        }

        $mailbox = "{{$host}:{$port}{$flags}}INBOX";

        $this->info("Connecting to {$mailbox} for user: {$username}");

        $connection = @imap_open($mailbox, $username, $password);

        if (! $connection) {
            $errors = imap_errors();
            $errorMsg = $errors ? implode(', ', $errors) : 'Unknown connection error';
            $this->error("Failed to connect to IMAP server for channel [{$channel->name}]: {$errorMsg}");
            Log::error("IMAP connection failed for channel [{$channel->name}]: {$errorMsg}");

            return;
        }

        // Search for unread emails
        $emails = imap_search($connection, 'UNSEEN');

        if (! $emails) {
            $this->info("No unread emails found for channel [{$channel->name}].");
            imap_close($connection);

            return;
        }

        $this->info('Processing '.count($emails).' unread emails.');

        foreach ($emails as $emailNumber) {
            $this->processEmail($connection, $emailNumber, $channel);
        }

        imap_close($connection);
    }

    /**
     * Process an individual email.
     */
    protected function processEmail(Connection $connection, int $emailNumber, Channel $channel): void
    {
        $header = imap_headerinfo($connection, $emailNumber);

        if (! $header) {
            return;
        }

        $fromAddress = $header->from[0]->mailbox.'@'.$header->from[0]->host;
        $fromName = $header->from[0]->personal ?? $fromAddress;
        $subject = isset($header->subject) ? imap_utf8($header->subject) : 'No Subject';

        // Extract raw text body
        $body = $this->getEmailBody($connection, $emailNumber);

        // Find or create tenant under the channel's team context
        $tenant = Tenant::where('team_id', $channel->team_id)
            ->where('email', $fromAddress)
            ->first();

        if (! $tenant) {
            $tenant = Tenant::create([
                'team_id' => $channel->team_id,
                'name' => $fromName,
                'email' => $fromAddress,
            ]);
            $this->info("Created new tenant: {$fromAddress}");
        }

        // Check if this is a reply to an existing thread (e.g., matching tracking ID in subject)
        // Usually, ticket systems add "[#cdk_12345]" to subjects. We search for Thread by ID/slug in the subject.
        $thread = $this->findThreadBySubject($subject, $channel->team_id);

        if ($thread) {
            $this->info("Adding reply to existing Thread [#{$thread->id}]");

            // Add email to timeline
            $thread->timelineEntries()->create([
                'actor_type' => ActorType::Tenant,
                'actor_id' => $tenant->id,
                'entry_type' => TimelineEntryType::Message,
                'body' => $body,
                'is_internal' => false,
            ]);

            $thread->update([
                'status' => ThreadStatus::NeedsNextResponse, // Re-open if resolved
            ]);
        } else {
            $this->info("Creating new Thread: {$subject}");

            // Create new thread
            $thread = Thread::create([
                'team_id' => $channel->team_id,
                'channel_id' => $channel->id,
                'tenant_id' => $tenant->id,
                'title' => $subject,
                'priority' => ThreadPriority::Normal,
                'status' => ThreadStatus::NeedsFirstResponse,
            ]);

            $thread->timelineEntries()->create([
                'actor_type' => ActorType::Tenant,
                'actor_id' => $tenant->id,
                'entry_type' => TimelineEntryType::Message,
                'body' => $body,
                'is_internal' => false,
            ]);
        }

        // Mark email as seen
        imap_setflag_full($connection, (string) $emailNumber, '\\Seen');
    }

    /**
     * Extract body structure and content from email.
     */
    protected function getEmailBody(Connection $connection, int $emailNumber): string
    {
        $structure = imap_fetchstructure($connection, $emailNumber);
        $body = '';

        if (! $structure) {
            return $body;
        }

        // If simple structure (no multipart)
        if ($structure->type === 0) {
            $rawBody = imap_fetchbody($connection, $emailNumber, '1');

            return is_string($rawBody) ? $this->decodeBody($rawBody, $structure->encoding) : '';
        }

        // If multipart, search for plain text part (subtype = PLAIN)
        if ($structure->type === 1 && ! empty($structure->parts)) {
            foreach ($structure->parts as $partNum => $part) {
                if ($part->type === 0 && strtoupper($part->subtype) === 'PLAIN') {
                    $rawBody = imap_fetchbody($connection, $emailNumber, (string) ($partNum + 1));

                    return is_string($rawBody) ? $this->decodeBody($rawBody, $part->encoding) : '';
                }
            }

            // Fallback: get first part if no plain text
            $rawBody = imap_fetchbody($connection, $emailNumber, '1');

            return is_string($rawBody) ? $this->decodeBody($rawBody, $structure->parts[0]->encoding) : '';
        }

        return $body;
    }

    /**
     * Decode email body based on encoding.
     */
    protected function decodeBody(string $body, int $encoding): string
    {
        switch ($encoding) {
            case 3: // BASE64
                return base64_decode($body);
            case 4: // QUOTED-PRINTABLE
                return quoted_printable_decode($body);
            default:
                return $body;
        }
    }

    /**
     * Find thread by subject tracking ID patterns like [#ULID].
     */
    protected function findThreadBySubject(string $subject, int $teamId): ?Thread
    {
        // Search for matching ULID pattern: [#01J5...]
        if (preg_match('/\[#([0-9A-HJKMNP-TV-Z]{26})\]/i', $subject, $matches)) {
            $ulid = $matches[1];

            return Thread::where('team_id', $teamId)->where('id', $ulid)->first();
        }

        return null;
    }
}
