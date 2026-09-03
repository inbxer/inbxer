import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    Clock,
    Globe,
    Link as LinkIcon,
    Plus,
    XCircle,
} from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

function formatRelative(dateStr: string | null): string | null {
    if (!dateStr) {
        return null;
    }

    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) {
        return 'just now';
    }

    if (diffMin < 60) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }

    const diffHours = Math.floor(diffMin / 60);

    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function StatusIcon({
    status,
    error,
}: {
    status: 'pending' | 'indexed' | 'failed';
    error: string | null;
}) {
    if (status === 'failed') {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <XCircle className="size-4 shrink-0 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>{error ?? 'Indexing failed.'}</TooltipContent>
            </Tooltip>
        );
    }

    if (status === 'pending') {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Indexing hasn&apos;t run yet.</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            </TooltipTrigger>
            <TooltipContent>Indexed successfully.</TooltipContent>
        </Tooltip>
    );
}

interface HelpCenterSummary {
    id: string;
    site_url: string;
    is_active: boolean;
    articles_count: number;
    indexed_count: number;
    pending_count: number;
    failed_count: number;
    last_synced_at: string | null;
}

interface KnowledgeSourceSummary {
    id: string;
    source_url: string;
    kind: 'sitemap' | 'url';
    is_active: boolean;
    status: 'pending' | 'indexed' | 'failed';
    created_at: string | null;
    added_by_label: string | null;
    articles_count: number;
    indexed_count: number;
    pending_count: number;
    failed_count: number;
    last_synced_at: string | null;
    last_sync_error: string | null;
}

interface AiKnowledgeSourcesPageProps {
    helpCenters: HelpCenterSummary[];
    sitemaps: KnowledgeSourceSummary[];
    urls: KnowledgeSourceSummary[];
    mintlify_settings_url: string;
}

function KnowledgeSourceRow({
    source,
    onResync,
    onRemove,
}: {
    source: KnowledgeSourceSummary;
    onResync: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const addedRelative = formatRelative(source.created_at);
    const syncedRelative = formatRelative(source.last_synced_at);

    return (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <StatusIcon
                        status={source.status}
                        error={source.last_sync_error}
                    />
                    <p className="truncate text-sm font-medium">
                        {source.source_url}
                    </p>
                    <Badge variant={source.is_active ? 'default' : 'secondary'}>
                        {source.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    {source.articles_count} articles
                    {addedRelative && (
                        <>
                            {' · '}
                            Added {addedRelative}
                            {source.added_by_label
                                ? ` by ${source.added_by_label}`
                                : ''}
                            .
                        </>
                    )}{' '}
                    {source.status === 'failed'
                        ? 'Indexing failed.'
                        : syncedRelative
                          ? `Last indexed ${syncedRelative}.`
                          : 'Last indexed soon.'}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResync(source.id)}
                >
                    Resync
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(source.id)}
                >
                    Remove
                </Button>
            </div>
        </div>
    );
}

