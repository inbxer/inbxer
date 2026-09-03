<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Services\SlackClient;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Actions on a single timeline entry: editing note bodies, and the Slack-specific
 * reaction / permalink helpers used by the message action menu.
 */
class ThreadTimelineController extends Controller
{
    /**
     * Update an internal note / timeline entry body and maintain edit history.
     */
    public function update(Request $request, Thread $thread, ThreadTimelineEntry $entry): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team || $entry->thread_id !== $thread->id) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'body' => 'required|string|max:10000',
        ]);

        $newBody = trim($validated['body']);

        if ($entry->body === $newBody) {
            return redirect()->back();
        }

        $metadata = $entry->metadata ?? [];
        $editHistory = $metadata['edit_history'] ?? [];

        $editHistory[] = [
            'body' => $entry->body,
            'edited_at' => now()->toIso8601String(),
            'edited_by_name' => $user->name,
            'edited_by_id' => $user->id,
        ];

        $metadata['edit_history'] = $editHistory;
        $metadata['is_edited'] = true;
        $metadata['last_edited_at'] = now()->toIso8601String();
        $metadata['last_edited_by_name'] = $user->name;

        $entry->update([
            'body' => $newBody,
            'metadata' => $metadata,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Internal note updated.']);

        return redirect()->back();
    }

    /**
     * Add an emoji reaction to a timeline entry's underlying Slack message.
     */
    public function addSlackReaction(Request $request, Thread $thread, ThreadTimelineEntry $entry, SlackClient $slack): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $entry->thread_id !== $thread->id) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'emoji' => 'required|string|max:64',
        ]);

        $channel = $thread->channel;
        $slackChannelId = (string) ($entry->metadata['slack_channel_id'] ?? '');
        $slackTs = (string) ($entry->metadata['slack_ts'] ?? '');

        if (! $channel || $channel->type !== ChannelType::Slack || $slackChannelId === '' || $slackTs === '') {
            abort(422, 'This message is not linked to a Slack message.');
        }

        $slack->addReaction($channel, $slackChannelId, $slackTs, $validated['emoji']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Reaction added in Slack.']);

        return redirect()->back();
    }

    /**
     * Resolve the Slack permalink for a timeline entry's underlying message.
     */
    public function getSlackPermalink(Request $request, Thread $thread, ThreadTimelineEntry $entry, SlackClient $slack): JsonResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $entry->thread_id !== $thread->id) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = $thread->channel;
        $slackChannelId = (string) ($entry->metadata['slack_channel_id'] ?? '');
        $slackTs = (string) ($entry->metadata['slack_ts'] ?? '');

        if (! $channel || $channel->type !== ChannelType::Slack || $slackChannelId === '' || $slackTs === '') {
            abort(422, 'This message is not linked to a Slack message.');
        }

        $url = $slack->getPermalink($channel, $slackChannelId, $slackTs);

        return response()->json(['url' => $url]);
    }
}
