import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, BarChart3 } from 'lucide-react';
import React from 'react';
import { CHART_COLORS, SegmentedBar } from '@/components/insights/charts';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDuration } from '@/lib/insights-format';

interface BreakdownRow {
    label: string;
    volume: number;
    first_response_seconds: number | null;
    next_response_seconds: number | null;
    resolution_seconds: number | null;
    customer_wait_seconds: number | null;
    messages_sent?: number;
    assigned?: number;
    resolved?: number;
}

interface BreakdownPageProps {
    title: string;
    dimension: string;
    rows: BreakdownRow[];
    timeframe: string;
}

type SortKey = keyof BreakdownRow;

const DURATION_KEYS: SortKey[] = [
    'first_response_seconds',
    'next_response_seconds',
    'resolution_seconds',
    'customer_wait_seconds',
];

function SortableHead({
    sortKeyName,
    activeKey,
    activeDir,
    onSort,
    children,
}: {
    sortKeyName: SortKey;
    activeKey: SortKey;
    activeDir: 'asc' | 'desc';
    onSort: (key: SortKey) => void;
    children: React.ReactNode;
}) {
    return (
        <TableHead>
            <button
                type="button"
                onClick={() => onSort(sortKeyName)}
                className="flex items-center gap-1 hover:text-foreground"
            >
                {children}
                {activeKey === sortKeyName &&
                    (activeDir === 'asc' ? (
                        <ArrowUp className="size-3" />
                    ) : (
                        <ArrowDown className="size-3" />
                    ))}
            </button>
        </TableHead>
    );
}

export default function BreakdownPage({
    title,
    dimension,
    rows,
    timeframe: initialTimeframe,
}: BreakdownPageProps) {
    const [timeframe, setTimeframe] = React.useState(initialTimeframe);
    const [sortKey, setSortKey] = React.useState<SortKey>('volume');
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

    const isAssigneeDimension = dimension === 'assignee';
    const totalVolume = rows.reduce((sum, row) => sum + row.volume, 0);

    const changeTimeframe = (value: string) => {
        setTimeframe(value);
        router.get(
            window.location.pathname,
            { timeframe: value },
            { preserveState: true, preserveScroll: true },
        );
    };

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sortedRows = React.useMemo(() => {
        const withDefaults = rows.map((r) => ({
            ...r,
            _sortValue:
                r[sortKey] ?? (DURATION_KEYS.includes(sortKey) ? -1 : 0),
        }));

        withDefaults.sort((a, b) => {
            const av =
                typeof a._sortValue === 'string'
                    ? a._sortValue
                    : Number(a._sortValue);
            const bv =
                typeof b._sortValue === 'string'
                    ? b._sortValue
                    : Number(b._sortValue);

            if (av === bv) {
                return 0;
            }

            const result = av < bv ? -1 : 1;

            return sortDir === 'asc' ? result : -result;
        });

        return withDefaults;
    }, [rows, sortKey, sortDir]);

    return (
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
            <Head title={`${title} — Insights`} />

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">{title}</h1>
                <Select value={timeframe} onValueChange={changeTimeframe}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="past_week">Past week</SelectItem>
                        <SelectItem value="past_month">Past month</SelectItem>
                        <SelectItem value="past_quarter">
                            Past quarter
                        </SelectItem>
                        <SelectItem value="all_time">All time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {rows.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BarChart3 />
                        </EmptyMedia>
                        <EmptyTitle>No data available</EmptyTitle>
                        <EmptyDescription>
                            No threads were created in this period matching this
                            breakdown.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    {totalVolume > 0 && (
                        <SegmentedBar rows={rows} colors={CHART_COLORS} />
                    )}

                    <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHead
                                        sortKeyName="label"
                                        activeKey={sortKey}
                                        activeDir={sortDir}
                                        onSort={toggleSort}
                                    >
                                        {title}
                                    </SortableHead>
                                    {isAssigneeDimension && (
                                        <>
                                            <SortableHead
                                                sortKeyName="messages_sent"
                                                activeKey={sortKey}
                                                activeDir={sortDir}
                                                onSort={toggleSort}
                                            >
                                                Messages sent
                                            </SortableHead>
                                            <SortableHead
                                                sortKeyName="assigned"
                                                activeKey={sortKey}
                                                activeDir={sortDir}
                                                onSort={toggleSort}
                                            >
                                                Assigned
                                            </SortableHead>
                                            <SortableHead
                                                sortKeyName="resolved"
                                                activeKey={sortKey}
                                                activeDir={sortDir}
                                                onSort={toggleSort}
                                            >
                                                Resolved
                                            </SortableHead>
                                        </>
                                    )}
                                    {!isAssigneeDimension && (
                                        <SortableHead
                                            sortKeyName="volume"
                                            activeKey={sortKey}
                                            activeDir={sortDir}
                                            onSort={toggleSort}
                                        >
                                            Volume
                                        </SortableHead>
                                    )}
                                    <SortableHead
                                        sortKeyName="first_response_seconds"
                                        activeKey={sortKey}
                                        activeDir={sortDir}
                                        onSort={toggleSort}
                                    >
                                        First response
                                    </SortableHead>
                                    <SortableHead
                                        sortKeyName="next_response_seconds"
                                        activeKey={sortKey}
                                        activeDir={sortDir}
                                        onSort={toggleSort}
                                    >
                                        Next response
                                    </SortableHead>
                                    <SortableHead
                                        sortKeyName="resolution_seconds"
                                        activeKey={sortKey}
                                        activeDir={sortDir}
                                        onSort={toggleSort}
                                    >
                                        Resolution time
                                    </SortableHead>
                                    <SortableHead
                                        sortKeyName="customer_wait_seconds"
                                        activeKey={sortKey}
                                        activeDir={sortDir}
                                        onSort={toggleSort}
                                    >
                                        Customer wait time
                                    </SortableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRows.map((row) => (
                                    <TableRow key={row.label}>
                                        <TableCell className="font-medium">
                                            {row.label}
                                        </TableCell>
                                        {isAssigneeDimension && (
                                            <>
                                                <TableCell>
                                                    {row.messages_sent ?? 0}
                                                </TableCell>
                                                <TableCell>
                                                    {row.assigned ?? 0}
                                                </TableCell>
                                                <TableCell>
                                                    {row.resolved ?? 0}
                                                </TableCell>
                                            </>
                                        )}
                                        {!isAssigneeDimension && (
                                            <TableCell>{row.volume}</TableCell>
                                        )}
                                        <TableCell>
                                            {formatDuration(
                                                row.first_response_seconds,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(
                                                row.next_response_seconds,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(
                                                row.resolution_seconds,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(
                                                row.customer_wait_seconds,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold">
                                    <TableCell>Total</TableCell>
                                    {isAssigneeDimension ? (
                                        <TableCell colSpan={6} />
                                    ) : (
                                        <>
                                            <TableCell>{totalVolume}</TableCell>
                                            <TableCell colSpan={4} />
                                        </>
                                    )}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
