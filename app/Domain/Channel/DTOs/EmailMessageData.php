<?php

namespace App\Domain\Channel\DTOs;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailMessageData
{
    /**
     * @param  array<int, array{name: string, content: string, mime_type: string}>  $attachments
     */
    public function __construct(
        public readonly string $fromEmail,
        public readonly string $fromName,
        public readonly string $toEmail,
        public readonly string $subject,
        public readonly string $textBody,
        public readonly ?string $htmlBody = null,
        public readonly ?string $messageId = null,
        public readonly ?string $inReplyTo = null,
        public readonly ?string $references = null,
        public readonly array $attachments = [],
        public readonly bool $isAutoReply = false,
    ) {}

    /**
     * Create DTO from generic webhooks array payload (Postmark / SendGrid format).
     *
     * @param  array<string, mixed>  $payload
     */
    public static function fromWebhookPayload(array $payload): self
    {
        // Handle Resend webhook wrapper payload
        $data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : $payload;

        $fromRaw = $data['From'] ?? $data['from'] ?? $data['from_email'] ?? $data['sender'] ?? 'customer@example.com';
        if (is_array($fromRaw)) {
            $fromEmail = $fromRaw['email'] ?? $fromRaw['address'] ?? 'customer@example.com';
            $fromName = $fromRaw['name'] ?? explode('@', $fromEmail)[0];
        } else {
            $fromEmail = (string) $fromRaw;
            $fromName = $data['FromName'] ?? $data['from_name'] ?? explode('@', $fromEmail)[0];
        }

        $toRaw = $data['To'] ?? $data['to'] ?? $data['to_email'] ?? $data['recipient'] ?? 'support@zad.gg';
        $toEmail = is_array($toRaw) ? ($toRaw[0]['email'] ?? $toRaw[0] ?? 'support@zad.gg') : (string) $toRaw;

        $subject = $data['Subject'] ?? $data['subject'] ?? 'Support Inquiry';
        $textBody = $data['TextBody'] ?? $data['text'] ?? $data['body'] ?? $data['stripped-text'] ?? $data['body-plain'] ?? '';
        $htmlBody = $data['HtmlBody'] ?? $data['html'] ?? $data['body-html'] ?? null;
        $messageId = $data['MessageID'] ?? $data['message_id'] ?? $data['id'] ?? null;
        $inReplyTo = $data['InReplyTo'] ?? $data['in_reply_to'] ?? null;
        $references = $data['References'] ?? $data['references'] ?? null;
        $isAutoReply = self::detectAutoReply($data, (string) $subject);

        // If body is empty and Resend email_id is present, fetch full email via Resend API
        $resendEmailId = $data['email_id'] ?? null;
        if (empty($textBody) && empty($htmlBody) && ! empty($resendEmailId)) {
            $apiKey = config('services.resend.key');
            if (! empty($apiKey)) {
                try {
                    // Resend inbound emails API endpoint
                    $response = Http::withToken($apiKey)
                        ->get("https://api.resend.com/emails/inbound/{$resendEmailId}");

                    if (! $response->successful()) {
                        $response = Http::withToken($apiKey)
                            ->get("https://api.resend.com/emails/{$resendEmailId}");
                    }

                    if ($response->successful()) {
                        $fetched = $response->json();
                        $textBody = $fetched['text'] ?? $textBody;
                        $htmlBody = $fetched['html'] ?? $htmlBody;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed fetching email body from Resend API: '.$e->getMessage());
                }
            }
        }

        // Convert HTML or raw text into clean Markdown & strip quoted email history
        $markdownBody = self::htmlToMarkdown(! empty($htmlBody) ? $htmlBody : $textBody);
        $rawCleaned = ! empty($markdownBody) ? $markdownBody : self::htmlToMarkdown($textBody);
        $textBody = self::stripQuotedReplyText($rawCleaned);

        if (empty($textBody)) {
            $textBody = $subject ?: '(No email content provided)';
        }

        $attachments = [];
        if (! empty($payload['Attachments']) && is_array($payload['Attachments'])) {
            foreach ($payload['Attachments'] as $att) {
                $attachments[] = [
                    'name' => $att['Name'] ?? $att['filename'] ?? 'attachment',
                    'content' => $att['Content'] ?? $att['data'] ?? '',
                    'mime_type' => $att['ContentType'] ?? $att['type'] ?? 'application/octet-stream',
                ];
            }
        }

        return new self(
            fromEmail: trim($fromEmail),
            fromName: trim($fromName),
            toEmail: trim($toEmail),
            subject: trim($subject),
            textBody: trim($textBody),
            htmlBody: $htmlBody,
            messageId: $messageId,
            inReplyTo: $inReplyTo,
            references: $references,
            attachments: $attachments,
            isAutoReply: $isAutoReply,
        );
    }

    /**
     * Detect whether the email payload comes from an automated auto-responder or mail loop.
     * Supports standard RFC headers and multilingual auto-reply / out-of-office phrases
     * across major world languages (Arabic, English, French, Spanish, German, Italian,
     * Portuguese, Dutch, Russian, Turkish, Chinese, Japanese, Korean, etc.).
     *
     * @param  array<string, mixed>  $data
     */
    public static function detectAutoReply(array $data, string $subject): bool
    {
        // 1. Standard RFC and vendor auto-response headers
        $headers = $data['Headers'] ?? $data['headers'] ?? [];
        if (is_array($headers)) {
            foreach ($headers as $header) {
                $name = strtolower((string) ($header['Name'] ?? $header['name'] ?? ''));
                $value = strtolower((string) ($header['Value'] ?? $header['value'] ?? ''));

                if ($name === 'auto-submitted' && $value !== 'no') {
                    return true;
                }
                if ($name === 'x-autoreply' || $name === 'x-autorespond' || $name === 'x-auto-response-suppress') {
                    return true;
                }
                if ($name === 'precedence' && in_array($value, ['bulk', 'junk', 'list', 'auto_reply'], true)) {
                    return true;
                }
                if ($name === 'x-failed-recipients') {
                    return true;
                }
            }
        }

        $subjTrimmed = trim($subject);
        if ($subjTrimmed === '') {
            return false;
        }

        // 2. Multilingual Subject Prefix Pattern: e.g. [Auto-Reply]:, Automatic reply:, Réponse automatique :, etc.
        $prefixPattern = '/^\s*\[?(?:auto(?:\s*reply|-reply)?|out\s+of\s+office|ooo|abwesenheitsnotiz|automatisch(?:e\s+antwort)?|réponse\s+automatique|reponse\s+automatique|respuesta\s+automática|respuesta\s+automatica|risposta\s+automatica|resposta\s+automática|resposta\s+automatica|автоответ(?:чик)?|автоматический\s+ответ|otomatik\s+yanıt|otomatik\s+cevap|رد\s*تلقائي|الرد\s*التلقائي|رد\s*آلي|自動応答|自動返信|自动回复|自動回覆|자동\s*회신|자동\s*응답)\]?[\s:\-]/ui';
        if (preg_match($prefixPattern, $subjTrimmed)) {
            return true;
        }

        // 3. Multilingual Subject Keywords & Phrases
        $subjLower = mb_strtolower($subjTrimmed, 'UTF-8');
        $phrases = [
            // English
            'out of office', 'out-of-office', 'automatic reply', 'autoreply', 'auto-reply',
            'away from the office', 'vacation responder', 'i am out of the office',
            // Arabic
            'الرد التلقائي', 'رد تلقائي', 'رد آلي', 'خارج أوقات العمل', 'خارج المكتب', 'في إجازة', 'غير متواجد حاليا',
            // French
            'réponse automatique', 'reponse automatique', 'absence du bureau', 'absent du bureau', 'auto-réponse',
            // German
            'automatische antwort', 'abwesenheitsnotiz', 'außer haus', 'ausser haus', 'nicht im büro', 'im urlaub',
            // Spanish
            'respuesta automática', 'respuesta automatica', 'fuera de la oficina', 'ausente de la oficina', 'de vacaciones',
            // Italian
            'risposta automatica', 'fuori sede', 'assente dall\'ufficio', 'in ferie',
            // Portuguese
            'resposta automática', 'resposta automatica', 'fora do escritório', 'fora do escritorio', 'de férias',
            // Dutch
            'automatisch antwoord', 'afwezigheidsbericht', 'niet op kantoor', 'met vakantie',
            // Russian
            'автоматический ответ', 'автоответ', 'вне офиса', 'в отпуске',
            // Turkish
            'otomatik yanıt', 'otomatik cevap', 'ofis dışında', 'tatildeyim',
            // Chinese (Simplified & Traditional)
            '自动回复', '自動回覆', '不在办公室', '休假中',
            // Japanese
            '自動応答', '自動返信', '不在通知', '休暇をいただいております',
            // Korean
            '자동 회신', '자동 응답', '부재 중', '휴가 중입니다',
        ];

        foreach ($phrases as $phrase) {
            if (str_contains($subjLower, $phrase)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Clean raw HTML or plain email into clean, simple Markdown text.
     */
    public static function htmlToMarkdown(?string $content): string
    {
        if (empty($content)) {
            return '';
        }

        // 1. Strip out <head>, <style>, <script>, <xml>, and <!-- comments -->
        $cleaned = preg_replace('/<head\b[^>]*>.*?<\/head>/is', '', $content);
        $cleaned = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $cleaned);
        $cleaned = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $cleaned);
        $cleaned = preg_replace('/<xml\b[^>]*>.*?<\/xml>/is', '', $cleaned);
        $cleaned = preg_replace('/<!--.*?-->/s', '', $cleaned);

        // 2. Convert links <a href="URL">text</a> -> [text](URL)
        $cleaned = preg_replace_callback('/<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', function ($matches) {
            $url = trim($matches[1]);
            $text = trim(strip_tags($matches[2]));

            return $text ? "[{$text}]({$url})" : $url;
        }, $cleaned);

        // 3. Convert headings <h1> - <h6>
        for ($i = 6; $i >= 1; $i--) {
            $prefix = str_repeat('#', $i).' ';
            $cleaned = preg_replace("/<h{$i}\b[^>]*>(.*?)<\/h{$i}>/is", "\n\n{$prefix}$1\n\n", $cleaned);
        }

        // 4. Convert bold and italics
        $cleaned = preg_replace('/<(?:b|strong)\b[^>]*>(.*?)<\/(?:b|strong)>/is', '**$1**', $cleaned);
        $cleaned = preg_replace('/<(?:i|em)\b[^>]*>(.*?)<\/(?:i|em)>/is', '*$1*', $cleaned);

        // 5. Convert list items <li> -> \n-
        $cleaned = preg_replace('/<li\b[^>]*>(.*?)<\/li>/is', "\n- $1", $cleaned);
        $cleaned = preg_replace('/<\/(?:ul|ol)>/is', "\n\n", $cleaned);

        // 6. Convert paragraph, div, line breaks to newlines
        $cleaned = preg_replace('/<br\s*\/?>/i', "\n", $cleaned);
        $cleaned = preg_replace('/<\/(?:p|div|tr|blockquote)>/i', "\n\n", $cleaned);

        // 7. Strip all remaining HTML tags
        $cleaned = strip_tags($cleaned);

        // 8. Decode HTML entities (&nbsp;, &gt;, &lt;, &amp;, etc.)
        $cleaned = html_entity_decode($cleaned, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // 9. Normalize multi-newlines and spaces
        $cleaned = preg_replace('/[ \t]+/', ' ', $cleaned);
        $cleaned = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $cleaned);

        return trim($cleaned);
    }

    /**
     * Strip quoted reply headers and historical email thread content across major world languages
     * (Arabic, English, French, Spanish, German, Italian, Portuguese, Dutch, Russian, Turkish,
     * Chinese, Japanese, Korean, and others) using intelligent pattern recognition.
     */
    public static function stripQuotedReplyText(?string $text): string
    {
        if (empty($text)) {
            return '';
        }

        $lines = explode("\n", $text);
        $totalLines = count($lines);
        $cleanLines = [];

        for ($i = 0; $i < $totalLines; $i++) {
            $line = $lines[$i];
            $trimmed = trim($line);

            // Lookahead for multi-line attribution (e.g. "On <date> ... \n wrote:")
            $nextLine = isset($lines[$i + 1]) ? trim($lines[$i + 1]) : '';
            $lookahead2 = $trimmed.' '.$nextLine;

            // 1. Quoted block divider lines:
            // e.g. "--- Original Message ---", "--- Message d'origine ---", "-----Ursprüngliche Nachricht-----",
            // "--- الرسالة الأصلية ---", "--- 原始邮件 ---", etc.
            if (self::isQuotedDivider($trimmed)) {
                break;
            }

            // 2. Multilingual Attribution Headers:
            // "On <date>, <author> wrote:" across all major languages
            if (self::isAttributionLine($trimmed) || (! empty($nextLine) && self::isAttributionLine($lookahead2))) {
                break;
            }

            // 3. Multilingual Outlook/Webmail Header Blocks:
            // Starts with "From:" / "De:" / "Von:" / "من:" / "发件人:" / "差出人:" / etc.
            if (self::isHeaderBlockStart($trimmed, $nextLine)) {
                break;
            }

            // 4. Standard Quote Markers (> or &gt; or » or ›)
            if (self::isQuoteMarkerLine($trimmed)) {
                break;
            }

            $cleanLines[] = $line;
        }

        $result = trim(implode("\n", $cleanLines));

        // Safety fallback: if quote stripping left the entire text empty, return original text
        return ! empty($result) ? $result : trim($text);
    }

    /**
     * Detect visual divider lines marking start of quoted message.
     */
    private static function isQuotedDivider(string $trimmed): bool
    {
        if ($trimmed === '') {
            return false;
        }

        // Long horizontal dividers (underscores, dashes, equals, asterisks)
        if (preg_match('/^_{8,}$/', $trimmed) || preg_match('/^-{8,}$/', $trimmed) || preg_match('/^={8,}$/', $trimmed)) {
            return true;
        }

        // Delimited section headers with dashes, underscores, or stars across languages
        return (bool) preg_match(
            '/^[-_=\*]{2,}\s*(?:original\s+message|forwarded\s+message|message\s+d\'origine|ursprüngliche\s+nachricht|mensaje\s+original|messaggio\s+originale|mensagem\s+original|oorspronkelijk\s+bericht|исходное\s+сообщение|пересылаемое\s+сообщение|orijinal\s+(?:ileti|mesaj)|原始邮件|原始郵件|元のメッセージ|원본\s*메시지|الرسالة\s+الأصلية|رسالة\s+مُعاد\s+توجيهها)\s*[-_=\*]{2,}$/ui',
            $trimmed
        );
    }

    /**
     * Detect inline attribution headers across all major languages ("On <date>, <author> wrote:").
     */
    private static function isAttributionLine(string $trimmed): bool
    {
        if ($trimmed === '') {
            return false;
        }

        $patterns = [
            // English: On ... wrote: / At ... wrote:
            '/^(?:on|at)\s+.*?(?:<.*?@.*?>|\b[\p{L}\s\.,\d]+)\s+wrote\s*:\s*$/ui',
            // Arabic: في ... كتب / بتاريخ ... كتب / كتبت / تمت كتابة ما يلي بواسطة
            '/^(?:في|بتاريخ)\s+.*?(?:كتب|كتبت|تمت\s+كتابة\s+ما\s+يلي\s+بواسطة).*?:\s*$/ui',
            '/^كتب\s+.*?\s+(?:في|بتاريخ)\s+.*?:\s*$/ui',
            // French: Le ... a écrit :
            '/^le\s+.*?\s+a\s+(?:écrit|ecrit)\s*:\s*$/ui',
            // Spanish: El ... escribió:
            '/^el\s+.*?\s+(?:escribió|escribio)\s*:\s*$/ui',
            // German: Am ... schrieb ...: / Am ... hat ... geschrieben:
            '/^am\s+.*?\s+schrieb\s+.*?\s*:\s*$/ui',
            '/^am\s+.*?\s+hat\s+.*?\s*geschrieben\s*:\s*$/ui',
            // Italian: Il ... ha scritto:
            '/^(?:il|in\s+data)\s+.*?\s+ha\s+scritto\s*:\s*$/ui',
            // Portuguese: Em ... escreveu:
            '/^(?:em|no\s+dia)\s+.*?\s+escreveu\s*:\s*$/ui',
            // Dutch: Op ... schreef ...:
            '/^op\s+.*?\s+(?:schreef|heeft\s+.*?geschreven)\s*:\s*$/ui',
            // Russian: пользователь ... написал(а):
            '/^.*?\s+(?:пользователь\s+.*?\s+)?написал(?:а)?\s*:\s*$/ui',
            // Turkish: ... tarihinde ... yazdı:
            '/^.*?\s+tarihinde\s+.*?yazdı\s*:\s*$/ui',
            // Chinese: 在 ... 写道 / 于 ... 写道 / ... 写道:
            '/^(?:在|于)?\s*.*?(?:写道|寫道)\s*[：:]\s*$/ui',
            // Japanese: ... は書きました: / ... のメッセージ:
            '/^.*?(?:は書きました|さんのメッセージ)\s*[：:]\s*$/ui',
            // Korean: ... 님이 작성: / ... 에 작성:
            '/^.*?(?:님이\s+작성|에\s+작성)\s*[：:]\s*$/ui',
            // Scandinavian: Den ... skrev ...:
            '/^(?:den|d\.)\s+.*?\s+skrev\s+.*?:\s*$/ui',
            // Polish: W dniu ... napisał(a):
            '/^w\s+dniu\s+.*?\s+napisał(?:a)?\s*:\s*$/ui',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $trimmed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Detect start of structured email header blocks (Outlook / webmail style).
     * e.g. "From: ... \n Sent: ...", "De : ... \n Envoyé : ...", "من: ... \n تاريخ الإرسال: ...", etc.
     */
    private static function isHeaderBlockStart(string $trimmed, string $nextLine): bool
    {
        if ($trimmed === '') {
            return false;
        }

        // Matches lines starting with "From" keywords in major languages:
        // English: From:
        // French: De :
        // Spanish: De:
        // German: Von:
        // Italian: Da:
        // Portuguese: De:
        // Dutch: Van:
        // Russian: От:
        // Turkish: Kimden:
        // Arabic: من:
        // Chinese: 发件人: / 發件人: / 寄件者:
        // Japanese: 差出人:
        // Korean: 보낸 사람:
        $fromPattern = '/^(?:from|de|von|da|van|от|kimden|من|发件人|發件人|寄件者|差出人|보낸\s*사람)\s*[:：]\s*(.+)$/ui';
        if (! preg_match($fromPattern, $trimmed, $matches)) {
            return false;
        }

        $fromValue = trim($matches[1]);

        // 1. If it contains an email address in brackets or directly: e.g. <john@example.com>
        if (str_contains($fromValue, '@') || preg_match('/<.+?@.+?>/', $fromValue)) {
            return true;
        }

        // 2. Or if the very next non-empty line starts with secondary headers:
        // Sent / Date / To / Subject across languages
        if ($nextLine !== '') {
            $secondaryPattern = '/^(?:sent|date|to|subject|envoyé|envoye|à|a|objet|enviado|para|asunto|fecha|gesendet|an|betreff|datum|inviato|oggetto|verzonden|aan|onderwerp|отправлено|кому|тема|дата|gönderildi|gonderildi|kime|konu|tarih|تاريخ\s+الإرسال|تاريخ|إلى|الموضوع|发送时间|發送時間|收件人|主题|主旨|日期|送信日時|宛先|件名|日付|보낸\s*날짜|받는\s*사람|제목)\s*[:：]/ui';
            if (preg_match($secondaryPattern, $nextLine)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a line is a markdown/email quote marker (e.g. > ...).
     */
    private static function isQuoteMarkerLine(string $trimmed): bool
    {
        return str_starts_with($trimmed, '>')
            || str_starts_with($trimmed, '&gt;')
            || str_starts_with($trimmed, '»')
            || str_starts_with($trimmed, '›');
    }
}
