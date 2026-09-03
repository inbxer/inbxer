import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Copy,
    Check,
    Key,
    Plus,
    X as XIcon,
    MessageCircle,
    Palette,
    Tags,
    SlidersHorizontal,
    Code2,
    ShieldCheck,
    ExternalLink,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ChatWidgetPreview } from '@/components/chat-widget-preview';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatButtonConfig {
    key: string;
    icon?: string;
    text: string;
    label_ids: string[];
    priority: string | null;
    tier_id: string | null;
}

interface ThreadDefaults {
    label_ids: string[];
    priority: string;
    tier_id: string | null;
}

interface WidgetColors {
    brand_color: string;
    background_color: string;
    surface_color: string;
    text_color: string;
    muted_text_color: string;
    border_color: string;
    launcher_background_color: string;
    launcher_icon_color: string;
}

interface ChatChannelPageProps {
    config?: {
        channel_id?: string;
        app_name: string;
        app_id: string;
        auth_secret: string;
        script_snippet: string;
        colors: WidgetColors;
        logo_url: string;
        greeting: string;
        links: Array<{ icon?: string; text: string; url: string }>;
        show_business_hours: boolean;
        show_agent_status: boolean;
        require_email_verification: boolean;
        enable_unread_notifications: boolean;
        chat_url: string;
        notifications_delay: number;
        thread_defaults: ThreadDefaults;
        chat_buttons: ChatButtonConfig[];
    };
    availableLabels?: Array<{ id: string; name: string; color: string }>;
    availableTiers?: Array<{ id: string; name: string }>;
}

const DEFAULT_COLORS: WidgetColors = {
    brand_color: '#1A79D3',
    background_color: '#131519',
    surface_color: '#191c22',
    text_color: '#EDEFF3',
    muted_text_color: '#9ca3af',
    border_color: '',
    launcher_background_color: '',
    launcher_icon_color: '#ffffff',
};

const COLOR_FIELDS: Array<{
    key: keyof WidgetColors;
    label: string;
    description: string;
}> = [
    {
        key: 'brand_color',
        label: 'Brand color',
        description: 'Buttons, accents, visitor message bubbles.',
    },
    {
        key: 'background_color',
        label: 'Background',
        description: 'Panel and hero background.',
    },
    {
        key: 'surface_color',
        label: 'Surface',
        description: 'Cards and agent message bubbles.',
    },
    { key: 'text_color', label: 'Text', description: 'Primary text color.' },
    {
        key: 'muted_text_color',
        label: 'Muted text',
        description: 'Secondary/hint text color.',
    },
    {
        key: 'launcher_background_color',
        label: 'Launcher background',
        description: 'Floating bubble color. Defaults to brand color.',
    },
    {
        key: 'launcher_icon_color',
        label: 'Launcher icon',
        description: 'Icon color inside the floating bubble.',
    },
];

const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const ICON_OPTIONS = [
    'chat',
    'book',
    'bulb',
    'bug',
    'discord',
    'email',
    'support',
    'link',
    'send',
    'error',
];

const TABS = [
    { key: 'general', label: 'General', icon: MessageCircle },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'routing', label: 'Thread routing', icon: Tags },
    { key: 'behavior', label: 'Behavior', icon: SlidersHorizontal },
    { key: 'install', label: 'Install', icon: Code2 },
    { key: 'security', label: 'Security', icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <button
            onClick={onChange}
            className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors ${
                checked ? 'bg-primary' : 'bg-muted'
            }`}
        >
            <div
                className={`h-4 w-4 rounded-full bg-foreground transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
            />
        </button>
    );
}

function Row({
    label,
    description,
    children,
}: {
    label: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-6 border-b border-border/40 py-3.5 first:pt-0 last:border-0 last:pb-0">
            <div className="min-w-0 space-y-0.5">
                <span className="block text-xs font-semibold text-foreground">
                    {label}
                </span>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
            {children}
        </div>
    );
}

