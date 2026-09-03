<?php

namespace App\Domain\Channel\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Http\Controllers\Controller;
use Illuminate\View\View;

class ChatWidgetPreviewController extends Controller
{
    /**
     * Standalone public page with the real embed snippet installed, for testing the widget live.
     */
    public function __invoke(string $appId): View
    {
        $channel = Channel::where('type', ChannelType::Chat)
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('settings->app_id', $appId)->orWhere('id', $appId))
            ->firstOrFail();

        $settings = $channel->settings ?? [];
        $links = $settings['links'] ?? [];
        $colors = array_filter($settings['colors'] ?? []);

        return view('widget-preview', [
            'appName' => $channel->name,
            'appId' => $settings['app_id'] ?? $channel->id,
            'widgetUrl' => url('/widget/chat-widget.js'),
            'colors' => $colors,
            'logoUrl' => $settings['logo_url'] ?? '',
            'greeting' => $settings['greeting'] ?? '',
            'links' => ! empty($links) ? json_encode($links) : null,
        ]);
    }
}
