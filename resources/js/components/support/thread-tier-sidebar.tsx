import { Link, router } from '@inertiajs/react';
import {
    X,
    Pencil,
    Clock,
    Plus,
    Building2,
    TrendingUp,
    Zap,
    ShieldCheck,
    ExternalLink,
    DollarSign,
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CompanyDetails } from '@/types/support';

interface TierOption {
    id: string;
    name: string;
    color?: string | null;
    default_priority?: string;
    is_default?: boolean;
    sla_first_response_minutes?: number | null;
    sla_next_response_minutes?: number | null;
}

interface ThreadSummary {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at?: string;
    updated_at: string;
    tier_id?: string | null;
    tier?: { id: string; name: string } | null;
    tenant?: {
        company?: CompanyDetails | null;
        tier?: { id: string; name: string } | null;
    } | null;
}

interface ThreadTierSidebarProps {
    onClose: () => void;
    filter?: string;
    availableTiers?: TierOption[];
    availableCompanies?: CompanyDetails[];
    threads?: ThreadSummary[];
}

function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min${minutes === 1 ? '' : 's'}`;
    }

    if (minutes < 1440) {
        const hours = minutes / 60;

        return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? '' : 's'}`;
    }

    const days = minutes / 1440;

    return `${Number.isInteger(days) ? days : days.toFixed(1)} day${days === 1 ? '' : 's'}`;
}

