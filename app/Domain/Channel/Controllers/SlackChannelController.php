<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Shared\TeamContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SlackChannelController extends Controller
{
    /**
     * Display Slack Workspaces page.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channels = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->get();

        $workspaces = $channels->map(function ($c) {
            $settings = $c->settings ?? [];

            return [
                'id' => $c->id,
                'name' => $c->name,
                'slack_team_id' => $settings['slack_team_id'] ?? '',
                'connected_by' => $settings['connected_by'] ?? 'You',
                'connected_at' => $settings['connected_at'] ?? $c->created_at?->toIso8601String(),
                'is_active' => $c->is_active,
            ];
        })->values()->toArray();

        return Inertia::render('settings/slack-channel', [
            'workspaces' => $workspaces,
            'slackClientId' => config('services.slack.client_id'),
        ]);
    }

    /**
     * Display Edit Connected Slack Workspace Page.
     */
    public function show(Request $request, string $channelId, SlackClient $slack): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);

        $settings = array_merge([
            'slack_team_name' => $channel->name,
            'connected_by' => 'You',
            'connected_at' => $channel->created_at?->toIso8601String(),
            'ingestion_mode' => 'time_based',
            'enable_reactions' => true,
            'enable_discussions' => true,
            'auto_join_rules' => [],
            'connected_channels' => [],
        ], $channel->settings ?? []);

        try {
            $settings['available_channels'] = $slack->listChannels($channel);
        } catch (\Throwable $exception) {
            report($exception);
            $settings['available_channels'] = [];
        }

        $replyingAs = ($channel->settings['replying_as'] ?? [])[(string) $request->user()->id] ?? null;

        return Inertia::render('settings/slack-workspace-detail', [
            'workspace' => [
                'id' => $channel->id,
                'name' => $channel->name,
                'settings' => $settings,
            ],
            'replyingAs' => $replyingAs ? [
                'name' => $replyingAs['name'] ?? 'Slack user',
                'avatar' => $replyingAs['avatar'] ?? null,
            ] : null,
        ]);
    }
}
