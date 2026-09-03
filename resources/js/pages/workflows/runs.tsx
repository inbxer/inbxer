import { Head, Link } from '@inertiajs/react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDuration } from '@/lib/insights-format';

interface RunLog {
    id: string;
    step_type: string | null;
    action_type: string | null;
    status: string;
    output: Record<string, unknown> | null;
    executed_at: string | null;
}

interface RunRow {
    id: string;
    workflow_id: string;
    workflow_name: string;
    status: string;
    status_label: string;
    status_color: string;
    started_at: string | null;
    duration_seconds: number | null;
    error_message: string | null;
    subject: { type: 'thread' | 'tenant'; label: string } | null;
    logs: RunLog[];
}

interface PaginatedRuns {
    data: RunRow[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface RunsPageProps {
    runs: PaginatedRuns;
    workflows: Array<{ id: string; name: string }>;
}

function decodePaginationLabel(label: string): string {
    return label
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/&amp;/g, '&');
}

export default function WorkflowRunsPage({ runs, workflows }: RunsPageProps) {
    const [expanded, setExpanded] = React.useState<string | null>(null);
    const [workflowFilter, setWorkflowFilter] = React.useState('all');

    const filteredRuns =
        workflowFilter === 'all'
            ? runs.data
            : runs.data.filter((r) => r.workflow_id === workflowFilter);

    return (
        <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
            <Head title="Runs — Workflows" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Runs</h1>
                    <p className="text-sm text-muted-foreground">
                        Execution history across all your workflows.
                    </p>
                </div>
                <Select
                    value={workflowFilter}
                    onValueChange={setWorkflowFilter}
                >
                    <SelectTrigger className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All workflows</SelectItem>
                        {workflows.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                                {w.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {filteredRuns.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Activity />
                        </EmptyMedia>
                        <EmptyTitle>No runs yet</EmptyTitle>
                        <EmptyDescription>
                            Runs will show up here once a workflow trigger
                            fires.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {filteredRuns.map((run) => (
                        <div key={run.id}>
                            <button
                                type="button"
                                onClick={() =>
                                    setExpanded(
                                        expanded === run.id ? null : run.id,
                                    )
                                }
                                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
                            >
                                {expanded === run.id ? (
                                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                <Badge
                                    style={{
                                        backgroundColor: `${run.status_color}20`,
                                        color: run.status_color,
                                    }}
                                    className="shrink-0 border-none"
                                >
                                    {run.status_label}
                                </Badge>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {run.workflow_name}
                                </span>
                                {run.subject && (
                                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                                        {run.subject.label}
                                    </span>
                                )}
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatDuration(run.duration_seconds)}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {run.started_at
                                        ? new Date(
                                              run.started_at,
                                          ).toLocaleString()
                                        : ''}
                                </span>
                            </button>

                            {expanded === run.id && (
                                <div className="space-y-2 border-t border-border bg-muted/30 p-3">
                                    {run.error_message && (
                                        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                                            {run.error_message}
                                        </p>
                                    )}
                                    {run.logs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            No steps were executed.
                                        </p>
                                    ) : (
                                        run.logs.map((log) => (
                                            <div
                                                key={log.id}
                                                className="rounded-md border border-border bg-card p-2 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">
                                                        {log.step_type ===
                                                        'condition'
                                                            ? 'Condition'
                                                            : (log.action_type ??
                                                              'Step')}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {log.executed_at
                                                            ? new Date(
                                                                  log.executed_at,
                                                              ).toLocaleTimeString()
                                                            : ''}
                                                    </span>
                                                </div>
                                                {log.output && (
                                                    <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                                                        {JSON.stringify(
                                                            log.output,
                                                        )}
                                                    </pre>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {runs.links.length > 3 && (
                <div className="flex flex-wrap items-center gap-1">
                    {runs.links.map((link, idx) => (
                        <Link
                            key={idx}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={`rounded-md px-2.5 py-1 text-xs ${
                                link.active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                        >
                            {decodePaginationLabel(link.label)}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
