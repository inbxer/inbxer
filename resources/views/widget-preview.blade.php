<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Chat Widget Preview — {{ $appName }}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(160deg, #f8fafc 0%, #eef2f7 100%);
            color: #0f172a;
            min-height: 100vh;
        }
        .wrap { max-width: 720px; margin: 0 auto; padding: 64px 24px; }
        .badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: #ecfdf5; color: #059669; font-size: 12px; font-weight: 700;
            padding: 4px 10px; border-radius: 999px; margin-bottom: 20px;
        }
        h1 { font-size: 32px; font-weight: 800; margin: 0 0 12px; }
        p.lead { font-size: 15px; color: #475569; line-height: 1.6; max-width: 520px; }
        .card {
            margin-top: 32px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
            padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .card h2 { font-size: 14px; margin: 0 0 8px; }
        .card p { font-size: 13px; color: #64748b; margin: 0 0 4px; }
        code {
            display: block; margin-top: 12px; background: #0f172a; color: #e2e8f0;
            padding: 12px 14px; border-radius: 8px; font-size: 12px; overflow-x: auto;
        }
        .hint { margin-top: 40px; font-size: 12px; color: #94a3b8; }
        .arrow { position: fixed; bottom: 30px; right: 92px; font-size: 13px; color: #64748b; }
    </style>
</head>
<body>
    <div class="wrap">
        <span class="badge">● Live preview</span>
        <h1>{{ $appName }}</h1>
        <p class="lead">
            This is a real, standalone page with the actual embed snippet installed — exactly what a visitor to
            your website would see. Click the chat bubble in the bottom-right corner to try it live.
        </p>

        <div class="card">
            <h2>App ID</h2>
            <p>{{ $appId }}</p>
            <h2 style="margin-top:16px">Installed snippet</h2>
            <code>&lt;script src="{{ $widgetUrl }}" data-app-id="{{ $appId }}"@foreach($colors as $key => $value) data-{{ str_replace('_', '-', $key) }}="{{ $value }}"@endforeach async&gt;&lt;/script&gt;</code>
        </div>

        <p class="hint">
            Any change you save on the chat app's settings page will be reflected here after a page refresh
            (the widget re-reads its config on load).
        </p>
    </div>

    <span class="arrow">← try it</span>

    <script
        src="{{ $widgetUrl }}"
        data-app-id="{{ $appId }}"
        @foreach($colors as $key => $value)
        data-{{ str_replace('_', '-', $key) }}="{{ $value }}"
        @endforeach
        @if($logoUrl) data-logo-url="{{ $logoUrl }}" @endif
        @if($greeting) data-greeting="{{ $greeting }}" @endif
        @if($links) data-links='{{ $links }}' @endif
        async
    ></script>
</body>
</html>
