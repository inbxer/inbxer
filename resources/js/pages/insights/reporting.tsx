import { Head, router } from '@inertiajs/react';
import { ChevronDown, Star } from 'lucide-react';
import React from 'react';
import {
    BarChart,
    CHART_COLORS,
    Heatmap,
    LineChart,
    SegmentedBar,
    Sparkline,
} from '@/components/insights/charts';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDuration } from '@/lib/insights-format';

interface DailyCount {
    date: string;
    count: number;
}

interface DailySeconds {
    date: string;
    seconds: number | null;
}

interface HeatmapCell {
    day: number;
    hour: number;
    count: number;
}

interface BreachedThread {
    id: string;
    title: string | null;
    reference: string;
    type: 'first_response' | 'next_response';
}

interface VolumeRow {
    label: string;
    volume: number;
}

interface OverviewData {
    queue_size: number;
    new_threads: number;
    threads_done: number;
    median_first_response_seconds: number | null;
    median_resolution_seconds: number | null;
    p90_first_response_seconds: number | null;
    p90_resolution_seconds: number | null;
    median_customer_wait_seconds: number | null;
    p90_customer_wait_seconds: number | null;
    median_next_response_seconds: number | null;
    new_threads_per_day: DailyCount[];
    reopened_per_day: DailyCount[];
    done_per_day: DailyCount[];
    first_response_series: DailySeconds[];
    resolution_series: DailySeconds[];
    queue_size_series: DailyCount[];
    heatmap: HeatmapCell[];
    volume_by_company: VolumeRow[];
    volume_by_tier: VolumeRow[];
    volume_by_label: VolumeRow[];
    sla_compliance_first_response: number | null;
    sla_compliance_next_response: number | null;
    breached_threads: BreachedThread[];
    csat: {
        positive_percentage: number | null;
        total_responses: number;
        recent: Array<{
            id: string;
            tenant_name: string | null;
            rating: number | null;
            comment: string | null;
            responded_at: string | null;
        }>;
    };
}

