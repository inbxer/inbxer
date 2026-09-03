import { Head, router } from '@inertiajs/react';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CHANNEL_ICONS } from '@/lib/channel-icons';

interface AutoResponseItem {
    id: string;
    name: string;
    message: string;
    channels: string[] | null;
    is_enabled: boolean;
}

interface AutoResponsesPageProps {
    autoResponses: AutoResponseItem[];
    channelOptions: Array<{ value: string; label: string }>;
}

export default function AutoResponsesPage({
    autoResponses = [],
    channelOptions,
}: AutoResponsesPageProps) {
    const createNew = () => {
        router.post(window.location.pathname, {});
    };

    const toggle = (id: string) => {
        router.post(
            `${window.location.pathname}/${id}/toggle`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Auto-responses" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Auto-responses</h1>
                    <p className="text-sm text-muted-foreground">
                        Automatically send a message when a new thread is
                        created. Only the first matching enabled auto-response
                        will be sent.
                    </p>
                </div>
                <Button onClick={createNew}>
                    <Plus data-icon="inline-start" />
                    New auto-response
                </Button>
            </div>

            {autoResponses.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircle />
                        </EmptyMedia>
                        <EmptyTitle>No auto-responses yet</EmptyTitle>
                        <EmptyDescription>
                            Create one to greet customers instantly on new
                            threads.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {autoResponses.map((autoResponse) => (
                        <div
                            key={autoResponse.id}
                            className="flex items-center justify-between gap-3 p-3"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    router.get(
                                        `${window.location.pathname}/${autoResponse.id}`,
                                    )
                                }
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                                <span className="text-xs font-semibold">
                                    {autoResponse.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {(autoResponse.channels ?? []).map((c) => {
                                        const Icon =
                                            CHANNEL_ICONS[c] ?? MessageCircle;

                                        return (
                                            <Tooltip key={c}>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help text-muted-foreground">
                                                        <Icon className="size-3.5" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {channelOptions.find(
                                                        (o) => o.value === c,
                                                    )?.label ?? c}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </button>
                            <Switch
                                checked={autoResponse.is_enabled}
                                onCheckedChange={() => toggle(autoResponse.id)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
