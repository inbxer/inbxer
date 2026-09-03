<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Channel\Services\ChatWidgetSnippetBuilder;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChatChannelController extends Controller
{
    /**
     * Display Chat Apps List page.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        // Fetch chat channels if they exist
        $channels = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Chat)
            ->get();

        $apps = $channels->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'created_at' => $c->created_at?->toIso8601String(),
            ];
        })->values()->toArray();

        return Inertia::render('settings/chat-channel-list', [
            'apps' => $apps,
        ]);
    }

    /**
     * Store a new Chat App channel.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $appId = 'liveChatApp_'.Str::random(24);

        Channel::create([
            'team_id' => $team->id,
            'type' => ChannelType::Chat,
            'name' => $validated['name'],
            'is_active' => true,
            'settings' => [
                'app_id' => $appId,
                'auth_secret' => 'sec_'.Str::random(32),
                'show_business_hours' => false,
                'show_agent_status' => false,
                'require_email_verification' => false,
                'enable_unread_notifications' => true,
                'chat_url' => 'https://www.example.com',
                'notifications_delay' => 60,
            ],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chat app created successfully.']);

        return redirect()->back();
    }

    /**
     * Display Live Chat App Settings page.
     */
    public function show(Request $request, ChatWidgetSnippetBuilder $snippetBuilder, ?string $appId = null): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $channel = null;
        if ($appId) {
            $channel = Channel::where('team_id', $team->id)
                ->where('type', ChannelType::Chat)
                ->where('id', $appId)
                ->first();
        }

        if (! $channel) {
            $channel = Channel::where('team_id', $team->id)
                ->where('type', ChannelType::Chat)
                ->first();
        }

        if (empty($channel->settings['app_id'])) {
            $channel->settings = array_merge($channel->settings ?? [], [
                'app_id' => $channel->id,
                'auth_secret' => $channel->settings['auth_secret'] ?? 'sec_'.Str::random(32),
            ]);
            $channel->save();
        }

        $appIdValue = $channel->settings['app_id'];
        $logoUrl = $channel->settings['logo_url'] ?? '';
        $greeting = $channel->settings['greeting'] ?? '';
        $links = $channel->settings['links'] ?? [];
        $colors = array_merge([
            'brand_color' => '#1A79D3',
            'background_color' => '#131519',
            'surface_color' => '#191c22',
            'text_color' => '#EDEFF3',
            'muted_text_color' => '#9ca3af',
            'border_color' => '',
            'launcher_background_color' => '',
            'launcher_icon_color' => '#ffffff',
        ], array_filter($channel->settings['colors'] ?? []));

        $scriptSnippet = $snippetBuilder->build($appIdValue, $colors, $logoUrl, $greeting, $links);

        $chatConfig = [
            'channel_id' => $channel->id,
            'app_name' => $channel->name,
            'app_id' => $appIdValue,
            'auth_secret' => $channel->settings['auth_secret'] ?? 'sec_'.Str::random(32),
            'script_snippet' => $scriptSnippet,
            'colors' => $colors,
            'logo_url' => $logoUrl,
            'greeting' => $greeting,
            'links' => $links,
            'show_business_hours' => $channel->settings['show_business_hours'] ?? false,
            'show_agent_status' => $channel->settings['show_agent_status'] ?? false,
            'require_email_verification' => $channel->settings['require_email_verification'] ?? false,
            'enable_unread_notifications' => $channel->settings['enable_unread_notifications'] ?? true,
            'chat_url' => $channel->settings['chat_url'] ?? 'https://www.example.com',
            'notifications_delay' => $channel->settings['notifications_delay'] ?? 60,
            'thread_defaults' => $channel->settings['thread_defaults'] ?? ['label_ids' => [], 'priority' => 'normal', 'tier_id' => null],
            'chat_buttons' => $channel->settings['chat_buttons'] ?? [
                ['key' => 'question', 'icon' => 'chat', 'text' => 'Ask a question', 'label_ids' => [], 'priority' => null, 'tier_id' => null],
                ['key' => 'feedback', 'icon' => 'bulb', 'text' => 'Send feedback', 'label_ids' => [], 'priority' => null, 'tier_id' => null],
                ['key' => 'issue', 'icon' => 'bug', 'text' => 'Report an issue', 'label_ids' => [], 'priority' => null, 'tier_id' => null],
            ],
        ];

        return Inertia::render('settings/chat-channel', [
            'config' => $chatConfig,
            'availableLabels' => Label::where('team_id', $team->id)->orderBy('name')->get(['id', 'name', 'color']),
            'availableTiers' => Tier::where('team_id', $team->id)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update Live Chat App Settings in database.
     */
    public function update(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'channel_id' => 'nullable|string',
            'app_name' => 'required|string|max:255',
            'colors' => 'nullable|array',
            'colors.brand_color' => 'nullable|string|max:30',
            'colors.background_color' => 'nullable|string|max:30',
            'colors.surface_color' => 'nullable|string|max:30',
            'colors.text_color' => 'nullable|string|max:30',
            'colors.muted_text_color' => 'nullable|string|max:30',
            'colors.border_color' => 'nullable|string|max:40',
            'colors.launcher_background_color' => 'nullable|string|max:30',
            'colors.launcher_icon_color' => 'nullable|string|max:30',
            'logo_url' => 'nullable|url|max:2048',
            'greeting' => 'nullable|string|max:100',
            'links' => 'nullable|array|max:5',
            'links.*.icon' => 'nullable|string|max:20',
            'links.*.text' => 'required_with:links.*.url|string|max:60',
            'links.*.url' => 'required_with:links.*.text|url|max:2048',
            'show_business_hours' => 'boolean',
            'show_agent_status' => 'boolean',
            'require_email_verification' => 'boolean',
            'enable_unread_notifications' => 'boolean',
            'chat_url' => 'nullable|url',
            'notifications_delay' => 'integer|min:1|max:1440',
            'thread_defaults' => 'nullable|array',
            'thread_defaults.label_ids' => 'nullable|array',
            'thread_defaults.label_ids.*' => 'exists:labels,id',
            'thread_defaults.priority' => 'nullable|string|in:urgent,high,normal,low',
            'thread_defaults.tier_id' => 'nullable|string|exists:tiers,id',
            'chat_buttons' => 'nullable|array|max:8',
            'chat_buttons.*.key' => 'required|string|max:64',
            'chat_buttons.*.icon' => 'nullable|string|max:20',
            'chat_buttons.*.text' => 'required|string|max:60',
            'chat_buttons.*.label_ids' => 'nullable|array',
            'chat_buttons.*.label_ids.*' => 'exists:labels,id',
            'chat_buttons.*.priority' => 'nullable|string|in:urgent,high,normal,low',
            'chat_buttons.*.tier_id' => 'nullable|string|exists:tiers,id',
        ]);

        if (! empty($validated['channel_id'])) {
            $channel = Channel::where('team_id', $team->id)->find($validated['channel_id']);
            if ($channel) {
                $channel->name = $validated['app_name'];
                $channel->settings = array_merge($channel->settings ?? [], [
                    'colors' => $validated['colors'] ?? [],
                    'logo_url' => $validated['logo_url'] ?? '',
                    'greeting' => $validated['greeting'] ?? '',
                    'links' => $validated['links'] ?? [],
                    'show_business_hours' => $validated['show_business_hours'] ?? false,
                    'show_agent_status' => $validated['show_agent_status'] ?? false,
                    'require_email_verification' => $validated['require_email_verification'] ?? false,
                    'enable_unread_notifications' => $validated['enable_unread_notifications'] ?? true,
                    'chat_url' => $validated['chat_url'] ?? 'https://www.example.com',
                    'notifications_delay' => $validated['notifications_delay'] ?? 60,
                    'thread_defaults' => $validated['thread_defaults'] ?? ['label_ids' => [], 'priority' => 'normal', 'tier_id' => null],
                    'chat_buttons' => $validated['chat_buttons'] ?? [],
                ]);
                $channel->save();
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chat app settings updated successfully.']);

        return redirect()->back();
    }

    /**
     * Regenerate the auth secret for a Chat App channel.
     */
    public function regenerateSecret(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'channel_id' => 'required|string',
        ]);

        $channel = Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Chat)
            ->findOrFail($validated['channel_id']);

        $channel->settings = array_merge($channel->settings ?? [], [
            'auth_secret' => 'sec_'.Str::random(32),
        ]);
        $channel->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Secret regenerated.']);

        return redirect()->back();
    }

    /**
     * Delete specified Chat App channel from database.
     */
    public function destroy(Request $request, string $appId): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        Channel::where('team_id', $team->id)
            ->where('type', ChannelType::Chat)
            ->where('id', $appId)
            ->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chat app deleted successfully.']);

        return redirect()->back();
    }
}
