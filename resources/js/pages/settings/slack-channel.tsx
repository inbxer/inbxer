import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    MessageSquareText,
    Plus,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Zap,
} from 'lucide-react';
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
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';

interface SlackWorkspaceItem {
    id: string;
    name: string;
    slack_team_id: string;
    connected_by: string;
    connected_at: string;
    is_active: boolean;
}

export default function SlackChannelPage({
    workspaces = [],
}: {
    workspaces?: SlackWorkspaceItem[];
}) {
    const connect = () => router.get('/settings/channels/slack/connect');

    return (
        <>
            <Head title="Slack — Channels" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className="w-fit">
                            Native integration
                        </Badge>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Slack support
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Turn channel conversations into organized,
                                two-way customer support.
                            </p>
                        </div>
                    </div>
                    <Button onClick={connect}>
                        <Plus data-icon="inline-start" />
                        Add workspace
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            icon: Zap,
                            title: 'Automatic ingestion',
                            body: 'Create support threads from connected channels.',
                        },
                        {
                            icon: RefreshCw,
                            title: 'Two-way sync',
                            body: 'Keep Slack replies and Inbxer timelines aligned.',
                        },
                        {
                            icon: ShieldCheck,
                            title: 'Secure events',
                            body: 'Verify signatures and safely deduplicate retries.',
                        },
                    ].map((feature) => (
                        <Card key={feature.title}>
                            <CardHeader>
                                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                                    <feature.icon className="size-5" />
                                </div>
                                <CardTitle className="mt-3 text-base">
                                    {feature.title}
                                </CardTitle>
                                <CardDescription>
                                    {feature.body}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle>Connected workspaces</CardTitle>
                                <CardDescription>
                                    Manage channel access, ingestion rules,
                                    reactions, and delivery.
                                </CardDescription>
                            </div>
                            <Badge variant="outline">
                                {workspaces.length} connected
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {workspaces.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <MessageSquareText />
                                    </EmptyMedia>
                                    <EmptyTitle>
                                        Connect your first Slack workspace
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        Install Inbxer in Slack to bring support
                                        conversations into one operational
                                        inbox.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button onClick={connect}>
                                        <Sparkles data-icon="inline-start" />
                                        Connect to Slack
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        ) : (
                            <div className="flex flex-col">
                                {workspaces.map((workspace, index) => (
                                    <div key={workspace.id}>
                                        {index > 0 && <Separator />}
                                        <Link
                                            href={`/settings/channels/slack/${workspace.id}`}
                                            className="group flex items-center gap-4 py-4"
                                        >
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                                <MessageSquareText className="size-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-medium">
                                                        {workspace.name}
                                                    </p>
                                                    <Badge
                                                        variant={
                                                            workspace.is_active
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {workspace.is_active
                                                            ? 'Active'
                                                            : 'Paused'}
                                                    </Badge>
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    Connected by{' '}
                                                    {workspace.connected_by} ·{' '}
                                                    {workspace.slack_team_id}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                            >
                                                <span>
                                                    <ArrowRight />
                                                </span>
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    {workspaces.length > 0 && (
                        <CardFooter className="justify-between">
                            <p className="text-xs text-muted-foreground">
                                Event delivery is monitored per workspace.
                            </p>
                            <Button variant="outline" onClick={connect}>
                                <Plus data-icon="inline-start" />
                                Add another
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </>
    );
}