export function ThreadTierSidebar({
    onClose,
    filter = '',
    availableTiers = [],
    availableCompanies = [],
    threads = [],
}: ThreadTierSidebarProps) {
    // Extract tier name or id from filter param e.g. "tier:Enterprise"
    const filterTierVal = filter.startsWith('tier:')
        ? decodeURIComponent(filter.replace('tier:', ''))
        : filter;

    // Find real matching active tier object from availableTiers
    const activeTier = availableTiers.find(
        (t) =>
            t.name.toLowerCase() === filterTierVal.toLowerCase() ||
            t.id === filterTierVal,
    ) || {
        id: 'tier-default',
        name: filterTierVal || 'Standard',
        color: '#8b5cf6',
        default_priority: 'normal',
        is_default: false,
    };

    // Filter real companies assigned to this active tier
    const tierCompanies = availableCompanies.filter(
        (c) =>
            c.tier_id === activeTier.id ||
            c.tier?.id === activeTier.id ||
            c.tier?.name?.toLowerCase() === activeTier.name.toLowerCase(),
    );

    // Filter real threads assigned to this active tier
    const tierThreads = threads.filter(
        (t) =>
            t.tier_id === activeTier.id ||
            t.tier?.id === activeTier.id ||
            t.tier?.name?.toLowerCase() === activeTier.name.toLowerCase() ||
            t.tenant?.tier?.name?.toLowerCase() ===
                activeTier.name.toLowerCase(),
    );

    // Real SLA targets configured for this tier (Tiers & SLAs settings page).
    const slaInfo = {
        firstResponse:
            activeTier.sla_first_response_minutes != null
                ? formatMinutes(activeTier.sla_first_response_minutes)
                : null,
        nextResponse:
            activeTier.sla_next_response_minutes != null
                ? formatMinutes(activeTier.sla_next_response_minutes)
                : null,
    };

    const [nowMs] = React.useState(() => Date.now());

    // Calculate real 30-day support volume distribution across 10 time buckets
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const bucketInterval = thirtyDaysMs / 10;
    const volumeBuckets = Array(10).fill(0);

    tierThreads.forEach((t) => {
        const tDate = new Date(t.created_at || t.updated_at).getTime();
        const ageMs = nowMs - tDate;

        if (ageMs >= 0 && ageMs <= thirtyDaysMs) {
            const bucketIdx = Math.min(
                9,
                Math.floor((thirtyDaysMs - ageMs) / bucketInterval),
            );
            volumeBuckets[bucketIdx] += 1;
        }
    });

    const maxVolume = Math.max(...volumeBuckets, 1);
    const startDate = new Date(nowMs - thirtyDaysMs).toLocaleDateString(
        'en-US',
        {
            month: 'short',
            day: 'numeric',
        },
    );
    const midDate = new Date(
        nowMs - 15 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    // Total ARR / Contract Value for this tier
    const totalArr = tierCompanies.reduce(
        (sum, c) => sum + (Number((c as any).contract_value) || 0),
        0,
    );

    return (
        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-background p-4 text-xs text-foreground max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-xl">
            <div className="flex flex-col gap-5">
                {/* Header Title & Actions */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                        <span
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{
                                backgroundColor: activeTier.color || '#8b5cf6',
                            }}
                        />
                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                            <span>{activeTier.name}</span>
                            <Badge variant="outline">Tier</Badge>
                        </h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        router.get(`/settings/tiers`)
                                    }
                                    className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Pencil />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage Tiers</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="cursor-pointer p-1 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <X />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close details</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* SLAs Section */}
                <div className="space-y-2.5 border-b border-border pb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            <span>SLA Commitments</span>
                        </span>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => router.get(`/settings/tiers`)}
                            className="text-[10px] font-semibold text-primary hover:underline"
                        >
                            Edit SLA
                        </Button>
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-card/40 p-2.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>First response target</span>
                            </div>
                            <span className="font-mono font-bold text-foreground">
                                {slaInfo.firstResponse ?? 'Not set'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-success" />
                                <span>Next response target</span>
                            </div>
                            <span className="font-mono font-bold text-foreground">
                                {slaInfo.nextResponse ?? 'Not set'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Autoresponses Section */}
                <div className="space-y-2.5 border-b border-border pb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-warning" />
                            <span>Autoresponses</span>
                        </span>
                        <Badge variant="secondary">Active</Badge>
                    </div>
                    <p className="text-[11px] leading-normal text-muted-foreground">
                        Automated confirmation and after-hours escalation
                        enabled for {activeTier.name} customers.
                    </p>
                </div>

                {/* Support Volume (30 days) Section */}
                <div className="space-y-2.5 border-b border-border pb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <span>Support volume (30 days)</span>
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {tierThreads.length} threads
                        </span>
                    </div>

                    {/* Bars Chart */}
                    <div className="flex h-20 items-end justify-between gap-1 pt-3">
                        {volumeBuckets.map((val, idx) => {
                            const heightPct =
                                val > 0
                                    ? Math.max(15, (val / maxVolume) * 100)
                                    : 8;

                            return (
                                <div
                                    key={idx}
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-t transition-all ${
                                        val > 0
                                            ? 'bg-primary hover:opacity-90'
                                            : 'bg-muted/40'
                                    }`}
                                    title={`${val} threads`}
                                />
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-muted-foreground">
                        <span>{startDate}</span>
                        <span>{midDate}</span>
                        <span>Today</span>
                    </div>
                </div>

                {/* Tier Member Companies Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-success" />
                            <span>Tier Companies ({tierCompanies.length})</span>
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get(`/companies`)}
                            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                            <Plus data-icon="inline-start" />
                            <span>Add</span>
                        </Button>
                    </div>

                    {totalArr > 0 && (
                        <Card>
                            <CardContent className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5 text-success" />
                                    <span>Total Tier ARR</span>
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                    ${totalArr.toLocaleString()}
                                </span>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-1.5 pt-1">
                        {tierCompanies.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => router.get(`/companies/${c.id}`)}
                                className="group flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-2 text-xs text-foreground transition-colors hover:bg-muted"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                                    <span className="truncate font-medium transition-colors group-hover:text-primary">
                                        {c.name}
                                    </span>
                                </div>
                                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                        ))}

                        {tierCompanies.length === 0 && (
                            <Empty className="border p-4">
                                <EmptyHeader>
                                    <EmptyTitle className="text-sm">
                                        No companies linked
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        No companies are assigned to this tier
                                        yet.
                                    </EmptyDescription>
                                    <Link
                                        href={`/companies`}
                                        className="block pt-1 text-[11px] font-semibold text-primary hover:underline"
                                    >
                                        Assign companies to tier →
                                    </Link>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
