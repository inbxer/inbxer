import {
    Bell,
    Book,
    Bug,
    Lightbulb,
    MessageCircle,
    Plug,
    Hash,
    Mail,
    Link2,
    Pencil,
    Send,
    LifeBuoy,
    AlertTriangle,
    X,
} from 'lucide-react';
import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface WidgetLink {
    icon?: string;
    text: string;
    url: string;
}

interface WidgetButton {
    icon?: string;
    text: string;
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

interface ChatWidgetPreviewProps {
    appName: string;
    colors: WidgetColors;
    logoUrl: string;
    greeting: string;
    links: WidgetLink[];
    buttons: WidgetButton[];
}

const DEFAULT_BUTTONS: WidgetButton[] = [
    { icon: 'chat', text: 'Ask a question' },
    { icon: 'bulb', text: 'Send feedback' },
    { icon: 'bug', text: 'Report an issue' },
];

// Mirrors ICONS in public/widget/chat-widget.js so the preview never diverges from the real render.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    bell: Bell,
    book: Book,
    bug: Bug,
    bulb: Lightbulb,
    chat: MessageCircle,
    integration: Plug,
    discord: Hash,
    discord_muted: Hash,
    email: Mail,
    slack: MessageCircle,
    slack_muted: MessageCircle,
    link: Link2,
    pencil: Pencil,
    send: Send,
    support: LifeBuoy,
    error: AlertTriangle,
};

function IconFor({
    name,
    className,
    style,
}: {
    name?: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    const Icon = (name && ICONS[name]) || MessageCircle;

    return <Icon className={className} style={style} />;
}

/**
 * Mirrors the actual rendered markup (and full color system) of public/widget/chat-widget.js's
 * welcome screen 1:1, so what you see here is what visitors see once the snippet is installed.
 */
export function ChatWidgetPreview({
    colors,
    logoUrl,
    greeting,
    links,
    buttons,
}: ChatWidgetPreviewProps) {
    const heroName = greeting ? `Hey ${greeting}` : 'Hey there';
    const effectiveButtons = buttons.length > 0 ? buttons : DEFAULT_BUTTONS;
    const launcherBg = colors.launcher_background_color || colors.brand_color;
    const border = colors.border_color || 'rgba(255,255,255,.08)';

    return (
        <div className="space-y-3">
            <div
                className="flex w-[380px] max-w-full flex-col overflow-hidden rounded-[20px] shadow-2xl"
                style={{
                    border: `1px solid ${border}`,
                    background: colors.background_color,
                    color: colors.text_color,
                    fontFamily:
                        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
                }}
            >
                <div
                    className="relative px-5 pt-11 pb-14"
                    style={{
                        background: `radial-gradient(120% 100% at 0% 0%, ${colors.brand_color}22, transparent 60%), ${colors.background_color}`,
                    }}
                >
                    <button
                        className="absolute top-3.5 right-3.5 hover:opacity-80"
                        style={{ color: colors.muted_text_color }}
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt=""
                            className="mb-5 block h-[26px]"
                        />
                    ) : (
                        <div
                            className="mb-5 flex h-[26px] w-[26px] items-center justify-center rounded-md"
                            style={{ background: colors.brand_color }}
                        >
                            <MessageCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                    )}

                    <div
                        className="mb-0.5 text-[19px] font-bold"
                        style={{ color: colors.brand_color }}
                    >
                        {heroName}
                    </div>
                    <h2 className="mb-4 text-[22px] font-extrabold">
                        How can we help?
                    </h2>

                    {links.length > 0 && (
                        <div className="space-y-0.5">
                            {links.map((l, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 py-1.5 text-[13px]"
                                    style={{ color: colors.muted_text_color }}
                                >
                                    <IconFor
                                        name={l.icon}
                                        className="h-3.5 w-3.5"
                                    />
                                    <span>{l.text || 'Link'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div
                    className="relative -mt-6 flex-1 rounded-t-[18px] p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.3)]"
                    style={{
                        border: `1px solid ${border}`,
                        background: colors.surface_color,
                    }}
                >
                    <div className="flex flex-col gap-2">
                        {effectiveButtons.map((btn, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2.5 rounded-[10px] p-3.5 text-[13px] font-semibold"
                                style={{
                                    border: `1.5px solid ${border}`,
                                    background: colors.background_color,
                                }}
                            >
                                <IconFor
                                    name={btn.icon}
                                    className="h-3.5 w-3.5"
                                    style={{ color: colors.brand_color }}
                                />
                                <span>{btn.text || 'Untitled button'}</span>
                            </div>
                        ))}
                    </div>

                    {/* Real widget only shows this section once the visitor has past conversations — hidden here to match a fresh session. */}
                </div>

                <div
                    className="flex items-center justify-center gap-1.5 py-2 text-[10px]"
                    style={{ color: colors.muted_text_color }}
                >
                    <span>Powered by</span>
                    <svg
                        viewBox="0 0 34 34"
                        className="h-3 w-3 shrink-0"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <rect
                            x="0"
                            y="0"
                            width="22"
                            height="22"
                            rx="2.64"
                            fill="#191C22"
                        />
                        <rect
                            x="12"
                            y="12"
                            width="22"
                            height="22"
                            rx="2.64"
                            fill="#1A79D3"
                        />
                    </svg>
                    <span className="font-semibold">Inbxer</span>
                </div>
            </div>

            <div className="flex justify-end">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg"
                            style={{
                                background: launcherBg,
                                color: colors.launcher_icon_color,
                            }}
                        >
                            <MessageCircle className="h-5 w-5" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>Launcher preview</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
