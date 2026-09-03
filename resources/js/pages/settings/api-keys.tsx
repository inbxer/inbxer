import { Head, router, usePage } from '@inertiajs/react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface ApiKeyItem {
    id: string;
    name: string;
    key_prefix: string;
    creator_name: string | null;
    last_used_at: string | null;
    expires_at: string | null;
    is_expired: boolean;
    created_at: string | null;
}

interface ApiKeysPageProps {
    keys: ApiKeyItem[];
}

export default function ApiKeysPage({ keys }: ApiKeysPageProps) {
    const page = usePage();
    const flash = page.flash as { raw_api_key?: string } | undefined;
    const confirm = useConfirm();

    const [showCreate, setShowCreate] = React.useState(false);
    const [name, setName] = React.useState('');
    const [expiresAt, setExpiresAt] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [rawKeyDismissed, setRawKeyDismissed] = React.useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        router.post(
            `/settings/api-keys`,
            { name: name.trim(), expires_at: expiresAt || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setName('');
                    setExpiresAt('');
                    setShowCreate(false);
                },
            },
        );
    };

    const handleRevoke = async (keyId: string) => {
        if (
            !(await confirm({
                title: 'Revoke this API key?',
                description:
                    'Any integration using it will stop working immediately.',
                confirmText: 'Revoke',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/settings/api-keys/${keyId}`, {
            preserveScroll: true,
        });
    };

    const handleCopy = () => {
        if (!flash?.raw_api_key) {
            return;
        }

        navigator.clipboard.writeText(flash.raw_api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="API Keys" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">API keys</h1>
                    <p className="text-xs text-muted-foreground">
                        Machine users for programmatic access to Threads,
                        Tenants, Companies, and Tasks under <code>/api/v1</code>
                        .
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                    <Plus className="size-3.5" />
                    Create key
                </Button>
            </div>

            {keys.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <KeyRound />
                        </EmptyMedia>
                        <EmptyTitle>No API keys yet</EmptyTitle>
                        <EmptyDescription>
                            Create a key to authenticate requests to the Inbxer
                            API.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {keys.map((key) => (
                        <div
                            key={key.id}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium">
                                        {key.name}
                                    </p>
                                    {key.is_expired && (
                                        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                            Expired
                                        </span>
                                    )}
                                </div>
                                <p className="font-mono text-xs text-muted-foreground">
                                    {key.key_prefix}
                                    ••••••••••••••••••••••••••••••••
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {key.creator_name &&
                                        `Created by ${key.creator_name} · `}
                                    Last used:{' '}
                                    {key.last_used_at
                                        ? new Date(
                                              key.last_used_at,
                                          ).toLocaleString()
                                        : 'Never'}
                                    {key.expires_at &&
                                        ` · Expires ${new Date(key.expires_at).toLocaleDateString()}`}
                                </p>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRevoke(key.id)}
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revoke API key</TooltipContent>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Create API key</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Name
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Zapier integration"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Expires (optional)
                            </label>
                            <Input
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={!name.trim()}>
                                Create key
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(flash?.raw_api_key) && !rawKeyDismissed}
                onOpenChange={(open) => {
                    if (!open) {
                        setRawKeyDismissed(true);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Your new API key</DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground">
                        Copy this key now — for security, it won't be shown
                        again.
                    </p>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs">
                        <span className="truncate">{flash?.raw_api_key}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleCopy}
                            className="shrink-0"
                        >
                            {copied ? (
                                <Check className="size-3.5 text-success" />
                            ) : (
                                <Copy className="size-3.5" />
                            )}
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => setRawKeyDismissed(true)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
