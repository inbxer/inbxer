import { Head, router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Plus,
    Trash2,
    Webhook as WebhookIcon,
} from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface WebhookItem {
    id: string;
    url: string;
    secret: string;
    events: string[];
    is_active: boolean;
    creator_name: string | null;
    last_triggered_at: string | null;
    created_at: string | null;
}

interface WebhooksPageProps {
    webhooks: WebhookItem[];
    availableEvents: string[];
}

export default function WebhooksPage({
    webhooks,
    availableEvents,
}: WebhooksPageProps) {
    const confirm = useConfirm();

    const [showCreate, setShowCreate] = React.useState(false);
    const [url, setUrl] = React.useState('');
    const [events, setEvents] = React.useState<string[]>([]);
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    const toggleEvent = (event: string) => {
        setEvents((prev) =>
            prev.includes(event)
                ? prev.filter((e) => e !== event)
                : [...prev, event],
        );
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!url.trim() || events.length === 0) {
            return;
        }

        router.post(
            `/settings/webhooks`,
            { url: url.trim(), events },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUrl('');
                    setEvents([]);
                    setShowCreate(false);
                },
            },
        );
    };

    const handleToggleActive = (webhook: WebhookItem) => {
        router.patch(
            `/settings/webhooks/${webhook.id}`,
            {
                url: webhook.url,
                events: webhook.events,
                is_active: !webhook.is_active,
            },
            { preserveScroll: true },
        );
    };

    const handleDelete = async (webhookId: string) => {
        if (
            !(await confirm({
                title: 'Delete this webhook?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/settings/webhooks/${webhookId}`, {
            preserveScroll: true,
        });
    };

    const handleCopySecret = (webhook: WebhookItem) => {
        navigator.clipboard.writeText(webhook.secret);
        setCopiedId(webhook.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Webhooks — Inbxer Settings" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Webhooks</h1>
                    <p className="text-xs text-muted-foreground">
                        Receive real-time HTTP notifications when events happen
                        in your workspace. Payloads are signed with HMAC-SHA256
                        in the <code>X-Inbxer-Signature</code> header.
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                    <Plus className="size-3.5" />
                    Add endpoint
                </Button>
            </div>

            {webhooks.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <WebhookIcon />
                        </EmptyMedia>
                        <EmptyTitle>No webhooks yet</EmptyTitle>
                        <EmptyDescription>
                            Add an endpoint to start receiving event
                            notifications.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {webhooks.map((webhook) => (
                        <div key={webhook.id} className="space-y-2 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {webhook.url}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {webhook.events.join(', ')} · Last
                                        triggered:{' '}
                                        {webhook.last_triggered_at
                                            ? new Date(
                                                  webhook.last_triggered_at,
                                              ).toLocaleString()
                                            : 'Never'}
                                    </p>
                                </div>
                                <Switch
                                    checked={webhook.is_active}
                                    onCheckedChange={() =>
                                        handleToggleActive(webhook)
                                    }
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleDelete(webhook.id)
                                            }
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete webhook
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-[11px]">
                                <span className="truncate">
                                    {webhook.secret}
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleCopySecret(webhook)
                                            }
                                            className="size-6 shrink-0"
                                        >
                                            {copiedId === webhook.id ? (
                                                <Check className="size-3 text-success" />
                                            ) : (
                                                <Copy className="size-3" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy secret</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Add webhook endpoint</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Endpoint URL
                            </label>
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/webhooks/inbxer"
                                type="url"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Events
                            </label>
                            <div className="space-y-1.5 rounded-lg border border-border p-3">
                                {availableEvents.map((event) => (
                                    <label
                                        key={event}
                                        className="flex cursor-pointer items-center gap-2 text-xs"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={events.includes(event)}
                                            onChange={() => toggleEvent(event)}
                                            className="size-3.5"
                                        />
                                        <code>{event}</code>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!url.trim() || events.length === 0}
                            >
                                Add endpoint
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
