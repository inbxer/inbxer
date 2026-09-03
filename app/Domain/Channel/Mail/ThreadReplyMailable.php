<?php

namespace App\Domain\Channel\Mail;

use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class ThreadReplyMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Thread $thread,
        public readonly ThreadTimelineEntry $entry,
        public readonly string $fromEmail,
        public readonly string $fromName,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subjectTag = "[#TH-{$this->thread->sequence_number}]";
        $subject = str_contains($this->thread->title ?? '', $subjectTag)
            ? "Re: {$this->thread->title}"
            : "Re: {$this->thread->title} {$subjectTag}";

        return new Envelope(
            from: new Address($this->fromEmail, $this->fromName),
            subject: $subject,
        );
    }

    /**
     * Get the message headers for email threading.
     */
    public function headers(): Headers
    {
        $rawMessageId = "msg-{$this->entry->id}@inbxer.com";
        $rawParentId = $this->entry->metadata['in_reply_to']
            ?? $this->thread->external_id
            ?? "thread-{$this->thread->id}@inbxer.com";

        $cleanMessageId = trim($rawMessageId, '<> ');
        $cleanParentId = trim($rawParentId, '<> ');

        return new Headers(
            messageId: $cleanMessageId,
            references: [$cleanParentId],
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: $this->entry->body_html ?? nl2br(e($this->entry->body)),
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return $this->entry->getMedia('attachments')
            ->map(fn ($media) => Attachment::fromPath($media->getPath())
                ->as($media->name)
                ->withMime($media->mime_type))
            ->all();
    }
}
