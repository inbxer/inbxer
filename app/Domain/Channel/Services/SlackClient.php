<?php

namespace App\Domain\Channel\Services;

use App\Domain\Channel\Models\Channel;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SlackClient
{
    public function postMessage(Channel $channel, string $slackChannelId, string $text, ?string $threadTs = null): array
    {
        return $this->call($channel, 'chat.postMessage', array_filter([
            'channel' => $slackChannelId,
            'text' => $text,
            'thread_ts' => $threadTs,
            'unfurl_links' => false,
        ], fn ($value) => $value !== null));
    }

    public function postMessageAsUser(string $userAccessToken, string $slackChannelId, string $text, ?string $threadTs = null): array
    {
        $result = $this->request($userAccessToken)->post('chat.postMessage', array_filter([
            'channel' => $slackChannelId,
            'text' => $text,
            'thread_ts' => $threadTs,
            'unfurl_links' => false,
        ], fn ($value) => $value !== null))->throw()->json();

        if (! ($result['ok'] ?? false)) {
            throw new RuntimeException('Slack API error: '.($result['error'] ?? 'unknown_error'));
        }

        return $result;
    }

    public function listChannels(Channel $channel): array
    {
        $channels = [];
        $cursor = null;

        do {
            $result = $this->call($channel, 'conversations.list', array_filter([
                'types' => 'public_channel,private_channel',
                'exclude_archived' => true,
                'limit' => 200,
                'cursor' => $cursor,
            ]));
            $channels = [...$channels, ...array_map(fn (array $item): array => [
                'id' => $item['id'],
                'name' => $item['name'],
                'is_private' => (bool) ($item['is_private'] ?? false),
                'is_member' => (bool) ($item['is_member'] ?? false),
            ], $result['channels'] ?? [])];
            $cursor = $result['response_metadata']['next_cursor'] ?? null;
        } while ($cursor);

        return $channels;
    }

    public function addReaction(Channel $channel, string $slackChannelId, string $messageTs, string $emoji): void
    {
        $this->call($channel, 'reactions.add', [
            'channel' => $slackChannelId,
            'timestamp' => $messageTs,
            'name' => $emoji,
        ]);
    }

    public function getPermalink(Channel $channel, string $slackChannelId, string $messageTs): ?string
    {
        $result = $this->call($channel, 'chat.getPermalink', [
            'channel' => $slackChannelId,
            'message_ts' => $messageTs,
        ]);

        return $result['permalink'] ?? null;
    }

    public function getMessage(Channel $channel, string $slackChannelId, string $messageTs): ?array
    {
        $result = $this->call($channel, 'conversations.replies', [
            'channel' => $slackChannelId,
            'ts' => $messageTs,
            'limit' => 1,
        ]);

        return $result['messages'][0] ?? null;
    }

    public function bulkJoinMatchingChannels(Channel $channel): int
    {
        $rules = $channel->settings['auto_join_rules'] ?? [];
        $joined = 0;

        foreach ($this->listChannels($channel) as $item) {
            $matches = collect($rules)->contains(fn (array $rule): bool => match ($rule['type'] ?? null) {
                'prefix' => str_starts_with($item['name'], (string) ($rule['value'] ?? '')),
                'suffix' => str_ends_with($item['name'], (string) ($rule['value'] ?? '')),
                default => false,
            });

            if ($matches && ! $item['is_member'] && ! $item['is_private']) {
                $this->call($channel, 'conversations.join', ['channel' => $item['id']]);
                $joined++;
            }
        }

        return $joined;
    }

    public function joinChannel(Channel $channel, string $slackChannelId): void
    {
        $this->call($channel, 'conversations.join', ['channel' => $slackChannelId]);
    }

    private function call(Channel $channel, string $method, array $payload): array
    {
        $token = (string) ($channel->settings['bot_access_token'] ?? '');
        if ($token === '') {
            throw new RuntimeException('Slack bot access token is missing.');
        }

        $result = $this->request($token)->post($method, $payload)->throw()->json();
        if (! ($result['ok'] ?? false)) {
            throw new RuntimeException('Slack API error: '.($result['error'] ?? 'unknown_error'));
        }

        return $result;
    }

    private function request(string $token): PendingRequest
    {
        return Http::baseUrl('https://slack.com/api')
            ->withToken($token)->acceptJson()->asJson()
            ->connectTimeout(3)->timeout(10)->retry([200, 500]);
    }
}
