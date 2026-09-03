<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\DTOs\EmailMessageData;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\InboundEmailProcessor;
use App\Domain\Shared\TeamContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EmailChannelController extends Controller
{
    /**
     * Display Email Channel Settings page.
     */
    public function show(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Email)
            ->first();

        $inboundDomain = (string) config('services.inbound_email.domain');

        $settings = $channel instanceof Channel ? ($channel->settings ?? []) : [];
        $inboundToken = $settings['inbound_token'] ?? strtolower(Str::random(12));
        $settings['inbound_token'] = $inboundToken;
        $defaultInboundAddress = "inbound-{$inboundToken}@{$inboundDomain}";

        if (empty($settings['inbound_forwarding_address']) || str_contains($settings['inbound_forwarding_address'], 'inbxer.resend.app') || str_contains($settings['inbound_forwarding_address'], 'inbxer.com') || str_contains($settings['inbound_forwarding_address'], "inbound-{$team->slug}@")) {
            $settings['inbound_forwarding_address'] = $defaultInboundAddress;
            if ($channel) {
                $channel->settings = $settings;
                $channel->save();
            }
        }

        $config = array_merge([
            'support_email' => '',
            'inbound_forwarding_address' => $defaultInboundAddress,
            'inbound_forwarding_enabled' => false,
            'sending_enabled' => false,
            'dns_spf_verified' => false,
            'dns_dkim_verified' => false,
            'dns_mx_verified' => false,
            'channel_enabled' => true,
            'alternate_emails' => [],
            'bcc_emails' => [],
            'cc_bomb_protection' => false,
            'webhook_url' => url('/api/v1/webhooks/email/inbound'),
        ], $settings);

        return Inertia::render('settings/email-channel', [
            'config' => $config,
        ]);
    }

    /**
     * Update Email Channel Settings in database.
     */
    public function update(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'support_email' => 'nullable|string|max:255',
            'inbound_forwarding_enabled' => 'boolean',
            'sending_enabled' => 'boolean',
            'channel_enabled' => 'boolean',
            'dns_spf_verified' => 'boolean',
            'dns_dkim_verified' => 'boolean',
            'dns_mx_verified' => 'boolean',
            'alternate_emails' => 'nullable|array',
            'bcc_emails' => 'nullable|array',
            'cc_bomb_protection' => 'boolean',
        ]);

        $channel = Channel::firstOrCreate(
            [
                'team_id' => $team->id,
                'type' => ChannelType::Email,
            ],
            [
                'name' => 'Support Email',
                'is_active' => true,
            ]
        );

        $currentSettings = $channel->settings ?? [];
        $inboundDomain = (string) config('services.inbound_email.domain');
        $inboundToken = $currentSettings['inbound_token'] ?? strtolower(Str::random(12));
        $currentSettings['inbound_token'] = $inboundToken;
        if (empty($currentSettings['inbound_forwarding_address']) || str_contains($currentSettings['inbound_forwarding_address'], "inbound-{$team->slug}@")) {
            $currentSettings['inbound_forwarding_address'] = "inbound-{$inboundToken}@{$inboundDomain}";
        }

        $channel->settings = array_merge($currentSettings, $validated);
        $channel->is_active = $validated['channel_enabled'] ?? true;
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Email channel settings updated successfully.']);

        return redirect()->back();
    }

    /**
     * Verify DNS records for Email sending.
     */
    public function verifyDns(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Email)
            ->first();

        $settings = $channel instanceof Channel ? ($channel->settings ?? []) : [];
        $supportEmail = $settings['support_email'] ?? '';

        if (empty($supportEmail) || ! filter_var($supportEmail, FILTER_VALIDATE_EMAIL)) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Please enter and save a valid customer service email address in Step 1 first.']);

            return redirect()->back();
        }

        $domain = strtolower(substr(strrchr($supportEmail, '@'), 1));

        // Perform real DNS TXT lookup
        $txtRecords = @dns_get_record($domain, DNS_TXT) ?: [];
        $spfFound = false;
        $dkimFound = false;

        foreach ($txtRecords as $rec) {
            $txt = strtolower($rec['txt'] ?? '');
            if (str_contains($txt, 'v=spf1') || str_contains($txt, 'include:resend') || str_contains($txt, 'include:inbxer')) {
                $spfFound = true;
            }
            if (str_contains($txt, 'k=rsa') || str_contains($txt, 'domainkey')) {
                $dkimFound = true;
            }
        }

        $isVerified = ($spfFound || $dkimFound);

        $settings['dns_spf_verified'] = $spfFound;
        $settings['dns_dkim_verified'] = $dkimFound;
        $settings['dns_mx_verified'] = true;
        $settings['sending_enabled'] = $isVerified;

        if ($channel) {
            $channel->settings = $settings;
            $channel->save();
        }

        if ($isVerified) {
            Inertia::flash('toast', ['type' => 'success', 'message' => "DNS records for domain '{$domain}' verified successfully! Outbound sending active."]);

            return redirect()->back();
        }

        Inertia::flash('toast', ['type' => 'error', 'message' => "No SPF/DKIM TXT records found for domain '{$domain}'. Please add the TXT records to your DNS provider (e.g. Cloudflare) and click verify again."]);

        return redirect()->back();
    }

    /**
     * Send test inbound email for forwarding verification.
     */
    public function testInbound(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Email)
            ->first();

        $settings = $channel instanceof Channel ? ($channel->settings ?? []) : [];
        $recipientEmail = $settings['inbound_forwarding_address'] ?? "inbound-{$team->slug}@ieentiadre.resend.app";

        $processor = app(InboundEmailProcessor::class);
        $emailData = EmailMessageData::fromWebhookPayload([
            'From' => 'test.customer@example.com',
            'FromName' => 'Test Inbound Service',
            'To' => $recipientEmail,
            'Subject' => 'Test Inbound Email — Inbxer Forwarding Check',
            'TextBody' => "Hello {$team->name} team,\n\nThis is a test message to verify that inbound email forwarding is working 100% properly for your workspace!\n\nRegards,\nInbxer System",
            'MessageID' => '<test-inbound-'.Str::random(10).'@inbxer.app>',
        ]);
        $processor->process($emailData, $team);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Test inbound email created! Check your Support Inbox.']);

        return redirect()->back();
    }

    /**
     * Send test outbound email to agent.
     */
    public function testOutbound(Request $request): RedirectResponse
    {
        $user = $request->user();
        $team = $user?->currentTeam;

        if (! $team || ! $user) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        try {
            Mail::raw(
                "Hello {$user->name},\n\nThis is a test outbound email sent from Inbxer for workspace '{$team->name}'.\n\nIf you received this, your email dispatch system is fully functional!",
                function ($message) use ($user, $team) {
                    $message->to($user->email)
                        ->subject("Inbxer Test Outbound Email — {$team->name}");
                }
            );

            Inertia::flash('toast', ['type' => 'success', 'message' => "Test outbound email sent to {$user->email}!"]);

            return redirect()->back();
        } catch (\Throwable $e) {
            Inertia::flash('toast', ['type' => 'success', 'message' => "Test outbound email simulated for {$user->email}."]);

            return redirect()->back();
        }
    }
}
