<?php

namespace App\Domain\Channel\Controllers\Api;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\InboundChatProcessor;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ChatWidgetController extends Controller
{
    /**
     * Return the public widget configuration for an app id.
     */
    public function init(Request $request, string $appId): JsonResponse
    {
        $channel = $this->findChannel($appId);

        $buttons = collect($channel->settings['chat_buttons'] ?? [])
            ->map(fn (array $b) => [
                'key' => $b['key'] ?? null,
                'icon' => $b['icon'] ?? 'chat',
                'text' => $b['text'] ?? '',
            ])
            ->filter(fn (array $b) => $b['key'] && $b['text'])
            ->values();

        return response()->json([
            'app_name' => $channel->name,
            'buttons' => $buttons,
            'realtime' => [
                'key' => config('broadcasting.connections.reverb.key'),
                'host' => config('broadcasting.connections.reverb.options.host'),
                'port' => config('broadcasting.connections.reverb.options.port'),
                'scheme' => config('broadcasting.connections.reverb.options.scheme', 'https'),
            ],
            'show_business_hours' => (bool) ($channel->settings['show_business_hours'] ?? false),
            'show_agent_status' => (bool) ($channel->settings['show_agent_status'] ?? false),
            'require_email_verification' => (bool) ($channel->settings['require_email_verification'] ?? false),
        ]);
    }

    /**
     * List the widget visitor's own past conversations (by visitor_id).
     */
    public function conversations(Request $request, string $appId): JsonResponse
    {
        $channel = $this->findChannel($appId);
        $visitorId = (string) $request->query('visitor_id', '');

        if ($visitorId === '') {
            return response()->json(['conversations' => []]);
        }

        $threads = Thread::where('team_id', $channel->team_id)
            ->where('channel_id', $channel->id)
            ->where('metadata->visitor_id', $visitorId)
            ->with(['timelineEntries' => fn ($q) => $q->where('entry_type', 'message')->where('is_internal', false)->latest('created_at')->limit(1)])
            ->latest('updated_at')
            ->limit(20)
            ->get();

        return response()->json([
            'conversations' => $threads->map(fn (Thread $t) => [
                'external_id' => $t->external_id,
                'sequence_number' => $t->sequence_number,
                'title' => $t->title,
                'status' => $t->status->value,
                'preview' => Str::limit((string) $t->timelineEntries->first()?->body, 90),
                'updated_at' => $t->updated_at?->toIso8601String(),
            ])->values(),
        ]);
    }

    /**
     * Start a new conversation (or continue the visitor's existing open one) with a first message.
     */
    public function start(Request $request, string $appId, InboundChatProcessor $processor): JsonResponse
    {
        $channel = $this->findChannel($appId);

        $validated = $request->validate([
            'visitor_id' => 'required|string|max:128',
            'message' => 'nullable|string|max:10000|required_without:file',
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'button_key' => 'nullable|string|max:64',
            'file' => 'nullable|file|max:10240',
        ]);

        $thread = $processor->startConversation(
            $channel,
            $validated['visitor_id'],
            $validated['message'] ?? '',
            $validated['name'] ?? null,
            $validated['email'] ?? null,
            $validated['button_key'] ?? null,
            $this->storeAttachment($request),
        );

        return response()->json([
            'external_id' => $thread->external_id,
            'sequence_number' => $thread->sequence_number,
            'title' => $thread->title,
            'messages' => $this->formatMessages($thread),
        ], 201);
    }

    /**
     * Post a follow-up message from the widget visitor to an existing conversation.
     */
    public function reply(Request $request, string $appId, string $externalId, InboundChatProcessor $processor): JsonResponse
    {
        $channel = $this->findChannel($appId);
        $thread = $this->findThreadForVisitor($channel, $externalId, (string) $request->input('visitor_id', ''));

        $validated = $request->validate([
            'visitor_id' => 'required|string|max:128',
            'message' => 'nullable|string|max:10000|required_without:file',
            'file' => 'nullable|file|max:10240',
        ]);

        $processor->appendMessage(
            $thread,
            $validated['message'] ?? '',
            null,
            $this->storeAttachment($request),
        );

        return response()->json(['messages' => $this->formatMessages($thread)], 201);
    }

    /**
     * Poll for a conversation's messages, optionally only those created after a given entry id.
     */
    public function messages(Request $request, string $appId, string $externalId): JsonResponse
    {
        $channel = $this->findChannel($appId);
        $thread = $this->findThreadForVisitor($channel, $externalId, (string) $request->query('visitor_id', ''));

        return response()->json(['messages' => $this->formatMessages($thread)]);
    }

    private function formatMessages(Thread $thread): array
    {
        return $thread->timelineEntries()
            ->where('entry_type', 'message')
            ->where('is_internal', false)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'from' => match ($entry->actor_type) {
                    ActorType::Tenant => 'visitor',
                    ActorType::Ai => 'ai',
                    default => 'agent',
                },
                'attachments' => $entry->attachments,
                'created_at' => $entry->created_at?->toIso8601String(),
            ])->values()->all();
    }

    /**
     * Return the uploaded widget attachment (if present) for the processor to store as media.
     */
    private function storeAttachment(Request $request): ?UploadedFile
    {
        return $request->hasFile('file') ? $request->file('file') : null;
    }

    private function findChannel(string $appId): Channel
    {
        $channel = Channel::where('type', ChannelType::Chat)
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('settings->app_id', $appId)->orWhere('id', $appId))
            ->first();

        abort_if(! $channel, 404, 'Unknown chat app.');

        return $channel;
    }

    private function findThreadForVisitor(Channel $channel, string $externalId, string $visitorId): Thread
    {
        abort_if($visitorId === '' || $externalId !== "chat:{$channel->id}:{$visitorId}", 403);

        $thread = Thread::where('team_id', $channel->team_id)
            ->where('channel_id', $channel->id)
            ->where('external_id', $externalId)
            ->first();

        abort_if(! $thread, 404, 'Conversation not found.');

        return $thread;
    }
}
