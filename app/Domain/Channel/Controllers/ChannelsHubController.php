<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Integration\Models\ApiKey;
use App\Domain\Shared\TeamContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChannelsHubController extends Controller
{
    /**
     * Display Channels Hub listing with real database channel counts.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $connectedTypes = Channel::where('team_id', $team->id)
            ->where('is_active', true)
            ->pluck('type')
            ->map(fn ($type) => $type instanceof ChannelType ? $type->value : (string) $type)
            ->toArray();

        $hasActiveApiKey = ApiKey::where('team_id', $team->id)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->exists();

        $chatConnected = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Chat)
            ->where('is_active', true)
            ->get()
            ->contains(fn (Channel $channel) => ! in_array(
                $channel->settings['chat_url'] ?? null,
                [null, '', 'https://www.example.com'],
                true,
            ));

        $channelsStatus = [
            'slack' => [
                'connected' => in_array(ChannelType::Slack->value, $connectedTypes, true),
                'name' => 'Slack',
                'description' => 'Connect Slack channels for customer support...',
            ],
            'email' => [
                'connected' => in_array(ChannelType::Email->value, $connectedTypes, true),
                'name' => 'Email',
                'description' => 'Set up email support with custom domains.',
            ],
            'teams' => [
                'connected' => in_array(ChannelType::MsTeams->value, $connectedTypes, true),
                'name' => 'Microsoft Teams',
                'description' => 'Connect Microsoft Teams for customer communication.',
            ],
            'discord' => [
                'connected' => in_array(ChannelType::Discord->value, $connectedTypes, true),
                'name' => 'Discord',
                'description' => 'Provide support through Discord channels.',
            ],
            'chat' => [
                'connected' => $chatConnected,
                'name' => 'Chat',
                'description' => 'Add a live chat widget to your website.',
            ],
            'forms' => [
                'connected' => in_array(ChannelType::Form->value, $connectedTypes, true),
                'name' => 'Forms',
                'description' => 'Create embeddable contact forms for your website.',
            ],
            'portal' => [
                'connected' => false,
                'name' => 'Headless Portal',
                'description' => 'Build custom support portals using our API.',
            ],
            'api' => [
                'connected' => $hasActiveApiKey,
                'name' => 'API',
                'description' => 'Create API keys to build custom integrations.',
            ],
        ];

        return Inertia::render('settings/channels', [
            'channels' => $channelsStatus,
        ]);
    }
}
