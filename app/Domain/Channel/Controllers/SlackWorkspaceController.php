<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SlackWorkspaceController extends Controller
{
    /**
     * Update Slack workspace settings.
     */
    public function update(Request $request, string $channelId, SlackClient $slack): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);

        $validated = $request->validate([
            'ingestion_mode' => 'required|string|in:time_based,one_to_one,manual_emoji',
            'enable_reactions' => 'boolean',
            'enable_discussions' => 'boolean',
            'auto_join_rules' => 'nullable|array',
            'connected_channels' => 'nullable|array',
        ]);

        $previousIds = collect($channel->settings['connected_channels'] ?? [])->pluck('id')->all();
        $newIds = collect($validated['connected_channels'] ?? [])->pluck('id')->diff($previousIds);

        foreach ($newIds as $slackChannelId) {
            try {
                $slack->joinChannel($channel, (string) $slackChannelId);
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $settings = array_merge($channel->settings ?? [], $validated);
        $channel->settings = $settings;
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Slack workspace settings saved.']);

        return redirect()->back();
    }

    /**
     * Disconnect Slack workspace.
     */
    public function destroy(Request $request, string $channelId): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->where('id', $channelId)
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Slack workspace disconnected.']);

        return redirect()->route('settings.channels.slack');
    }

    /**
     * Add auto-join rule to Slack workspace.
     */
    public function addAutoJoinRule(Request $request, string $channelId): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);

        $validated = $request->validate([
            'type' => 'required|string',
            'value' => 'required|string|max:255',
        ]);

        $settings = $channel->settings ?? [];
        $rules = $settings['auto_join_rules'] ?? [];
        $rules[] = [
            'type' => $validated['type'],
            'value' => $validated['value'],
        ];

        $settings['auto_join_rules'] = $rules;
        $channel->settings = $settings;
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Auto-join rule added.']);

        return redirect()->back();
    }

    /**
     * Remove auto-join rule from Slack workspace.
     */
    public function removeAutoJoinRule(Request $request, string $channelId, int $ruleIndex): RedirectResponse
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
        $rules = $settings['auto_join_rules'] ?? [];

        if (isset($rules[$ruleIndex])) {
            array_splice($rules, $ruleIndex, 1);
            $settings['auto_join_rules'] = $rules;
            $channel->settings = $settings;
            $channel->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Auto-join rule removed.']);

        return redirect()->back();
    }

    public function syncChannels(Request $request, string $channelId, SlackClient $slack): RedirectResponse
    {
        $channel = $this->channelForCurrentTeam($request, $channelId);
        $settings = $channel->settings ?? [];
        $existingById = collect($settings['connected_channels'] ?? [])->keyBy('id');
        $settings['connected_channels'] = collect($slack->listChannels($channel))
            ->filter(fn (array $item): bool => $existingById->has($item['id']) || $item['is_member'])
            ->map(fn (array $item): array => [
                'id' => $item['id'],
                'name' => '#'.$item['name'],
                'type' => $existingById->get($item['id'])['type'] ?? 'Customer',
                'ingestion_mode' => $existingById->get($item['id'])['ingestion_mode'] ?? 'team_default',
            ])->values()->all();
        $channel->update(['settings' => $settings]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Slack channels synchronized.']);

        return back();
    }

    public function bulkJoinChannels(Request $request, string $channelId, SlackClient $slack): RedirectResponse
    {
        $channel = $this->channelForCurrentTeam($request, $channelId);
        $joined = $slack->bulkJoinMatchingChannels($channel);
        $this->syncChannels($request, $channelId, $slack);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Joined and synchronized {$joined} Slack channel(s)."]);

        return back();
    }

    private function channelForCurrentTeam(Request $request, string $channelId): Channel
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        return Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Slack)
            ->findOrFail($channelId);
    }
}
