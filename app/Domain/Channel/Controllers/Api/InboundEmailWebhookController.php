<?php

namespace App\Domain\Channel\Controllers\Api;

use App\Domain\Channel\DTOs\EmailMessageData;
use App\Domain\Channel\Services\InboundEmailProcessor;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InboundEmailWebhookController extends Controller
{
    public function __construct(
        protected InboundEmailProcessor $processor
    ) {}

    /**
     * Handle incoming email webhooks (Postmark, SendGrid, Amazon SES, generic MIME).
     */
    public function handle(Request $request): JsonResponse
    {
        if (! $this->verifyWebhookSignature($request)) {
            return response()->json(['error' => 'Invalid webhook signature'], 401);
        }

        $payload = $request->all();

        Log::info('INBOUND EMAIL WEBHOOK RECEIVED:', $payload);

        if (empty($payload)) {
            return response()->json(['error' => 'Empty payload'], 400);
        }

        $emailData = EmailMessageData::fromWebhookPayload($payload);
        $thread = $this->processor->process($emailData);

        return response()->json([
            'success' => true,
            'message' => 'Email processed successfully',
            'thread_id' => $thread->id,
            'sequence_number' => $thread->sequence_number,
        ], 200);
    }

    /**
     * Verify Svix / Resend Webhook signature if RESEND_WEBHOOK_SECRET is set.
     */
    protected function verifyWebhookSignature(Request $request): bool
    {
        $webhookSecret = config('services.inbound_email.webhook_secret');

        if (empty($webhookSecret) || app()->environment(['local', 'testing'])) {
            return true; // Skip verification in local environment or if secret is not configured
        }

        $svixId = $request->header('svix-id');
        $svixTimestamp = $request->header('svix-timestamp');
        $svixSignature = $request->header('svix-signature');

        if (! $svixId || ! $svixTimestamp || ! $svixSignature) {
            Log::warning('Webhook signature verification failed: Missing Svix headers');

            return false;
        }

        $signedContent = "{$svixId}.{$svixTimestamp}.".$request->getContent();
        $secret = str_starts_with($webhookSecret, 'whsec_')
            ? base64_decode(substr($webhookSecret, 6))
            : $webhookSecret;

        $computedSignature = base64_encode(hash_hmac('sha256', $signedContent, $secret, true));
        $signatures = explode(',', $svixSignature);

        foreach ($signatures as $sig) {
            $parts = explode('=', trim($sig));
            if (count($parts) === 2 && hash_equals($parts[1], $computedSignature)) {
                return true;
            }
        }

        Log::warning('Webhook signature verification failed: Signature mismatch');

        return false;
    }
}
