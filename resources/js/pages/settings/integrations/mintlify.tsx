import { Head, router } from '@inertiajs/react';
import { BookOpen, RefreshCw, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useConfirm } from '@/hooks/use-confirm';

interface MintlifyConnectionProps {
    id: string;
    site_url: string;
    is_active: boolean;
    last_synced_at: string | null;
    articles_count: number;
}

interface MintlifySettingsPageProps {
    connection: MintlifyConnectionProps | null;
}

export default function MintlifySettingsPage({
    connection,
}: MintlifySettingsPageProps) {
    const confirm = useConfirm();

    const [siteUrl, setSiteUrl] = React.useState(connection?.site_url ?? '');
    const [isActive, setIsActive] = React.useState(
        connection?.is_active ?? true,
    );
    const [saving, setSaving] = React.useState(false);
    const [syncing, setSyncing] = React.useState(false);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();

        if (!siteUrl.trim()) {
            return;
        }

        setSaving(true);
        router.post(
            `/settings/integrations/mintlify`,
            { site_url: siteUrl.trim() },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!connection || !siteUrl.trim()) {
            return;
        }

        setSaving(true);
        router.patch(
            `/settings/integrations/mintlify/${connection.id}`,
            { site_url: siteUrl.trim(), is_active: isActive },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const handleSyncNow = () => {
        if (!connection) {
            return;
        }

        setSyncing(true);
        router.post(
            `/settings/integrations/mintlify/${connection.id}/sync`,
            {},
            { preserveScroll: true, onFinish: () => setSyncing(false) },
        );
    };

    const handleDisconnect = async () => {
        if (
            !connection ||
            !(await confirm({
                title: 'Disconnect this Mintlify Help Center?',
                description: 'Cached articles will be removed.',
                confirmText: 'Disconnect',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/settings/integrations/mintlify/${connection.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Help Center" />

            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    <BookOpen className="size-5 text-muted-foreground" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">
                        Help Center (Mintlify)
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Connect your Mintlify-hosted docs site to suggest
                        relevant Help Center articles to agents while they reply
                        to a thread.
                    </p>
                </div>
            </div>

            {!connection ? (
                <form
                    onSubmit={handleConnect}
                    className="space-y-4 rounded-xl border border-border bg-card p-6"
                >
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Docs site URL
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                            The root URL of your Mintlify site, e.g.
                            https://docs.example.com
                        </p>
                        <Input
                            value={siteUrl}
                            onChange={(e) => setSiteUrl(e.target.value)}
                            placeholder="https://docs.example.com"
                            type="url"
                            autoFocus
                        />
                    </div>

                    <Button type="submit" disabled={!siteUrl.trim() || saving}>
                        Connect
                    </Button>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                            <p className="text-sm font-semibold">Active</p>
                            <p className="text-xs text-muted-foreground">
                                Suggest articles from this Help Center in reply
                                boxes.
                            </p>
                        </div>
                        <Switch
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <form
                        onSubmit={handleSave}
                        className="space-y-4 rounded-xl border border-border bg-card p-6"
                    >
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Docs site URL
                            </label>
                            <Input
                                value={siteUrl}
                                onChange={(e) => setSiteUrl(e.target.value)}
                                type="url"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={!siteUrl.trim() || saving}
                        >
                            Save changes
                        </Button>
                    </form>

                    <div className="flex items-center justify-between rounded-lg border border-border p-4 text-xs text-muted-foreground">
                        <div>
                            <p className="font-semibold text-foreground">
                                {connection.articles_count} article
                                {connection.articles_count === 1
                                    ? ''
                                    : 's'}{' '}
                                synced
                            </p>
                            <p>
                                Last synced:{' '}
                                {connection.last_synced_at
                                    ? new Date(
                                          connection.last_synced_at,
                                      ).toLocaleString()
                                    : 'Never'}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={syncing}
                            onClick={handleSyncNow}
                            className="gap-1.5"
                        >
                            <RefreshCw
                                className={`size-3.5 ${syncing ? 'animate-spin' : ''}`}
                            />
                            Sync now
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDisconnect}
                        className="gap-1.5"
                    >
                        <Trash2 className="size-3.5" />
                        Disconnect
                    </Button>
                </div>
            )}
        </div>
    );
}
