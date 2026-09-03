<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>@yield('title') — Inbxer</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">

        <style>
            :root {
                --background: #fafaf9;
                --foreground: #1d2129;
                --muted-foreground: #6b7280;
                --card: #ffffff;
                --border: #e6e6e3;
                --primary: #1a79d3;
                --primary-foreground: #fafaf9;
            }

            @media (prefers-color-scheme: dark) {
                :root {
                    --background: #16181c;
                    --foreground: #edeef0;
                    --muted-foreground: #9aa1ab;
                    --card: #1c1f24;
                    --border: #2b2f36;
                    --primary: #5fa9ea;
                    --primary-foreground: #131519;
                }
            }

            * {
                box-sizing: border-box;
            }

            html, body {
                margin: 0;
                height: 100%;
            }

            body {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 24px;
                background-color: var(--background);
                color: var(--foreground);
                font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                -webkit-font-smoothing: antialiased;
            }

            .card {
                width: 100%;
                max-width: 420px;
                text-align: center;
            }

            .mark {
                display: inline-block;
                width: 40px;
                height: 40px;
                margin-bottom: 28px;
            }

            .code {
                font-size: 15px;
                font-weight: 600;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--primary);
                margin-bottom: 10px;
            }

            .message {
                font-size: 26px;
                font-weight: 600;
                letter-spacing: -0.02em;
                line-height: 1.3;
                margin-bottom: 12px;
            }

            .hint {
                font-size: 14px;
                color: var(--muted-foreground);
                line-height: 1.6;
                margin-bottom: 32px;
            }

            .actions {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                border: 1px solid transparent;
                transition: opacity 0.15s ease;
            }

            .btn:hover {
                opacity: 0.85;
            }

            .btn-primary {
                background-color: var(--primary);
                color: var(--primary-foreground);
            }

            .btn-secondary {
                background-color: var(--card);
                color: var(--foreground);
                border-color: var(--border);
            }
        </style>
    </head>
    <body>
        <div class="card">
            <svg class="mark" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="22" height="22" rx="2.64" fill="var(--foreground)" />
                <rect x="12" y="12" width="22" height="22" rx="2.64" fill="var(--primary)" />
            </svg>

            <div class="code">Error @yield('code')</div>
            <div class="message">@yield('message')</div>
            <p class="hint">
                @yield('hint', "Something went wrong on our end. Try again, or head back to your workspace.")
            </p>

            <div class="actions">
                <a href="javascript:history.back()" class="btn btn-secondary">Go back</a>
                <a href="/" class="btn btn-primary">Go to Inbxer</a>
            </div>
        </div>
    </body>
</html>
