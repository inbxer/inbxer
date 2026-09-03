import { Head } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
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

interface TopIssueRow {
    label: string;
    color: string;
    volume: number;
}

interface TopIssuesPageProps {
    rows: TopIssueRow[];
}

export default function TopIssuesPage({ rows }: TopIssuesPageProps) {
    return (
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
            <Head title="Top issues — Insights" />

            <div>
                <h1 className="text-xl font-semibold">Top issues</h1>
                <p className="text-sm text-muted-foreground">
                    Which labels are showing up most often on new threads.
                </p>
            </div>

            {rows.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <AlertCircle />
                        </EmptyMedia>
                        <EmptyTitle>No labeled threads yet</EmptyTitle>
                        <EmptyDescription>
                            Once threads are labeled, the most common issues
                            will show up here.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Label</TableHead>
                                <TableHead>Volume</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.label}>
                                    <TableCell className="flex items-center gap-2">
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    row.color || '#6b7280',
                                            }}
                                        />
                                        {row.label}
                                    </TableCell>
                                    <TableCell>{row.volume}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
