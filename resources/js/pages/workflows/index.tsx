import { Head, Link, router } from '@inertiajs/react';
import { Plus, Sparkles, Workflow as WorkflowIcon } from 'lucide-react';
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

interface WorkflowListItem {
    id: string;
    name: string;
    status: 'draft' | 'published' | 'archived';
    trigger_type: string;
    trigger_label: string;
    is_enabled: boolean;
    last_triggered_at: string | null;
    updated_at: string | null;
}

interface TemplateSummary {
    key: string;
    name: string;
    description: string;
    tags: string[];
}

interface WorkflowsPageProps {
    workflows: WorkflowListItem[];
    triggerOptions: Array<{ value: string; label: string }>;
    templates: TemplateSummary[];
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) {
        return 'Never';
    }

    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 60) {
        return `${Math.max(1, diffMin)}min ago`;
    }

    const diffHours = Math.floor(diffMin / 60);

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
}

export default function WorkflowsPage({
    workflows = [],
    templates = [],
}: WorkflowsPageProps) {
    const [creating, setCreating] = React.useState(false);

    const createBlank = () => {
        if (creating) {
            return;
        }

        setCreating(true);
        router.post(
            `/workflows`,
            { name: 'Untitled workflow' },
            { onFinish: () => setCreating(false) },
        );
    };

    const createFromTemplate = (key: string) => {
        if (creating) {
            return;
        }

        setCreating(true);
        router.post(
            `/workflows`,
            { template: key },
            { onFinish: () => setCreating(false) },
        );
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            <Head title="Workflows" />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <WorkflowIcon className="size-5 text-muted-foreground" />
                    <h1 className="text-xl font-semibold">Workflows</h1>
                </div>
                <Button onClick={createBlank} disabled={creating}>
                    <Plus data-icon="inline-start" />
                    Add workflow
                </Button>
            </div>

            {templates.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                            Featured templates
                        </h2>
                        <Link
                            href={`/workflows/templates`}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {templates.map((template) => (
                            <div
                                key={template.key}
                                className="flex flex-col justify-between gap-3 rounded-lg border border-border p-3.5"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="size-3.5 text-primary" />
                                        <h3 className="text-sm font-semibold">
                                            {template.name}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {template.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {template.tags.map((tag) => (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="text-[10px]"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={creating}
                                    onClick={() =>
                                        createFromTemplate(template.key)
                                    }
                                >
                                    Use template
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {workflows.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <WorkflowIcon />
                        </EmptyMedia>
                        <EmptyTitle>No workflows yet</EmptyTitle>
                        <EmptyDescription>
                            Automate assignment, labeling, and notifications
                            when threads are created or updated.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Trigger</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last triggered</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workflows.map((workflow) => (
                                <TableRow
                                    key={workflow.id}
                                    className="cursor-pointer"
                                    onClick={() =>
                                        router.get(`/workflows/${workflow.id}`)
                                    }
                                >
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/workflows/${workflow.id}`}
                                        >
                                            {workflow.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {workflow.trigger_label}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                workflow.status === 'published'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="capitalize"
                                        >
                                            {workflow.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatRelativeTime(
                                            workflow.last_triggered_at,
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
