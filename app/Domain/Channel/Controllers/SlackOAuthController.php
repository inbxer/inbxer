<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SlackOAuthController extends Controller
{
    /**
     * Initiate Slack OAuth 2.0 redirect.
     */
    public function redirect(Request $request): RedirectResponse|SymfonyResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $clientId = config('services.slack.client_id');
        $redirectUri = config('services.slack.redirect') ?: url('/auth/slack/callback');

        if (empty($clientId)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in your environment.',
            ]);

            return redirect()->back();
        }

        $scopes = implode(',', [
            'channels:history',
            'channels:read',
            'chat:write',
            'commands',
            'users:read',
            'team:read',
            'incoming-webhook',
            'groups:read',
            'groups:history',
            'reactions:read',
            'reactions:write',
            'channels:join',
        ]);
        $statePayload = encrypt([
            'team_id' => $team->id,
            'team_slug' => $team->slug,
            'user_id' => $request->user()?->id,
            'timestamp' => now()->timestamp,
        ]);
        $url = "https://slack.com/oauth/v2/authorize?client_id={$clientId}&scope={$scopes}&user_scope=chat:write&redirect_uri=".urlencode($redirectUri).'&state='.urlencode($statePayload);

        return Inertia::location($url);
    }

    /**
     * Handle Slack OAuth 2.0 Callback.
     */
    public function callback(Request $request): RedirectResponse
    {
        Log::info('Slack OAuth Callback hit', [
            'code' => $request->query('code') ? 'present' : 'missing',
            'state' => $request->query('state') ? 'present' : 'missing',
            'error' => $request->query('error'),
        ]);

        $user = $request->user();
        $stateParam = $request->query('state');
        $team = null;
        $payload = [];

        if (! empty($stateParam)) {
            try {
                $payload = decrypt($stateParam);
                $teamId = $payload['team_id'] ?? null;
                if ($teamId) {
                    $team = Team::find($teamId);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed decrypting Slack OAuth state: '.$e->getMessage());
            }
        }

        if (! $team) {
            $team = $user?->currentTeam;
        }

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $code = $request->query('code');
        if (! $code) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Slack OAuth authorization was cancelled.']);

            return redirect()->route('settings.channels.slack');
        }

        $clientId = config('services.slack.client_id');
        $clientSecret = config('services.slack.client_secret');
        $redirectUri = config('services.slack.redirect') ?: url('/auth/slack/callback');

        try {
            Log::info('Slack OAuth: Exchanging code', [
                'client_id' => $clientId ? 'set' : 'missing',
                'client_secret' => $clientSecret ? 'set' : 'missing',
                'redirect_uri' => $redirectUri,
            ]);

            $response = Http::asForm()->post('https://slack.com/api/oauth.v2.access', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]);

            $json = $response->json();

            Log::info('Slack OAuth: API response received', [
                'ok' => $json['ok'] ?? false,
                'team_id' => $json['team']['id'] ?? null,
            ]);

            if (! ($json['ok'] ?? false)) {
                Log::error('Slack OAuth: API returned error', ['error' => $json['error'] ?? 'unknown']);

                Inertia::flash('toast', ['type' => 'error', 'message' => 'Slack OAuth Error: '.($json['error'] ?? 'Failed code exchange.')]);

                return redirect()->route('settings.channels.slack');
            }

            $slackTeam = $json['team'] ?? [];
            $botAccessToken = $json['access_token'] ?? null;
            $botUserId = $json['bot_user_id'] ?? null;
            $authedUser = $json['authed_user'] ?? [];

            if (($payload['purpose'] ?? null) === 'replying_as') {
                return $this->handleReplyingAsCallback($team, $payload, $authedUser);
            }

            $channel = Channel::create([
                'team_id' => $team->id,
                'type' => ChannelType::Slack,
                'name' => $slackTeam['name'] ?? 'Slack Workspace',
                'is_active' => true,
                'settings' => [
                    'slack_team_id' => $slackTeam['id'] ?? 'T_UNKNOWN',
                    'slack_team_name' => $slackTeam['name'] ?? 'Slack Workspace',
                    'bot_access_token' => $botAccessToken,
                    'bot_user_id' => $botUserId,
                    'authed_user_id' => $authedUser['id'] ?? null,
                    'connected_by' => $request->user()->name,
                    'connected_at' => now()->toIso8601String(),
                    'ingestion_mode' => 'time_based',
                    'enable_reactions' => true,
                    'enable_discussions' => true,
                    'auto_join_rules' => [],
                    'connected_channels' => isset($json['incoming_webhook']['channel_id']) ? [[
                        'id' => $json['incoming_webhook']['channel_id'],
                        'name' => $json['incoming_webhook']['channel'] ?? '#slack',
                        'type' => 'Customer',
                        'ingestion_mode' => 'team_default',
                    ]] : [],
                ],
            ]);

            Log::info('Slack OAuth: Channel created', ['channel_id' => $channel->id]);

            Inertia::flash('toast', ['type' => 'success', 'message' => "Slack Workspace '{$channel->name}' connected via OAuth!"]);

            return redirect()->route('settings.channels.slack.show', ['channel' => $channel->id]);
        } catch (\Throwable $e) {
            Log::error('Slack OAuth: Exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            Inertia::flash('toast', ['type' => 'error', 'message' => 'Slack Connection Exception: '.$e->getMessage()]);

            return redirect()->route('settings.channels.slack');
        }
    }

    /**
     * Store the authorized user-scoped Slack token for replying as the current user.
     */
    private function handleReplyingAsCallback(?Team $team, array $payload, array $authedUser): RedirectResponse
    {
        $channelId = $payload['channel_id'] ?? null;
        $userId = $payload['user_id'] ?? null;

        $channel = $channelId && $team
            ? Channel::where('team_id', $team->id)->where('type', ChannelType::Slack)->find($channelId)
            : null;

        if (! $channel || ! $userId || empty($authedUser['access_token'])) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Could not authorize your Slack profile for replies.']);

            return redirect()->route('settings.channels.slack');
        }

        $profile = ['name' => 'Slack user', 'avatar' => null];
        try {
            $info = Http::withToken((string) ($channel->settings['bot_access_token'] ?? ''))
                ->acceptJson()->get('https://slack.com/api/users.info', ['user' => $authedUser['id'] ?? ''])
                ->json();
            if ($info['ok'] ?? false) {
                $profile['name'] = $info['user']['real_name'] ?? $info['user']['name'] ?? 'Slack user';
                $profile['avatar'] = $info['user']['profile']['image_192'] ?? null;
            }
        } catch (\Throwable $exception) {
            report($exception);
        }

        $settings = $channel->settings ?? [];
        $settings['replying_as'][(string) $userId] = [
            'slack_user_id' => $authedUser['id'] ?? null,
            'access_token' => $authedUser['access_token'],
            'name' => $profile['name'],
            'avatar' => $profile['avatar'],
            'authorized_at' => now()->toIso8601String(),
        ];
        $channel->settings = $settings;
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Slack profile authorized for replies!']);

        return redirect()->route('settings.channels.slack.show', ['channel' => $channel->id]);
    }

    /**
     * Initiate Slack OAuth for authorizing the current user's replies.
     */
    public function authorizeReplies(Request $request, string $channelId): RedirectResponse|SymfonyResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);

        $clientId = config('services.slack.client_id');
        $redirectUri = config('services.slack.redirect') ?: url('/auth/slack/callback');

        $statePayload = encrypt([
            'purpose' => 'replying_as',
            'team_id' => $team->id,
            'team_slug' => $team->slug,
            'channel_id' => $channel->id,
            'user_id' => $request->user()->id,
            'timestamp' => now()->timestamp,
        ]);
        $url = "https://slack.com/oauth/v2/authorize?client_id={$clientId}&scope=&user_scope=chat:write&redirect_uri=".urlencode($redirectUri).'&state='.urlencode($statePayload);

        return Inertia::location($url);
    }

    /**
     * Remove the current user's authorized Slack identity for replies.
     */
    public function unlinkReplies(Request $request, string $channelId): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);

        $settings = $channel->settings ?? [];
        unset($settings['replying_as'][(string) $request->user()->id]);
        $channel->settings = $settings;
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Slack profile unlinked.']);

        return redirect()->back();
    }
}