export default function ChatChannelPage({
    config,
    availableLabels = [],
    availableTiers = [],
}: ChatChannelPageProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('general');
    const [copiedAppId, setCopiedAppId] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const [appName, setAppNameRaw] = useState(config?.app_name || 'Website');
    const [colors, setColorsRaw] = useState<WidgetColors>({
        ...DEFAULT_COLORS,
        ...(config?.colors || {}),
    });
    const [logoUrl, setLogoUrlRaw] = useState(config?.logo_url || '');
    const [greeting, setGreetingRaw] = useState(config?.greeting || '');
    const [links, setLinksRaw] = useState<
        Array<{ icon?: string; text: string; url: string }>
    >(config?.links || []);
    const [showBusinessHours, setShowBusinessHoursRaw] = useState(
        config?.show_business_hours || false,
    );
    const [showAgentStatus, setShowAgentStatusRaw] = useState(
        config?.show_agent_status || false,
    );
    const [requireEmailVerification, setRequireEmailVerificationRaw] = useState(
        config?.require_email_verification || false,
    );
    const [enableUnreadNotifications, setEnableUnreadNotificationsRaw] =
        useState(config?.enable_unread_notifications ?? true);
    const [chatUrl, setChatUrlRaw] = useState(
        config?.chat_url || 'https://www.example.com',
    );
    const [notificationsDelay, setNotificationsDelayRaw] = useState(
        config?.notifications_delay || 60,
    );
    const [threadDefaults, setThreadDefaultsRaw] = useState<ThreadDefaults>(
        config?.thread_defaults || {
            label_ids: [],
            priority: 'normal',
            tier_id: null,
        },
    );
    const [chatButtons, setChatButtonsRaw] = useState<ChatButtonConfig[]>(
        config?.chat_buttons || [],
    );

    // Wrap every setter so any edit marks the page dirty and reveals the save bar.
    const dirty =
        <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
        (value: React.SetStateAction<T>) => {
            setIsDirty(true);
            setter(value);
        };
    const setAppName = dirty(setAppNameRaw);
    const setColors = dirty(setColorsRaw);
    const updateColor = (key: keyof WidgetColors, value: string) =>
        setColors((prev) => ({ ...prev, [key]: value }));
    const setLogoUrl = dirty(setLogoUrlRaw);
    const setGreeting = dirty(setGreetingRaw);
    const setLinks = dirty(setLinksRaw);
    const setShowBusinessHours = dirty(setShowBusinessHoursRaw);
    const setShowAgentStatus = dirty(setShowAgentStatusRaw);
    const setRequireEmailVerification = dirty(setRequireEmailVerificationRaw);
    const setEnableUnreadNotifications = dirty(setEnableUnreadNotificationsRaw);
    const setChatUrl = dirty(setChatUrlRaw);
    const setNotificationsDelay = dirty(setNotificationsDelayRaw);
    const setThreadDefaults = dirty(setThreadDefaultsRaw);
    const setChatButtons = dirty(setChatButtonsRaw);

    const appId = config?.app_id || 'liveChatApp_01M03KJ0WPXTH148BVQ7CF0N0';
    const channelId = config?.channel_id;

    const handleSave = () => {
        setSaving(true);
        router.post(
            `/settings/channels/chat`,
            {
                channel_id: channelId,
                app_name: appName,
                colors: colors as unknown as Record<string, string>,
                logo_url: logoUrl,
                greeting: greeting,
                links: links.filter((l) => l.text.trim() && l.url.trim()),
                show_business_hours: showBusinessHours,
                show_agent_status: showAgentStatus,
                require_email_verification: requireEmailVerification,
                enable_unread_notifications: enableUnreadNotifications,
                chat_url: chatUrl,
                notifications_delay: notificationsDelay,
                thread_defaults: threadDefaults as unknown as Record<
                    string,
                    string
                >,
                chat_buttons: chatButtons.filter(
                    (b) => b.key.trim() && b.text.trim(),
                ) as unknown as Record<string, string>[],
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Saved!');
                    setIsDirty(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const toggleDefaultLabel = (labelId: string) =>
        setThreadDefaults((prev) => ({
            ...prev,
            label_ids: prev.label_ids.includes(labelId)
                ? prev.label_ids.filter((id) => id !== labelId)
                : [...prev.label_ids, labelId],
        }));

    const addChatButton = () =>
        setChatButtons((prev) => [
            ...prev,
            {
                key: `button_${Date.now()}`,
                icon: 'chat',
                text: '',
                label_ids: [],
                priority: null,
                tier_id: null,
            },
        ]);
    const removeChatButton = (idx: number) =>
        setChatButtons((prev) => prev.filter((_, i) => i !== idx));
    const updateChatButton = (idx: number, patch: Partial<ChatButtonConfig>) =>
        setChatButtons((prev) =>
            prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        );
    const toggleButtonLabel = (idx: number, labelId: string) =>
        setChatButtons((prev) =>
            prev.map((b, i) =>
                i === idx
                    ? {
                          ...b,
                          label_ids: b.label_ids.includes(labelId)
                              ? b.label_ids.filter((id) => id !== labelId)
                              : [...b.label_ids, labelId],
                      }
                    : b,
            ),
        );

    const addLink = () =>
        setLinks((prev) => [...prev, { icon: 'book', text: '', url: '' }]);
    const removeLink = (idx: number) =>
        setLinks((prev) => prev.filter((_, i) => i !== idx));
    const updateLink = (
        idx: number,
        patch: Partial<{ icon: string; text: string; url: string }>,
    ) =>
        setLinks((prev) =>
            prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
        );

    // Reflects the *current, unsaved* form state, so the copied snippet always matches the live preview.
    const scriptSnippet = (() => {
        const widgetUrl = `${window.location.origin}/widget/chat-widget.js`;
        const attrs = [`data-app-id="${appId}"`];
        (Object.keys(colors) as Array<keyof WidgetColors>).forEach((key) => {
            const value = colors[key];

            if (value && value.trim()) {
                attrs.push(`data-${key.replace(/_/g, '-')}="${value.trim()}"`);
            }
        });

        if (logoUrl.trim()) {
            attrs.push(`data-logo-url="${logoUrl.trim()}"`);
        }

        if (greeting.trim()) {
            attrs.push(`data-greeting="${greeting.trim()}"`);
        }

        const validLinks = links.filter((l) => l.text.trim() && l.url.trim());

        if (validLinks.length) {
            attrs.push(
                `data-links='${JSON.stringify(validLinks).replace(/'/g, '&#39;')}'`,
            );
        }

        return `<script src="${widgetUrl}" ${attrs.join(' ')} async></script>`;
    })();

    const handleCopy = (text: string, type: 'appId' | 'snippet') => {
        navigator.clipboard.writeText(text);

        if (type === 'appId') {
            setCopiedAppId(true);
            setTimeout(() => setCopiedAppId(false), 2000);
        } else {
            setCopiedSnippet(true);
            setTimeout(() => setCopiedSnippet(false), 2000);
        }
    };

    return (
        <>
            <Head title="Configure Chat App — Settings" />

            <div className="mx-auto flex min-h-full max-w-6xl flex-col text-foreground select-none">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6 sm:pb-0">
                    <div className="min-w-0 space-y-2">
                        <Link
                            href={`/settings/channels/chat`}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Chat apps</span>
                        </Link>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold">
                                {appName}
                            </h1>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                                {appId}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`/widget-preview/${appId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-muted"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open live preview page
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || saving}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                                isDirty && !saving
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                            }`}
                        >
                            {saving
                                ? 'Saving…'
                                : isDirty
                                  ? 'Save changes'
                                  : 'Saved'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start">
                    <div className="max-w-2xl min-w-0 flex-1 space-y-5">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.key;

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                            active
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* GENERAL */}
                        {activeTab === 'general' && (
                            <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-foreground">
                                        Chat app name
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        A display name for this chat app. This
                                        won't be visible to your users.
                                    </p>
                                    <input
                                        type="text"
                                        value={appName}
                                        onChange={(e) =>
                                            setAppName(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5 border-t border-border/40 pt-2">
                                    <label className="block text-xs font-bold text-foreground">
                                        Chat app ID
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Use this ID when configuring the chat
                                        widget on your website.
                                    </p>
                                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                                        <span className="flex-1 truncate font-mono text-xs font-semibold text-foreground">
                                            {appId}
                                        </span>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() =>
                                                        handleCopy(
                                                            appId,
                                                            'appId',
                                                        )
                                                    }
                                                    className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                                                >
                                                    {copiedAppId ? (
                                                        <Check className="h-4 w-4 text-success" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Copy App ID
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground">
                                            Colors
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Full control over the widget's
                                            palette — not just the brand color.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {COLOR_FIELDS.map((field) => (
                                            <div
                                                key={field.key}
                                                className="space-y-1"
                                            >
                                                <label className="block text-[11px] font-semibold text-foreground">
                                                    {field.label}
                                                </label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="color"
                                                        value={
                                                            colors[field.key] ||
                                                            '#000000'
                                                        }
                                                        onChange={(e) =>
                                                            updateColor(
                                                                field.key,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={
                                                            colors[field.key]
                                                        }
                                                        onChange={(e) =>
                                                            updateColor(
                                                                field.key,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder={
                                                            field.key ===
                                                            'launcher_background_color'
                                                                ? 'brand color'
                                                                : ''
                                                        }
                                                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {field.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-border/40 pt-4">
                                    <label className="block text-xs font-bold text-foreground">
                                        Logo URL
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Shown in the header of the chat intro
                                        screen. Recommended size 240x240px.
                                    </p>
                                    <input
                                        type="text"
                                        value={logoUrl}
                                        onChange={(e) =>
                                            setLogoUrl(e.target.value)
                                        }
                                        placeholder="https://yoursite.com/logo.png"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2 border-t border-border/40 pt-4">
                                    <label className="block text-xs font-bold text-foreground">
                                        Visitor greeting
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Shown as "Hey {'{greeting}'}" on the
                                        welcome screen. Leave blank for "Hey
                                        there".
                                    </p>
                                    <input
                                        type="text"
                                        value={greeting}
                                        onChange={(e) =>
                                            setGreeting(e.target.value)
                                        }
                                        placeholder="e.g. a customer's first name if known"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2 border-t border-border/40 pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-foreground">
                                            Welcome screen links
                                        </label>
                                        <button
                                            onClick={addLink}
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:opacity-80"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add link
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        e.g. links to your docs or community,
                                        shown above the action buttons.
                                    </p>
                                    {links.length === 0 && (
                                        <p className="text-[11px] text-muted-foreground italic">
                                            No links added.
                                        </p>
                                    )}
                                    <div className="space-y-2">
                                        {links.map((link, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2"
                                            >
                                                <select
                                                    value={link.icon || 'book'}
                                                    onChange={(e) =>
                                                        updateLink(idx, {
                                                            icon: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none"
                                                >
                                                    <option value="book">
                                                        📖
                                                    </option>
                                                    <option value="discord">
                                                        💬
                                                    </option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={link.text}
                                                    onChange={(e) =>
                                                        updateLink(idx, {
                                                            text: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="View our docs"
                                                    className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={(e) =>
                                                        updateLink(idx, {
                                                            url: e.target.value,
                                                        })
                                                    }
                                                    placeholder="https://docs.example.com"
                                                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                                />
                                                <button
                                                    onClick={() =>
                                                        removeLink(idx)
                                                    }
                                                    className="shrink-0 cursor-pointer p-1 text-muted-foreground hover:text-destructive"
                                                >
                                                    <XIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* THREAD ROUTING */}
                        {activeTab === 'routing' && (
                            <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                                <p className="text-[11px] text-muted-foreground">
                                    Automatically applied to every thread
                                    created from this chat app — labels,
                                    priority, and tier are set for you, no
                                    manual code required in the embed snippet.
                                </p>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-foreground">
                                        Default labels
                                    </label>
                                    {availableLabels.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">
                                            No labels yet — create some under
                                            Settings → Labels.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableLabels.map((label) => (
                                                <button
                                                    key={label.id}
                                                    onClick={() =>
                                                        toggleDefaultLabel(
                                                            label.id,
                                                        )
                                                    }
                                                    className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                                        threadDefaults.label_ids.includes(
                                                            label.id,
                                                        )
                                                            ? 'border-primary bg-primary/10 text-foreground'
                                                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    {label.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-foreground">
                                            Default priority
                                        </label>
                                        <select
                                            value={threadDefaults.priority}
                                            onChange={(e) =>
                                                setThreadDefaults((prev) => ({
                                                    ...prev,
                                                    priority: e.target.value,
                                                }))
                                            }
                                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
                                        >
                                            {PRIORITIES.map((p) => (
                                                <option key={p} value={p}>
                                                    {p.charAt(0).toUpperCase() +
                                                        p.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-foreground">
                                            Default tier
                                        </label>
                                        <select
                                            value={threadDefaults.tier_id || ''}
                                            onChange={(e) =>
                                                setThreadDefaults((prev) => ({
                                                    ...prev,
                                                    tier_id:
                                                        e.target.value || null,
                                                }))
                                            }
                                            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none"
                                        >
                                            <option value="">None</option>
                                            {availableTiers.map((tier) => (
                                                <option
                                                    key={tier.id}
                                                    value={tier.id}
                                                >
                                                    {tier.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-border/40 pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-foreground">
                                            Chat buttons
                                        </label>
                                        <button
                                            onClick={addChatButton}
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:opacity-80"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add button
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Shown on the welcome screen. Each button
                                        can tag its own thread with different
                                        labels/priority/tier — e.g. route
                                        "Report an issue" straight to your Bugs
                                        label.
                                    </p>

                                    <div className="space-y-2">
                                        {chatButtons.map((btn, idx) => (
                                            <div
                                                key={idx}
                                                className="space-y-2 rounded-xl border border-border/60 bg-background p-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={
                                                            btn.icon || 'chat'
                                                        }
                                                        onChange={(e) =>
                                                            updateChatButton(
                                                                idx,
                                                                {
                                                                    icon: e
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none"
                                                    >
                                                        {ICON_OPTIONS.map(
                                                            (icon) => (
                                                                <option
                                                                    key={icon}
                                                                    value={icon}
                                                                >
                                                                    {icon}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={btn.text}
                                                        onChange={(e) =>
                                                            updateChatButton(
                                                                idx,
                                                                {
                                                                    text: e
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Button text"
                                                        className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                                    />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <select
                                                                value={
                                                                    btn.priority ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    updateChatButton(
                                                                        idx,
                                                                        {
                                                                            priority:
                                                                                e
                                                                                    .target
                                                                                    .value ||
                                                                                null,
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none"
                                                            >
                                                                <option value="">
                                                                    Default
                                                                    priority
                                                                </option>
                                                                {PRIORITIES.map(
                                                                    (p) => (
                                                                        <option
                                                                            key={
                                                                                p
                                                                            }
                                                                            value={
                                                                                p
                                                                            }
                                                                        >
                                                                            {p
                                                                                .charAt(
                                                                                    0,
                                                                                )
                                                                                .toUpperCase() +
                                                                                p.slice(
                                                                                    1,
                                                                                )}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Priority override
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <button
                                                        onClick={() =>
                                                            removeChatButton(
                                                                idx,
                                                            )
                                                        }
                                                        className="shrink-0 cursor-pointer p-1 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <XIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                {availableLabels.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {availableLabels.map(
                                                            (label) => (
                                                                <button
                                                                    key={
                                                                        label.id
                                                                    }
                                                                    onClick={() =>
                                                                        toggleButtonLabel(
                                                                            idx,
                                                                            label.id,
                                                                        )
                                                                    }
                                                                    className={`cursor-pointer rounded border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                                                        btn.label_ids.includes(
                                                                            label.id,
                                                                        )
                                                                            ? 'border-primary bg-primary/10 text-foreground'
                                                                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                                >
                                                                    {label.name}
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {chatButtons.length === 0 && (
                                            <p className="text-[11px] text-muted-foreground italic">
                                                No buttons configured — the
                                                widget will fall back to 3
                                                default buttons.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BEHAVIOR */}
                        {activeTab === 'behavior' && (
                            <div className="rounded-xl border border-border bg-card p-5">
                                <Row
                                    label="Show business hours to users"
                                    description="When enabled, customers will see your business hours in the chat window."
                                >
                                    <Toggle
                                        checked={showBusinessHours}
                                        onChange={() =>
                                            setShowBusinessHours(
                                                !showBusinessHours,
                                            )
                                        }
                                    />
                                </Row>
                                <Row
                                    label="Show agent status to users"
                                    description="When enabled, customers can see when an agent or AI is actively handling their conversation."
                                >
                                    <Toggle
                                        checked={showAgentStatus}
                                        onChange={() =>
                                            setShowAgentStatus(!showAgentStatus)
                                        }
                                    />
                                </Row>
                                <Row
                                    label="Require email verification"
                                    description="Only allow verified emails to use chat."
                                >
                                    <Toggle
                                        checked={requireEmailVerification}
                                        onChange={() =>
                                            setRequireEmailVerification(
                                                !requireEmailVerification,
                                            )
                                        }
                                    />
                                </Row>
                                <Row
                                    label="Enable unread messages notifications"
                                    description="When enabled, customers will receive email notifications about unread messages."
                                >
                                    <Toggle
                                        checked={enableUnreadNotifications}
                                        onChange={() =>
                                            setEnableUnreadNotifications(
                                                !enableUnreadNotifications,
                                            )
                                        }
                                    />
                                </Row>

                                <div className="space-y-1.5 pt-3.5">
                                    <label className="block text-xs font-semibold text-foreground">
                                        Chat URL
                                    </label>
                                    <input
                                        type="text"
                                        value={chatUrl}
                                        onChange={(e) =>
                                            setChatUrl(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5 pt-3.5">
                                    <label className="block text-xs font-semibold text-foreground">
                                        Notifications delay
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={notificationsDelay}
                                            onChange={(e) =>
                                                setNotificationsDelay(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            minutes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INSTALL */}
                        {activeTab === 'install' && (
                            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-foreground">
                                        Install this chat app on your website
                                    </label>
                                    <button
                                        onClick={() =>
                                            handleCopy(scriptSnippet, 'snippet')
                                        }
                                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {copiedSnippet ? (
                                            <span className="flex items-center gap-1 font-semibold text-success">
                                                <Check className="h-3.5 w-3.5" />{' '}
                                                Copied!
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Copy className="h-3.5 w-3.5" />{' '}
                                                Copy snippet
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Add the following code snippet to your
                                    website — ideally just before {'</body>'} —
                                    to install the chat app. It already reflects
                                    everything configured in the other tabs.
                                </p>
                                <pre className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">
                                    {scriptSnippet}
                                </pre>

                                <div className="space-y-1.5 border-t border-border/40 pt-3">
                                    <label className="block text-xs font-bold text-foreground">
                                        Try it live
                                    </label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Opens a real standalone page with this
                                        chat app installed, so you can test it
                                        end-to-end without touching your own
                                        website. Reflects your last{' '}
                                        <strong>saved</strong> settings — save
                                        changes first if you just edited
                                        something.
                                    </p>
                                    <a
                                        href={`/widget-preview/${appId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
                                    >
                                        Open live preview page
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* SECURITY */}
                        {activeTab === 'security' && (
                            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                                <label className="block text-xs font-bold text-foreground">
                                    Authenticate your customers
                                </label>
                                <p className="text-[11px] text-muted-foreground">
                                    By default, new conversations in chat are
                                    anonymous. You can authenticate your
                                    customers so you can see their details and
                                    previous conversations.
                                </p>

                                <div className="space-y-2 rounded-xl border border-border/60 bg-background p-4">
                                    <span className="block text-xs font-semibold text-muted-foreground">
                                        Authentication secret
                                    </span>
                                    <p className="text-[11px] text-muted-foreground">
                                        You will need a shared secret to
                                        authenticate your customers.
                                    </p>
                                    <button
                                        onClick={() =>
                                            router.post(
                                                `/settings/channels/chat/secret`,
                                                { channel_id: channelId },
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () =>
                                                        toast.success(
                                                            'Generated new authentication secret!',
                                                        ),
                                                },
                                            )
                                        }
                                        className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                                    >
                                        <Key className="h-3.5 w-3.5 text-warning" />
                                        <span>Generate secret</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Preview */}
                    <div className="sticky top-8 hidden xl:block">
                        <p className="mb-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Live preview
                        </p>
                        <ChatWidgetPreview
                            appName={appName}
                            colors={colors}
                            logoUrl={logoUrl}
                            greeting={greeting}
                            links={links.filter(
                                (l) => l.text.trim() && l.url.trim(),
                            )}
                            buttons={chatButtons
                                .filter((b) => b.text.trim())
                                .map((b) => ({ icon: b.icon, text: b.text }))}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
