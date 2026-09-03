(function () {
    'use strict';

    var currentScript = document.currentScript;
    var appId = currentScript.getAttribute('data-app-id');

    // ---- Full color control (all optional, each falls back to a sensible dark-theme default) ----
    var brandColor = currentScript.getAttribute('data-brand-color') || '#1A79D3';
    var backgroundColor = currentScript.getAttribute('data-background-color') || '#131519';
    var surfaceColor = currentScript.getAttribute('data-surface-color') || '#191c22';
    var textColor = currentScript.getAttribute('data-text-color') || '#EDEFF3';
    var mutedTextColor = currentScript.getAttribute('data-muted-text-color') || '#9ca3af';
    var borderColor = currentScript.getAttribute('data-border-color') || 'rgba(255,255,255,.08)';
    var launcherBackgroundColor = currentScript.getAttribute('data-launcher-background-color') || brandColor;
    var launcherIconColor = currentScript.getAttribute('data-launcher-icon-color') || '#ffffff';

    var logoUrl = currentScript.getAttribute('data-logo-url') || '';
    var greeting = currentScript.getAttribute('data-greeting') || '';
    var links = [];
    try {
        links = JSON.parse(currentScript.getAttribute('data-links') || '[]');
    } catch (e) {
        links = [];
    }
    var apiBase = new URL(currentScript.src).origin + '/api/v1/chat/' + appId;
    var aiAvatarUrl = new URL(currentScript.src).origin + '/widget/ai-avatar.jpg';

    if (!appId) {
        console.error('[ChatWidget] Missing data-app-id attribute on the embed script tag.');
        return;
    }

    var STORAGE_VISITOR = 'inbxer_chat_visitor_' + appId;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0;
            var v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function getVisitorId() {
        var id = localStorage.getItem(STORAGE_VISITOR);
        if (!id) {
            id = uuid();
            localStorage.setItem(STORAGE_VISITOR, id);
        }
        return id;
    }

    function api(path, options) {
        options = options || {};
        return fetch(apiBase + path, {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: options.body ? JSON.stringify(options.body) : undefined,
        }).then(function (res) {
            if (!res.ok) throw new Error('Request failed: ' + res.status);
            return res.json();
        });
    }

    function apiUpload(path, formData) {
        return fetch(apiBase + path, { method: 'POST', headers: { Accept: 'application/json' }, body: formData }).then(function (res) {
            if (!res.ok) throw new Error('Request failed: ' + res.status);
            return res.json();
        });
    }

    // ---- Realtime (raw Pusher-protocol client speaking directly to Laravel Reverb — no polling) ----
    var realtime = { socket: null, channel: null, handler: null, reconnectTimer: null };

    function realtimeChannelName(externalId) {
        return 'chat.' + externalId.replace(/:/g, '.');
    }

    function subscribeRealtime(config, externalId, onMessage) {
        unsubscribeRealtime();
        if (!config || !config.key || !config.host) return;

        realtime.channel = realtimeChannelName(externalId);
        realtime.handler = onMessage;
        openRealtimeSocket(config);
    }

    function openRealtimeSocket(config) {
        var wsScheme = config.scheme === 'http' ? 'ws' : 'wss';
        var port = config.port ? ':' + config.port : '';
        var url = wsScheme + '://' + config.host + port + '/app/' + config.key + '?protocol=7&client=js&version=8.4.0';

        var socket;
        try {
            socket = new WebSocket(url);
        } catch (e) {
            return;
        }
        realtime.socket = socket;

        socket.onmessage = function (evt) {
            var payload;
            try {
                payload = JSON.parse(evt.data);
            } catch (e) {
                return;
            }

            if (payload.event === 'pusher:connection_established' && realtime.channel) {
                socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: realtime.channel } }));
                return;
            }

            if (payload.event === 'message.created' && payload.channel === realtime.channel && realtime.handler) {
                var data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
                realtime.handler(data);
            }
        };

        socket.onclose = function () {
            if (realtime.socket === socket && realtime.channel) {
                realtime.reconnectTimer = setTimeout(function () {
                    openRealtimeSocket(config);
                }, 3000);
            }
        };
    }

    function unsubscribeRealtime() {
        realtime.channel = null;
        realtime.handler = null;
        if (realtime.reconnectTimer) {
            clearTimeout(realtime.reconnectTimer);
            realtime.reconnectTimer = null;
        }
        if (realtime.socket) {
            var s = realtime.socket;
            realtime.socket = null;
            s.close();
        }
    }

    // ---- Icons (inline line-icon SVGs, no emoji, no external requests) ----
    var ICON_PATHS = {
        chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        sparkle: '<path d="M9.9 2.6 11 6l3.4 1.1L11 8.2 9.9 11.6 8.8 8.2 5.4 7.1 8.8 6Z"/><path d="m18 14 .9 2.1L21 17l-2.1.9-.9 2.1-.9-2.1L15 17l2.1-.9Z"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/>',
        bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5A5 5 0 1 0 6 9c0 1.5.4 2.5 2 4 .8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
        integration: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/>',
        discord: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        discord_muted: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
        slack: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        slack_muted: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>',
        pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
        send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
        support: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.9" y1="4.9" x2="9.2" y2="9.2"/><line x1="14.8" y1="14.8" x2="19.1" y2="19.1"/><line x1="14.8" y1="9.2" x2="19.1" y2="4.9"/><line x1="4.9" y1="19.1" x2="9.2" y2="14.8"/>',
        error: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        back: '<path d="m15 18-6-6 6-6"/>',
        forward: '<path d="m9 18 6-6-6-6"/>',
        expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
        collapse: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
        attach: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
        code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
        file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    };
    function svgIcon(name, size) {
        size = size || 16;
        var paths = ICON_PATHS[name] || ICON_PATHS.chat;
        return (
            '<svg width="' +
            size +
            '" height="' +
            size +
            '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">' +
            paths +
            '</svg>'
        );
    }

    // ---- Styles ----
    var style = document.createElement('style');
    style.textContent =
        '@keyframes ibx-pop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}' +
        '@keyframes ibx-fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}' +
        '@keyframes ibx-pulse{0%,100%{box-shadow:0 8px 24px rgba(0,0,0,.25),0 0 0 0 ' +
        brandColor +
        '55}50%{box-shadow:0 8px 24px rgba(0,0,0,.25),0 0 0 8px ' +
        brandColor +
        '00}}' +
        '.ibx-launcher{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;background:' +
        launcherBackgroundColor +
        ';box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483000;border:none;transition:transform .15s ease;color:' +
        launcherIconColor +
        ';animation:ibx-pulse 3s ease-in-out 1}' +
        '.ibx-launcher:hover{transform:scale(1.08)}' +
        '.ibx-launcher:active{transform:scale(.94)}' +
        '.ibx-launcher svg{width:26px;height:26px}' +
        '.ibx-panel{position:fixed;bottom:84px;right:20px;width:340px;max-width:92vw;min-height:340px;max-height:74vh;background:' +
        backgroundColor +
        ';color:' +
        textColor +
        ';border-radius:20px;box-shadow:0 16px 48px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border:1px solid ' +
        borderColor +
        ';opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .18s ease,transform .18s ease,width .18s ease,max-height .18s ease}' +
        '.ibx-panel.ibx-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;animation:ibx-pop .22s ease}' +
        '.ibx-panel.ibx-maximized{width:min(600px,94vw);max-height:88vh}' +
        '.ibx-panel.ibx-fixed-height{height:520px}' +
        '.ibx-panel.ibx-fixed-height.ibx-maximized{height:min(700px,88vh)}' +
        '.ibx-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid ' +
        borderColor +
        '}' +
        '.ibx-header-title{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;min-width:0}' +
        '.ibx-header-title .ibx-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.ibx-header-actions{display:flex;align-items:center;gap:2px;flex-shrink:0}' +
        '.ibx-icon-btn{background:none;border:none;color:' +
        mutedTextColor +
        ';cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .15s ease,color .15s ease,transform .1s ease}' +
        '.ibx-icon-btn:hover{background:rgba(255,255,255,.08);color:' +
        textColor +
        '}' +
        '.ibx-icon-btn:active{transform:scale(.9)}' +
        '.ibx-body{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:' +
        borderColor +
        ' transparent}' +
        '.ibx-body::-webkit-scrollbar{width:6px}' +
        '.ibx-body::-webkit-scrollbar-track{background:transparent}' +
        '.ibx-body::-webkit-scrollbar-thumb{background:' +
        borderColor +
        ';border-radius:999px}' +
        '.ibx-body::-webkit-scrollbar-thumb:hover{background:' +
        mutedTextColor +
        '}' +
        '.ibx-body.ibx-body-pad{padding:20px}' +
        '.ibx-hero{position:relative;padding:44px 20px 56px;background:radial-gradient(120% 100% at 0% 0%,' +
        brandColor +
        '22,transparent 60%),' +
        backgroundColor +
        '}' +
        '.ibx-hero-close{position:absolute;top:14px;right:14px}' +
        '.ibx-logo{height:26px;margin-bottom:22px;display:block}' +
        '.ibx-logo-fallback{height:26px;width:26px;margin-bottom:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;background:' +
        brandColor +
        '}' +
        '.ibx-welcome-eyebrow{color:' +
        brandColor +
        ';font-size:19px;font-weight:700;margin-bottom:2px;animation:ibx-fade-up .3s ease}' +
        '.ibx-welcome-title{font-size:22px;font-weight:800;margin:0 0 18px;color:' +
        textColor +
        ';animation:ibx-fade-up .35s ease}' +
        '.ibx-link-row{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13px;color:' +
        mutedTextColor +
        ';text-decoration:none;cursor:pointer;transition:color .15s ease}' +
        '.ibx-link-row:hover{color:' +
        textColor +
        '}' +
        '.ibx-link-row svg{flex-shrink:0}' +
        '.ibx-card{position:relative;margin-top:-24px;background:' +
        surfaceColor +
        ';border:1px solid ' +
        borderColor +
        ';border-radius:18px 18px 0 0;padding:16px;flex:1;box-shadow:0 -8px 24px rgba(0,0,0,.3);animation:ibx-fade-up .4s ease}' +
        '.ibx-actions{display:flex;flex-direction:column;gap:8px}' +
        '.ibx-action-btn{display:flex;align-items:center;gap:10px;padding:14px;border-radius:10px;background:' +
        backgroundColor +
        ';border:1.5px solid ' +
        borderColor +
        ';color:' +
        textColor +
        ';font-size:13px;font-weight:600;cursor:pointer;text-align:left;transition:border-color .15s ease,transform .1s ease}' +
        '.ibx-action-btn:hover{border-color:' +
        brandColor +
        ';transform:translateY(-1px)}' +
        '.ibx-action-btn:active{transform:translateY(0)}' +
        '.ibx-action-btn svg{flex-shrink:0;color:' +
        brandColor +
        '}' +
        '.ibx-conv-section{margin-top:8px;border-top:1px solid ' +
        borderColor +
        ';padding-top:4px}' +
        '.ibx-conv-header{display:flex;align-items:center;gap:8px;padding:10px 4px;cursor:pointer;font-size:13px;font-weight:600;border:none;background:none;color:' +
        textColor +
        ';width:100%;transition:color .15s ease}' +
        '.ibx-conv-header svg:first-child{color:' +
        brandColor +
        '}' +
        '.ibx-conv-header:hover{color:' +
        brandColor +
        '}' +
        '.ibx-conv-badge{background:' +
        brandColor +
        ';color:#fff;font-size:10px;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;margin-left:auto}' +
        '.ibx-conv-header .ibx-chevron{color:' +
        mutedTextColor +
        '}' +
        '.ibx-conv-item{display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:12px;background:' +
        backgroundColor +
        ';cursor:pointer;margin-top:6px;transition:background .15s ease}' +
        '.ibx-conv-item:hover{background:' +
        surfaceColor +
        '}' +
        '.ibx-avatar{width:26px;height:26px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;overflow:hidden}' +
        '.ibx-avatar.ibx-avatar-agent{background:' +
        brandColor +
        '}' +
        '.ibx-avatar.ibx-avatar-ai{background:#7c3aed}' +
        '.ibx-avatar img{width:100%;height:100%;object-fit:cover}' +
        '.ibx-conv-ref{display:inline-block;background:' +
        surfaceColor +
        ';color:' +
        mutedTextColor +
        ';font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:6px;flex-shrink:0}' +
        '.ibx-conv-title{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.ibx-conv-time{font-size:10px;color:' +
        mutedTextColor +
        ';margin-left:auto;white-space:nowrap;flex-shrink:0;padding-left:6px}' +
        '.ibx-conv-preview{font-size:11px;color:' +
        mutedTextColor +
        ';margin-top:3px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
        '.ibx-msg-row{display:flex;align-items:flex-end;gap:8px;margin-bottom:10px}' +
        '.ibx-msg-row.ibx-msg-row-visitor{flex-direction:row-reverse}' +
        '.ibx-msg{max-width:76%;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.4;white-space:pre-wrap;word-break:break-word}' +
        '.ibx-msg code{background:rgba(255,255,255,.15);padding:1px 5px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}' +
        '.ibx-msg-visitor{background:' +
        brandColor +
        ';color:#fff;border-bottom-right-radius:3px}' +
        '.ibx-msg-visitor code{background:rgba(0,0,0,.2)}' +
        '.ibx-msg-agent{background:' +
        surfaceColor +
        ';border:1px solid ' +
        borderColor +
        ';border-bottom-left-radius:3px}' +
        '.ibx-msg-ai{background:' +
        surfaceColor +
        ';border:1px solid rgba(124,58,237,.35);border-bottom-left-radius:3px}' +
        '.ibx-msg-ai-label{display:flex;align-items:center;gap:4px;color:#7c3aed;font-size:10px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;margin-bottom:4px}' +
        '.ibx-msg-ai-label svg{width:10px;height:10px}' +
        '.ibx-attachment{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.18);margin-top:6px;font-size:12px;text-decoration:none;color:inherit}' +
        '.ibx-attachment:hover{background:rgba(0,0,0,.28)}' +
        '.ibx-attachment img{max-width:100%;border-radius:8px;display:block;margin-top:6px}' +
        '.ibx-attachment-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}' +
        '.ibx-composer{border-top:1px solid ' +
        borderColor +
        ';padding:10px 12px 12px}' +
        '.ibx-toolbar{display:flex;align-items:center;gap:2px;margin-bottom:6px}' +
        '.ibx-tool-btn{background:none;border:none;color:' +
        mutedTextColor +
        ';cursor:pointer;padding:5px 7px;border-radius:6px;font-size:12px;display:flex;align-items:center;justify-content:center;transition:background .15s ease,color .15s ease}' +
        '.ibx-tool-btn:hover{background:rgba(255,255,255,.08);color:' +
        textColor +
        '}' +
        '.ibx-tool-sep{width:1px;height:16px;background:' +
        borderColor +
        ';margin:0 4px}' +
        '.ibx-attach-chip{display:none;align-items:center;gap:6px;background:' +
        surfaceColor +
        ';border:1px solid ' +
        borderColor +
        ';border-radius:8px;padding:5px 8px;font-size:11px;margin-bottom:6px;animation:ibx-fade-up .15s ease}' +
        '.ibx-attach-chip svg{color:' +
        brandColor +
        ';flex-shrink:0}' +
        '.ibx-attach-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}' +
        '.ibx-attach-remove{background:none;border:none;color:' +
        mutedTextColor +
        ';cursor:pointer;padding:2px;display:flex;flex-shrink:0}' +
        '.ibx-attach-remove:hover{color:#ef4444}' +
        '.ibx-composer textarea{width:100%;background:' +
        surfaceColor +
        ';border:1px solid ' +
        borderColor +
        ';border-radius:10px;color:' +
        textColor +
        ';padding:10px 12px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;min-height:44px;max-height:120px;transition:border-color .15s ease}' +
        '.ibx-composer textarea:focus{outline:none;border-color:' +
        brandColor +
        '}' +
        '.ibx-composer-row{display:flex;justify-content:flex-end;margin-top:8px}' +
        '.ibx-send-btn{background:' +
        brandColor +
        ';color:#fff;border:none;border-radius:8px;padding:7px 10px 7px 14px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .15s ease,transform .1s ease}' +
        '.ibx-send-btn:hover:not(:disabled){opacity:.92}' +
        '.ibx-send-btn:active:not(:disabled){transform:scale(.96)}' +
        '.ibx-send-btn:disabled{opacity:.5;cursor:default}' +
        '.ibx-send-kbd{background:rgba(255,255,255,.18);border-radius:4px;padding:1px 5px;font-size:10px;font-weight:700}' +
        '.ibx-footer{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;font-size:10px;color:' +
        mutedTextColor +
        '}' +
        '.ibx-footer-logo{height:12px;width:12px;flex-shrink:0}' +
        '.ibx-footer-brand{font-weight:600}' +
        '.ibx-empty{color:' +
        mutedTextColor +
        ';font-size:12px;text-align:center;padding:24px 0}';
    document.head.appendChild(style);

    // ---- DOM scaffold ----
    var launcher = document.createElement('button');
    launcher.className = 'ibx-launcher';
    launcher.innerHTML = svgIcon('chat', 26);
    document.body.appendChild(launcher);

    var panel = document.createElement('div');
    panel.className = 'ibx-panel';
    panel.innerHTML =
        '<div class="ibx-header" style="display:none">' +
        '<div class="ibx-header-title"><button class="ibx-icon-btn ibx-back" style="display:none"></button><span class="ibx-title-text">Chat</span></div>' +
        '<div class="ibx-header-actions">' +
        '<button class="ibx-icon-btn ibx-expand" title="Expand"></button>' +
        '<button class="ibx-icon-btn ibx-close" title="Close"></button>' +
        '</div>' +
        '</div>' +
        '<div class="ibx-body"></div>' +
        '<div class="ibx-footer">Powered by' +
        '<svg viewBox="0 0 34 34" class="ibx-footer-logo" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="0" y="0" width="22" height="22" rx="2.64" fill="#191C22"/>' +
        '<rect x="12" y="12" width="22" height="22" rx="2.64" fill="#1A79D3"/>' +
        '</svg>' +
        '<span class="ibx-footer-brand">Inbxer</span>' +
        '</div>';
    document.body.appendChild(panel);

    var bodyEl = panel.querySelector('.ibx-body');
    var headerEl = panel.querySelector('.ibx-header');
    var backBtn = panel.querySelector('.ibx-back');
    var closeBtn = panel.querySelector('.ibx-close');
    var expandBtn = panel.querySelector('.ibx-expand');
    var titleText = panel.querySelector('.ibx-title-text');

    backBtn.innerHTML = svgIcon('back', 16);
    closeBtn.innerHTML = svgIcon('close', 16);
    expandBtn.innerHTML = svgIcon('expand', 15);

    function closePanel() {
        panel.classList.remove('ibx-open');
    }

    var state = {
        view: 'welcome',
        config: null,
        activeThread: null,
        pendingButtonKey: null,
        maximized: false,
        conversations: [],
        messages: [],
    };

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // Lightweight, safe inline formatting: **bold**, *italic*, `code` — applied only after HTML-escaping.
    function formatBody(text) {
        var html = escapeHtml(text);
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
        return html;
    }

    function disconnectRealtime() {
        unsubscribeRealtime();
    }

    function agentAvatar(isAi) {
        if (isAi) {
            return (
                '<div class="ibx-avatar ibx-avatar-ai">' +
                '<img src="' + escapeHtml(aiAvatarUrl) + '" alt="AI" />' +
                '</div>'
            );
        }
        return (
            '<div class="ibx-avatar ibx-avatar-agent">' +
            (logoUrl ? '<img src="' + escapeHtml(logoUrl) + '" alt="" />' : svgIcon('chat', 13)) +
            '</div>'
        );
    }

    function relativeTime(iso) {
        if (!iso) return '';
        var diff = Date.now() - new Date(iso).getTime();
        var mins = Math.round(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return mins + 'm ago';
        var hours = Math.round(mins / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.round(hours / 24);
        return days + 'd ago';
    }

    function attachmentHtml(att) {
        var isImage = att.mime_type && att.mime_type.indexOf('image/') === 0;
        if (isImage) {
            return (
                '<a href="' + escapeHtml(att.url) + '" target="_blank" rel="noreferrer">' +
                '<img src="' + escapeHtml(att.url) + '" alt="' + escapeHtml(att.name) + '" /></a>'
            );
        }
        return (
            '<a class="ibx-attachment" href="' +
            escapeHtml(att.url) +
            '" target="_blank" rel="noreferrer">' +
            svgIcon('file', 15) +
            '<span class="ibx-attachment-name">' +
            escapeHtml(att.name) +
            '</span>' +
            svgIcon('download', 14) +
            '</a>'
        );
    }

    function renderWelcome() {
        disconnectRealtime();
        state.view = 'welcome';
        headerEl.style.display = 'none';
        bodyEl.classList.remove('ibx-body-pad');
        panel.classList.remove('ibx-fixed-height');

        var name = greeting ? 'Hey ' + escapeHtml(greeting) : 'Hey there';
        var logoHtml = logoUrl
            ? '<img class="ibx-logo" src="' + escapeHtml(logoUrl) + '" alt="" />'
            : '<div class="ibx-logo-fallback">' + svgIcon('chat', 14) + '</div>';
        var linksHtml = links
            .map(function (l) {
                return (
                    '<a class="ibx-link-row" href="' +
                    escapeHtml(l.url || '#') +
                    '" target="_blank" rel="noreferrer">' +
                    svgIcon(l.icon, 14) +
                    '<span>' +
                    escapeHtml(l.text || 'Link') +
                    '</span></a>'
                );
            })
            .join('');

        var buttons =
            state.config && state.config.buttons && state.config.buttons.length
                ? state.config.buttons
                : [
                    { key: 'question', icon: 'chat', text: 'Ask a question' },
                    { key: 'feedback', icon: 'bulb', text: 'Send feedback' },
                    { key: 'issue', icon: 'bug', text: 'Report an issue' },
                ];
        var buttonsHtml = buttons
            .map(function (b) {
                return (
                    '<button class="ibx-action-btn" data-start="' +
                    escapeHtml(b.key) +
                    '">' +
                    svgIcon(b.icon, 16) +
                    '<span>' +
                    escapeHtml(b.text) +
                    '</span></button>'
                );
            })
            .join('');

        bodyEl.innerHTML =
            '<div class="ibx-hero">' +
            '<button class="ibx-icon-btn ibx-hero-close">' +
            svgIcon('close', 16) +
            '</button>' +
            logoHtml +
            '<div class="ibx-welcome-eyebrow">' +
            name +
            '</div>' +
            '<h2 class="ibx-welcome-title">How can we help?</h2>' +
            linksHtml +
            '</div>' +
            '<div class="ibx-card">' +
            '<div class="ibx-actions">' +
            buttonsHtml +
            '</div>' +
            '<div class="ibx-conv-section" style="display:none">' +
            '<button class="ibx-conv-header">' +
            svgIcon('chat', 15) +
            '<span>Conversations</span>' +
            '<span class="ibx-conv-badge"></span>' +
            '<span class="ibx-chevron">' +
            svgIcon('forward', 15) +
            '</span>' +
            '</button>' +
            '</div>' +
            '</div>';

        bodyEl.querySelector('.ibx-hero-close').addEventListener('click', closePanel);
        bodyEl.querySelectorAll('[data-start]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                renderChat(null, btn.getAttribute('data-start'));
            });
        });

        var visitorId = getVisitorId();
        api('/conversations?visitor_id=' + encodeURIComponent(visitorId))
            .then(function (data) {
                var list = data.conversations || [];
                state.conversations = list;
                if (!list.length) return;

                var section = bodyEl.querySelector('.ibx-conv-section');
                section.style.display = 'block';
                section.querySelector('.ibx-conv-badge').textContent = list.length;
                section.querySelector('.ibx-conv-header').addEventListener('click', renderConversationsList);
            })
            .catch(function () { });
    }

    function conversationItemHtml(c) {
        return (
            '<div class="ibx-conv-item" data-external="' +
            escapeHtml(c.external_id) +
            '">' +
            agentAvatar() +
            '<div style="min-width:0;flex:1">' +
            '<div style="display:flex;align-items:center;min-width:0">' +
            '<span class="ibx-conv-ref">T-' +
            c.sequence_number +
            '</span>' +
            '<span class="ibx-conv-title">' +
            escapeHtml(c.title || 'Conversation') +
            '</span>' +
            '<span class="ibx-conv-time">' +
            relativeTime(c.updated_at) +
            '</span>' +
            '</div>' +
            '<div class="ibx-conv-preview">' +
            escapeHtml(c.preview || '') +
            '</div>' +
            '</div></div>'
        );
    }

    function renderConversationsList() {
        disconnectRealtime();
        state.view = 'conversations';
        headerEl.style.display = 'flex';
        bodyEl.classList.add('ibx-body-pad');
        backBtn.style.display = 'flex';
        titleText.textContent = 'All conversations';
        panel.classList.add('ibx-fixed-height');

        bodyEl.innerHTML = state.conversations.map(conversationItemHtml).join('');
        bodyEl.querySelectorAll('[data-external]').forEach(function (el) {
            el.addEventListener('click', function () {
                renderChat(el.getAttribute('data-external'));
            });
        });
    }

    function renderMessages(messages) {
        state.messages = messages;
        var wrap = bodyEl.querySelector('.ibx-messages');
        if (!wrap) return;
        wrap.innerHTML = messages
            .map(function (m) {
                var isVisitor = m.from === 'visitor';
                var isAi = m.from === 'ai';
                var attachments = (m.attachments || []).map(attachmentHtml).join('');
                var bodyHtml = m.body ? formatBody(m.body) : '';
                return (
                    '<div class="ibx-msg-row ' +
                    (isVisitor ? 'ibx-msg-row-visitor' : '') +
                    '">' +
                    (isVisitor ? '' : agentAvatar(isAi)) +
                    '<div class="ibx-msg ' +
                    (isVisitor ? 'ibx-msg-visitor' : isAi ? 'ibx-msg-ai' : 'ibx-msg-agent') +
                    '">' +
                    (isAi ? '<span class="ibx-msg-ai-label">' + svgIcon('sparkle', 10) + 'AI</span>' : '') +
                    bodyHtml +
                    attachments +
                    '</div></div>'
                );
            })
            .join('');
        bodyEl.scrollTop = bodyEl.scrollHeight;

        // Image attachments load asynchronously and can grow the message's
        // height after the scroll above already ran, leaving it cut off —
        // re-scroll once each image has finished loading.
        wrap.querySelectorAll('img').forEach(function (img) {
            img.addEventListener('load', function () {
                bodyEl.scrollTop = bodyEl.scrollHeight;
            });
        });
    }

    function fetchMessages(externalId) {
        var visitorId = getVisitorId();
        api('/threads/' + encodeURIComponent(externalId) + '/messages?visitor_id=' + encodeURIComponent(visitorId))
            .then(function (data) {
                renderMessages(data.messages || []);
            })
            .catch(function () { });
    }

    function handleRealtimeMessage(payload) {
        var incoming = payload && payload.message;
        if (!incoming) return;
        var exists = state.messages.some(function (m) {
            return m.id === incoming.id;
        });
        if (exists) return;
        renderMessages(state.messages.concat([incoming]));
    }

    function wrapSelection(textarea, marker) {
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        var val = textarea.value;
        var selected = val.slice(start, end);
        var insert = marker + selected + marker;
        textarea.value = val.slice(0, start) + insert + val.slice(end);
        var cursor = selected ? start + insert.length : start + marker.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
        textarea.dispatchEvent(new Event('input'));
    }

    function renderChat(externalId, buttonKey) {
        removeComposer();
        disconnectRealtime();
        state.view = 'chat';
        state.activeThread = externalId;
        state.pendingButtonKey = buttonKey || null;
        headerEl.style.display = 'flex';
        bodyEl.classList.add('ibx-body-pad');
        backBtn.style.display = 'flex';
        titleText.textContent = 'Send us a message';
        panel.classList.add('ibx-fixed-height');

        bodyEl.innerHTML = '<div class="ibx-messages"></div>';
        if (!externalId) {
            bodyEl.innerHTML =
                '<div class="ibx-messages"></div>' +
                '<p style="text-align:center;color:' +
                mutedTextColor +
                ';font-size:12.5px;margin-top:40%;padding:0 12px;line-height:1.6">' +
                "We're happy to help – message us whenever you need and we'll get back to you as soon as possible." +
                '</p>';
        }

        var composerWrap = document.createElement('div');
        composerWrap.className = 'ibx-composer';
        composerWrap.innerHTML =
            '<div class="ibx-attach-chip"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            ICON_PATHS.file +
            '</svg><span class="ibx-attach-name"></span><button type="button" class="ibx-attach-remove">' +
            svgIcon('close', 12) +
            '</button></div>' +
            '<input type="file" class="ibx-file-input" style="display:none" />' +
            '<div class="ibx-toolbar">' +
            '<button type="button" class="ibx-tool-btn ibx-tool-attach" title="Attach file">' +
            svgIcon('attach', 15) +
            '</button>' +
            '<span class="ibx-tool-sep"></span>' +
            '<button type="button" class="ibx-tool-btn" data-fmt="bold" title="Bold"><b>B</b></button>' +
            '<button type="button" class="ibx-tool-btn" data-fmt="italic" title="Italic"><i>I</i></button>' +
            '<button type="button" class="ibx-tool-btn" data-fmt="code" title="Code">' +
            svgIcon('code', 15) +
            '</button>' +
            '</div>' +
            '<textarea placeholder="Start typing" rows="2"></textarea>' +
            '<div class="ibx-composer-row"><button class="ibx-send-btn" disabled><span>Send</span><span class="ibx-send-kbd">Ctrl ↵</span></button></div>';
        panel.insertBefore(composerWrap, panel.querySelector('.ibx-footer'));

        var textarea = composerWrap.querySelector('textarea');
        var sendBtn = composerWrap.querySelector('.ibx-send-btn');
        var fileInput = composerWrap.querySelector('.ibx-file-input');
        var attachBtn = composerWrap.querySelector('.ibx-tool-attach');
        var attachChip = composerWrap.querySelector('.ibx-attach-chip');
        var attachName = composerWrap.querySelector('.ibx-attach-name');
        var attachRemove = composerWrap.querySelector('.ibx-attach-remove');
        var pendingFile = null;

        function updateSendState() {
            sendBtn.disabled = !textarea.value.trim() && !pendingFile;
        }

        textarea.addEventListener('input', updateSendState);

        composerWrap.querySelectorAll('[data-fmt]').forEach(function (btn) {
            var marker = { bold: '**', italic: '*', code: '`' }[btn.getAttribute('data-fmt')];
            btn.addEventListener('click', function () {
                wrapSelection(textarea, marker);
            });
        });

        attachBtn.addEventListener('click', function () {
            fileInput.click();
        });
        fileInput.addEventListener('change', function () {
            pendingFile = fileInput.files[0] || null;
            if (pendingFile) {
                attachName.textContent = pendingFile.name;
                attachChip.style.display = 'flex';
            }
            updateSendState();
        });
        attachRemove.addEventListener('click', function () {
            pendingFile = null;
            fileInput.value = '';
            attachChip.style.display = 'none';
            updateSendState();
        });

        function send() {
            var text = textarea.value.trim();
            if (!text && !pendingFile) return;
            sendBtn.disabled = true;
            var visitorId = getVisitorId();

            var form = null;
            if (pendingFile) {
                form = new FormData();
                form.append('visitor_id', visitorId);
                form.append('message', text);
                form.append('file', pendingFile);
            }

            function afterSend() {
                textarea.value = '';
                pendingFile = null;
                fileInput.value = '';
                attachChip.style.display = 'none';
            }

            if (!state.activeThread) {
                if (form && state.pendingButtonKey) form.append('button_key', state.pendingButtonKey);
                var startPromise = form
                    ? apiUpload('/start', form)
                    : api('/start', { method: 'POST', body: { visitor_id: visitorId, message: text, button_key: state.pendingButtonKey } });

                startPromise.then(function (data) {
                    state.activeThread = data.external_id;
                    titleText.textContent = 'T-' + data.sequence_number;
                    bodyEl.innerHTML = '<div class="ibx-messages"></div>';
                    renderMessages(data.messages || []);
                    afterSend();
                    subscribeRealtime(state.config && state.config.realtime, state.activeThread, handleRealtimeMessage);
                });
            } else {
                var replyPromise = form
                    ? apiUpload('/threads/' + encodeURIComponent(state.activeThread) + '/messages', form)
                    : api('/threads/' + encodeURIComponent(state.activeThread) + '/messages', {
                        method: 'POST',
                        body: { visitor_id: visitorId, message: text },
                    });

                replyPromise.then(function (data) {
                    renderMessages(data.messages || []);
                    afterSend();
                });
            }
        }

        sendBtn.addEventListener('click', send);
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
        });

        if (externalId) {
            fetchMessages(externalId);
            subscribeRealtime(state.config && state.config.realtime, externalId, handleRealtimeMessage);
        }

        panel.__composer = composerWrap;
    }

    function removeComposer() {
        if (panel.__composer) {
            panel.__composer.remove();
            panel.__composer = null;
        }
    }

    backBtn.addEventListener('click', function () {
        removeComposer();
        disconnectRealtime();
        if (state.view === 'chat' && state.conversations.length) {
            renderConversationsList();
        } else {
            renderWelcome();
        }
    });

    closeBtn.addEventListener('click', closePanel);

    expandBtn.addEventListener('click', function () {
        state.maximized = !state.maximized;
        panel.classList.toggle('ibx-maximized', state.maximized);
        expandBtn.innerHTML = svgIcon(state.maximized ? 'collapse' : 'expand', 15);
        expandBtn.title = state.maximized ? 'Collapse' : 'Expand';
    });

    launcher.addEventListener('click', function () {
        panel.classList.toggle('ibx-open');
        if (panel.classList.contains('ibx-open') && !state.config) {
            api('/init')
                .then(function (config) {
                    state.config = config;
                    renderWelcome();
                })
                .catch(function () {
                    bodyEl.innerHTML = '<div class="ibx-empty">Chat is unavailable right now.</div>';
                });
        }
    });
})();
