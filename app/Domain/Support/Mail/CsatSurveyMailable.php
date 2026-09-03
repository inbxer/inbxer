<?php

namespace App\Domain\Support\Mail;

use App\Domain\Support\Models\CsatSurvey;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CsatSurveyMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CsatSurvey $survey,
        public readonly string $message,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'How did we do?',
        );
    }

    public function content(): Content
    {
        $url = url("/csat/{$this->survey->token}");
        $stars = collect(range(1, 5))
            ->map(fn (int $n) => "<a href=\"{$url}?rating={$n}\" style=\"font-size:28px;text-decoration:none;margin-right:6px;\">★</a>")
            ->implode('');

        $html = '<div style="font-family:sans-serif;max-width:480px;">'
            .'<p>'.e($this->message).'</p>'
            .'<div>'.$stars.'</div>'
            .'<p style="margin-top:16px;"><a href="'.$url.'">Leave more detailed feedback</a></p>'
            .'</div>';

        return new Content(htmlString: $html);
    }
}
