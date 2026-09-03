import { Head, Link } from '@inertiajs/react';
import {
    Bot,
    CheckCircle2,
    Circle,
    Code2,
    FileText,
    Globe2,
    KeyRound,
    Mail,
    MessageCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

function SlackIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
    );
}

interface ChannelsPageProps {
    channels?: Record<
        string,
        { connected: boolean; name: string; description: string }
    >;
}

type ChannelCardProps = {
    name: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    iconClassName: string;
    href?: string;
    connected?: boolean;
    disabled?: boolean;
    cta?: string;
};

function ChannelCard({
    name,
    description,
    icon: Icon,
    iconClassName,
    href,
    connected = false,
    disabled = false,
    cta,
}: ChannelCardProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div
                        className={`flex size-10 items-center justify-center rounded-lg ${iconClassName}`}
                    >
                        <Icon className="size-5" />
                    </div>
                    {!disabled &&
                        (connected ? (
                            <Badge
                                variant="secondary"
                                className="border-success/20 bg-success/10 text-success"
                            >
                                <CheckCircle2 className="size-3" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-muted-foreground"
                            >
                                <Circle className="size-3" />
                                Not connected
                            </Badge>
                        ))}
                </div>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter>
                {href ? (
                    <Button
                        variant={connected ? 'outline' : 'default'}
                        className="w-full"
                        asChild
                    >
                        <Link href={href} prefetch>
                            {cta ?? (connected ? 'Configure' : 'Set up')}
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full"
                        disabled={disabled}
                    >
                        Coming soon
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function ChannelsPage({ channels = {} }: ChannelsPageProps) {
    const essentials: ChannelCardProps[] = [
        {
            name: 'Slack',
            description:
                channels.slack?.description ??
                'Turn Slack conversations into support threads.',
            icon: SlackIcon,
            iconClassName: 'bg-muted text-foreground',
            connected: channels.slack?.connected ?? false,
            href: `/settings/channels/slack`,
        },
        {
            name: 'Email',
            description:
                channels.email?.description ??
                'Receive and reply to support requests by email.',
            icon: Mail,
            iconClassName: 'bg-muted text-foreground',
            connected: channels.email?.connected ?? false,
            href: `/settings/channels/email`,
        },
        {
            name: 'Chat',
            description: 'Add a live support widget to your website.',
            icon: MessageCircle,
            iconClassName: 'bg-muted text-foreground',
            connected: channels.chat?.connected ?? false,
            href: `/settings/channels/chat`,
        },
        {
            name: 'API',
            description:
                channels.api?.description ??
                'Create API keys to build custom integrations.',
            icon: KeyRound,
            iconClassName: 'bg-muted text-foreground',
            connected: channels.api?.connected ?? false,
            href: `/settings/api-keys`,
            cta: channels.api?.connected ? 'Manage keys' : 'Create key',
        },
    ];
    const upcoming: ChannelCardProps[] = [
        {
            name: 'Microsoft Teams',
            description: 'Support customers through Microsoft Teams.',
            icon: Bot,
            iconClassName: 'bg-muted text-muted-foreground',
            disabled: true,
        },
        {
            name: 'Discord',
            description: 'Connect Discord communities to your support inbox.',
            icon: MessageCircle,
            iconClassName: 'bg-muted text-muted-foreground',
            disabled: true,
        },
        {
            name: 'Forms',
            description: 'Publish embeddable contact and request forms.',
            icon: FileText,
            iconClassName: 'bg-muted text-muted-foreground',
            disabled: true,
        },
        {
            name: 'Headless Portal',
            description: 'Build a custom customer portal on top of the API.',
            icon: Globe2,
            iconClassName: 'bg-muted text-muted-foreground',
            disabled: true,
        },
        {
            name: 'API Explorer',
            description:
                'Interactively browse and test the API from the dashboard.',
            icon: Code2,
            iconClassName: 'bg-muted text-muted-foreground',
            disabled: true,
        },
    ];
    const connectedCount = essentials.filter((c) => c.connected).length;

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
            <Head title="Channels — Inbxer Settings" />
            <div className="flex flex-col gap-8">
                <header className="flex flex-col gap-1">
                    <h1 className="text-xl font-semibold">Channels</h1>
                    <p className="text-sm text-muted-foreground">
                        Connect and configure every place customers can reach
                        your team — {connectedCount} of {essentials.length}{' '}
                        connected.
                    </p>
                </header>
                <section
                    className="flex flex-col gap-4"
                    aria-labelledby="active-channels"
                >
                    <div>
                        <h2 id="active-channels" className="font-medium">
                            Essential channels
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Channels available to configure now.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {essentials.map((channel) => (
                            <ChannelCard key={channel.name} {...channel} />
                        ))}
                    </div>
                </section>
                <section
                    className="flex flex-col gap-4"
                    aria-labelledby="upcoming-channels"
                >
                    <div>
                        <h2 id="upcoming-channels" className="font-medium">
                            More channels
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Additional integrations planned for the platform.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {upcoming.map((channel) => (
                            <ChannelCard key={channel.name} {...channel} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