interface ReportingPageProps {
    overview: OverviewData;
    timeframe: string;
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(true);

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="group/section"
        >
            <div className="rounded-lg border border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=closed]/section:-rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 border-t border-border p-4">
                    {children}
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

function StatTile({
    label,
    value,
    hint,
    sparkline,
}: {
    label: string;
    value: string;
    hint?: string;
    sparkline?: number[];
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
            {hint && (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
            {sparkline && (
                <div className="mt-2">
                    <Sparkline data={sparkline} />
                </div>
            )}
        </div>
    );
}

function ResponseMetricSection({
    title,
    medianSeconds,
    p90Seconds,
    series,
    slaCompliance,
    breachedThreads,
    breakdowns,
}: {
    title: string;
    medianSeconds: number | null;
    p90Seconds: number | null;
    series: DailySeconds[];
    slaCompliance?: number | null;
    breachedThreads?: BreachedThread[];
    breakdowns: Array<{ title: string; rows: VolumeRow[] }>;
}) {
    const [percentileView, setPercentileView] = React.useState<
        'median' | 'p90'
    >('median');
    const shownValue = percentileView === 'median' ? medianSeconds : p90Seconds;

    return (
        <Section title={title}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {percentileView === 'median'
                                    ? 'Median'
                                    : '90th percentile'}{' '}
                                {title.toLowerCase()}
                            </p>
                            <p className="text-2xl font-semibold">
                                {formatDuration(shownValue)}
                            </p>
                        </div>
                        <Tabs
                            value={percentileView}
                            onValueChange={(v) =>
                                setPercentileView(v as 'median' | 'p90')
                            }
                        >
                            <TabsList variant="line" className="h-8">
                                <TabsTrigger value="median">Median</TabsTrigger>
                                <TabsTrigger value="p90">
                                    90th Percentile
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <LineChart
                        data={series}
                        formatValue={(s) => formatDuration(s)}
                    />
                </div>

                {slaCompliance !== undefined && (
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                SLA compliance
                            </p>
                            <p className="text-2xl font-semibold">
                                {slaCompliance === null
                                    ? 'N/A'
                                    : `${slaCompliance}%`}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                            <p className="mb-2 text-xs font-semibold">
                                Breached threads
                            </p>
                            {!breachedThreads ||
                            breachedThreads.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No active breached threads. Nice work, go
                                    team!
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {breachedThreads.map((t) => (
                                        <li
                                            key={t.id}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {t.reference} —{' '}
                                            {t.title ?? 'Untitled'}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {breakdowns.map((b) => (
                    <div key={b.title} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                            {b.title}
                        </p>
                        {b.rows.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No data
                            </p>
                        ) : (
                            <SegmentedBar rows={b.rows} colors={CHART_COLORS} />
                        )}
                    </div>
                ))}
            </div>
        </Section>
    );
}

export default function ReportingPage({
    overview,
    timeframe: initialTimeframe,
}: ReportingPageProps) {
    const [timeframe, setTimeframe] = React.useState(initialTimeframe);

    const changeTimeframe = (value: string) => {
        setTimeframe(value);
        router.get(
            `/insights`,
            { timeframe: value },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
            <Head title="Reporting — Insights" />

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Reporting</h1>
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

            <Section title="Overview">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatTile
                        label="Queue size"
                        value={String(overview.queue_size)}
                        hint="in todo right now"
                        sparkline={overview.queue_size_series.map(
                            (d) => d.count,
                        )}
                    />
                    <StatTile
                        label="Median first response time"
                        value={formatDuration(
                            overview.median_first_response_seconds,
                        )}
                        hint="in this period"
                        sparkline={overview.first_response_series.map(
                            (d) => d.seconds ?? 0,
                        )}
                    />
                    <StatTile
                        label="Median resolution time"
                        value={formatDuration(
                            overview.median_resolution_seconds,
                        )}
                        hint="in this period"
                        sparkline={overview.resolution_series.map(
                            (d) => d.seconds ?? 0,
                        )}
                    />
                </div>
            </Section>

            <Section title="Support volume">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            New threads created per day
                        </p>
                        <p className="mb-2 text-lg font-semibold">
                            {overview.new_threads} total
                        </p>
                        <BarChart data={overview.new_threads_per_day} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Threads re-opened per day
                        </p>
                        <p className="mb-2 text-lg font-semibold">
                            {overview.reopened_per_day.reduce(
                                (s, d) => s + d.count,
                                0,
                            )}{' '}
                            total
                        </p>
                        <BarChart
                            data={overview.reopened_per_day}
                            color="#f59e0b"
                        />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Threads moved to Done per day
                        </p>
                        <p className="mb-2 text-lg font-semibold">
                            {overview.threads_done} total
                        </p>
                        <BarChart
                            data={overview.done_per_day}
                            color="#10b981"
                        />
                    </div>
                    <div>
                        <p className="mb-2 text-xs text-muted-foreground">
                            New thread volume by time and day
                        </p>
                        <Heatmap cells={overview.heatmap} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Volume breakdown by company
                        </p>
                        {overview.volume_by_company.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No data
                            </p>
                        ) : (
                            <SegmentedBar
                                rows={overview.volume_by_company}
                                colors={CHART_COLORS}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Volume breakdown by tier
                        </p>
                        {overview.volume_by_tier.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No data
                            </p>
                        ) : (
                            <SegmentedBar
                                rows={overview.volume_by_tier}
                                colors={CHART_COLORS}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                            Volume breakdown by label
                        </p>
                        {overview.volume_by_label.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No data
                            </p>
                        ) : (
                            <SegmentedBar
                                rows={overview.volume_by_label}
                                colors={CHART_COLORS}
                            />
                        )}
                    </div>
                </div>
            </Section>

            <ResponseMetricSection
                title="First response time"
                medianSeconds={overview.median_first_response_seconds}
                p90Seconds={overview.p90_first_response_seconds}
                series={overview.first_response_series}
                slaCompliance={overview.sla_compliance_first_response}
                breachedThreads={overview.breached_threads.filter(
                    (t) => t.type === 'first_response',
                )}
                breakdowns={[
                    { title: 'By company', rows: overview.volume_by_company },
                    { title: 'By tier', rows: overview.volume_by_tier },
                    { title: 'By label', rows: overview.volume_by_label },
                ]}
            />

            <ResponseMetricSection
                title="Next response time"
                medianSeconds={overview.median_next_response_seconds}
                p90Seconds={overview.median_next_response_seconds}
                series={overview.first_response_series}
                slaCompliance={overview.sla_compliance_next_response}
                breachedThreads={overview.breached_threads.filter(
                    (t) => t.type === 'next_response',
                )}
                breakdowns={[
                    { title: 'By company', rows: overview.volume_by_company },
                    { title: 'By tier', rows: overview.volume_by_tier },
                    { title: 'By label', rows: overview.volume_by_label },
                ]}
            />

            <ResponseMetricSection
                title="Resolution time"
                medianSeconds={overview.median_resolution_seconds}
                p90Seconds={overview.p90_resolution_seconds}
                series={overview.resolution_series}
                breakdowns={[
                    { title: 'By company', rows: overview.volume_by_company },
                    { title: 'By tier', rows: overview.volume_by_tier },
                    { title: 'By label', rows: overview.volume_by_label },
                ]}
            />

            <Section title="Customer waiting time">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <StatTile
                        label="Median customer waiting time"
                        value={formatDuration(
                            overview.median_customer_wait_seconds,
                        )}
                        hint="across threads currently waiting for customer"
                    />
                    <StatTile
                        label="90th percentile"
                        value={formatDuration(
                            overview.p90_customer_wait_seconds,
                        )}
                        hint="across threads currently waiting for customer"
                    />
                </div>
            </Section>

            <Section title="Customer survey responses">
                {overview.csat.total_responses === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        No survey responses in this period.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <StatTile
                                label="Positive responses"
                                value={
                                    overview.csat.positive_percentage === null
                                        ? 'N/A'
                                        : `${overview.csat.positive_percentage}%`
                                }
                                hint="rated 4 or 5 stars"
                            />
                            <StatTile
                                label="Total responses"
                                value={String(overview.csat.total_responses)}
                                hint="in this period"
                            />
                        </div>

                        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                            {overview.csat.recent.map((r) => (
                                <div
                                    key={r.id}
                                    className="space-y-1 px-3 py-2.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold">
                                            {r.tenant_name ??
                                                'Unknown customer'}
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            {Array.from({ length: 5 }).map(
                                                (_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`size-3.5 ${
                                                            (r.rating ?? 0) > i
                                                                ? 'fill-warning text-warning'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    {r.comment && (
                                        <p className="text-xs text-muted-foreground">
                                            {r.comment}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Section>
        </div>
    );
}