export default function AiKnowledgeSourcesPage({
    helpCenters,
    sitemaps = [],
    urls = [],
}: AiKnowledgeSourcesPageProps) {
    const confirm = useConfirm();
    const { props } = usePage();
    const currentTeam = props.currentTeam as { id: number } | undefined;
    const [sitemapUrl, setSitemapUrl] = React.useState('');
    const [pageUrl, setPageUrl] = React.useState('');

    // Realtime: a queued sync job finishing (success or failure) refreshes
    // the indexing status live — no polling, no manual page refresh needed.
    React.useEffect(() => {
        if (!currentTeam?.id) {
            return;
        }

        window.Echo.private(`team.${currentTeam.id}`).listen(
            '.knowledge-source.updated',
            () => {
                router.reload({ only: ['sitemaps', 'urls'] });
            },
        );

        return () => {
            window.Echo.leave(`team.${currentTeam.id}`);
        };
    }, [currentTeam?.id]);

    const totals = [...helpCenters, ...sitemaps, ...urls].reduce(
        (acc, source) => ({
            indexed: acc.indexed + source.indexed_count,
            pending: acc.pending + source.pending_count,
            failed: acc.failed + source.failed_count,
        }),
        { indexed: 0, pending: 0, failed: 0 },
    );

    const addSitemap = (event: React.FormEvent) => {
        event.preventDefault();

        if (!sitemapUrl.trim()) {
            return;
        }

        router.post(
            '/ai/knowledge-sources/sitemaps',
            { source_url: sitemapUrl.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setSitemapUrl(''),
            },
        );
    };

    const addUrl = (event: React.FormEvent) => {
        event.preventDefault();

        if (!pageUrl.trim()) {
            return;
        }

        router.post(
            '/ai/knowledge-sources/urls',
            { source_url: pageUrl.trim() },
            {
                preserveScroll: true,
                onSuccess: () => setPageUrl(''),
            },
        );
    };

    const resync = (id: string) => {
        router.post(
            `/ai/knowledge-sources/${id}/resync`,
            {},
            { preserveScroll: true },
        );
    };

    const remove = async (id: string) => {
        if (
            !(await confirm({
                title: 'Remove knowledge source?',
                description:
                    'This deletes the source and all of its indexed articles.',
                confirmText: 'Remove',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/ai/knowledge-sources/${id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Knowledge Sources — AI Agent" />

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Health</CardTitle>
                    <CardDescription>
                        Articles the AI Agent can cite when replying.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-lg font-semibold">
                            {totals.indexed}
                        </p>
                        <p className="text-muted-foreground">Indexed</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-lg font-semibold">
                            {totals.pending}
                        </p>
                        <p className="text-muted-foreground">Pending</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <p className="text-lg font-semibold">{totals.failed}</p>
                        <p className="text-muted-foreground">Failed</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Help centers</CardTitle>
                    <CardDescription>
                        Connected via the Mintlify integration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {helpCenters.length === 0 ? (
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">
                                No Help Center connected yet.
                            </p>
                            <Link href="/settings/integrations/mintlify">
                                <Button variant="outline" size="sm">
                                    <BookOpen data-icon="inline-start" />
                                    Connect
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        helpCenters.map((hc) => (
                            <div
                                key={hc.id}
                                className="flex items-center justify-between rounded-lg border border-border p-3"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium">
                                            {hc.site_url}
                                        </p>
                                        <Badge
                                            variant={
                                                hc.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {hc.is_active
                                                ? 'Active'
                                                : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {hc.articles_count} articles · Synced{' '}
                                        {hc.last_synced_at
                                            ? new Date(
                                                  hc.last_synced_at,
                                              ).toLocaleString()
                                            : 'never'}
                                    </p>
                                </div>
                                <Link href="/settings/integrations/mintlify">
                                    <Button variant="outline" size="sm">
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Globe className="size-4" />
                        Sitemaps
                    </CardTitle>
                    <CardDescription>
                        Index a whole documentation site from its sitemap.xml.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <form
                        onSubmit={addSitemap}
                        className="flex items-center gap-2"
                    >
                        <Input
                            type="url"
                            placeholder="https://example.com/sitemap.xml"
                            value={sitemapUrl}
                            onChange={(e) => setSitemapUrl(e.target.value)}
                        />
                        <Button type="submit" size="sm">
                            <Plus data-icon="inline-start" />
                            Add sitemap
                        </Button>
                    </form>

                    {sitemaps.map((source) => (
                        <KnowledgeSourceRow
                            key={source.id}
                            source={source}
                            onResync={resync}
                            onRemove={remove}
                        />
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <LinkIcon className="size-4" />
                        Individual URLs
                    </CardTitle>
                    <CardDescription>
                        Add one-off pages as knowledge sources.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <form onSubmit={addUrl} className="flex items-center gap-2">
                        <Input
                            type="url"
                            placeholder="https://example.com/pricing"
                            value={pageUrl}
                            onChange={(e) => setPageUrl(e.target.value)}
                        />
                        <Button type="submit" size="sm">
                            <Plus data-icon="inline-start" />
                            Add URL
                        </Button>
                    </form>

                    {urls.map((source) => (
                        <KnowledgeSourceRow
                            key={source.id}
                            source={source}
                            onResync={resync}
                            onRemove={remove}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
