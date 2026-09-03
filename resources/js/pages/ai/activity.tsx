import { Head, router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/hooks/use-confirm';

export interface AiActivityLogEntry {
    id: string;
    thread: { id: string; subject: string | null };
    generated_reply: string;
    matched_articles: Array<{ title: string; url: string }> | null;
    status: 'pending_review' | 'sent' | 'edited' | 'rejected';
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

interface AiActivityPageProps {
    entries: Paginated<AiActivityLogEntry>;
    status: 'all' | 'responded' | 'handed_off' | 'knowledge_gaps';
    mode: 'shadow' | 'live';
}

const STATUS_LABELS: Record<AiActivityLogEntry['status'], string> = {
    pending_review: 'Pending review',
    sent: 'Sent',
    edited: 'Edited',
    rejected: 'Handed off',
};

export default function AiActivityPage({
    entries,
    status,
    mode,
}: AiActivityPageProps) {
    const confirm = useConfirm();
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState('');
    const [busyId, setBusyId] = React.useState<string | null>(null);

    const changeTab = (nextStatus: string) => {
        router.get(
            '/ai/activity',
            { status: nextStatus },
            { preserveScroll: true, preserveState: true },
        );
    };

    const approve = (entry: AiActivityLogEntry) => {
        setBusyId(entry.id);
        router.post(
            `/ai/activity/${entry.id}/approve`,
            editingId === entry.id ? { generated_reply: draft } : {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusyId(null);
                    setEditingId(null);
                },
            },
        );
    };

    const reject = async (entry: AiActivityLogEntry) => {
        if (
            !(await confirm({
                title: 'Reject this AI reply?',
                description:
                    'The thread will be handed off to a human agent instead.',
                confirmText: 'Reject',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        setBusyId(entry.id);
        router.post(
            `/ai/activity/${entry.id}/reject`,
            {},
            { preserveScroll: true, onFinish: () => setBusyId(null) },
        );
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
            <Head title="Activity — AI Agent" />

            {mode === 'shadow' && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    AI is in shadow mode — replies shown here were not sent.
                </div>
            )}

            <Tabs value={status} onValueChange={changeTab}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="responded">Responded</TabsTrigger>
                    <TabsTrigger value="handed_off">Handed off</TabsTrigger>
                    <TabsTrigger value="knowledge_gaps">
                        Knowledge gaps
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {entries.data.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <AlertTriangle />
                        </EmptyMedia>
                        <EmptyTitle>No activity yet</EmptyTitle>
                        <EmptyDescription>
                            Generated replies will show up here.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Thread</TableHead>
                            <TableHead>Reply</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entries.data.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="max-w-[160px] truncate">
                                    {entry.thread.subject ?? 'Untitled'}
                                </TableCell>
                                <TableCell className="max-w-md whitespace-normal">
                                    {editingId === entry.id ? (
                                        <Textarea
                                            value={draft}
                                            onChange={(e) =>
                                                setDraft(e.target.value)
                                            }
                                            className="min-h-20 text-xs"
                                        />
                                    ) : (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                            {entry.generated_reply}
                                        </p>
                                    )}
                                    {!entry.matched_articles ||
                                    entry.matched_articles.length === 0 ? (
                                        <Badge
                                            variant="outline"
                                            className="mt-1"
                                        >
                                            Knowledge gap
                                        </Badge>
                                    ) : null}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            entry.status === 'rejected'
                                                ? 'destructive'
                                                : entry.status ===
                                                    'pending_review'
                                                  ? 'secondary'
                                                  : 'default'
                                        }
                                    >
                                        {STATUS_LABELS[entry.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {new Date(
                                        entry.created_at,
                                    ).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {entry.status === 'pending_review' && (
                                        <div className="flex justify-end gap-1.5">
                                            {editingId === entry.id ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setEditingId(null)
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingId(entry.id);
                                                        setDraft(
                                                            entry.generated_reply,
                                                        );
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                disabled={busyId === entry.id}
                                                onClick={() => approve(entry)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={busyId === entry.id}
                                                onClick={() => reject(entry)}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {entries.last_page > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Page {entries.current_page} of {entries.last_page}
                    </span>
                    <div className="flex gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={entries.current_page <= 1}
                            onClick={() =>
                                router.get(
                                    '/ai/activity',
                                    {
                                        status,
                                        page: entries.current_page - 1,
                                    },
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                )
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={entries.current_page >= entries.last_page}
                            onClick={() =>
                                router.get(
                                    '/ai/activity',
                                    {
                                        status,
                                        page: entries.current_page + 1,
                                    },
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                )
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
