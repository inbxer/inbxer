<?php

namespace App\Domain\Channel\Services;

/**
 * Builds the embeddable <script> snippet for the chat widget from a channel's
 * configured colors, logo, greeting, and quick links.
 */
class ChatWidgetSnippetBuilder
{
    /**
     * @param  array<string, string>  $colors
     * @param  array<int, array<string, mixed>>  $links
     */
    public function build(string $appId, array $colors, string $logoUrl, string $greeting, array $links): string
    {
        $widgetUrl = url('/widget/chat-widget.js');
        $attrs = ['data-app-id' => $appId];

        foreach ($colors as $key => $value) {
            if ($value !== '') {
                $attrs['data-'.str_replace('_', '-', $key)] = $value;
            }
        }

        if ($logoUrl !== '') {
            $attrs['data-logo-url'] = $logoUrl;
        }

        if ($greeting !== '') {
            $attrs['data-greeting'] = $greeting;
        }

        if (! empty($links)) {
            $attrs['data-links'] = json_encode($links);
        }

        $attrString = collect($attrs)
            ->map(fn ($value, $key) => $key.'="'.htmlspecialchars((string) $value, ENT_QUOTES).'"')
            ->implode(' ');

        return "<script src=\"{$widgetUrl}\" {$attrString} async></script>";
    }
}
