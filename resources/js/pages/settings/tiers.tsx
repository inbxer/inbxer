import { router, Head } from '@inertiajs/react';
import {
    Plus,
    ChevronLeft,
    Check,
    Copy,
    X,
    CornerUpLeft,
    AlertCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { TierManagementCard } from '@/components/settings/tier-management-card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface TierItem {
    id: string;
    name: string;
    color?: string;
    external_id?: string;
    priority?: string;
    threads_count?: number;
    slas?: SlaCard[];
}

interface SlaCard {
    id: string;
    type: 'first_response' | 'next_response';
    hours: number;
    minutes: number;
    onlyBusinessHours: boolean;
    priorities: string[];
    labels: string[];
    requireAllLabels: boolean;
    notifyBeforeHours: number;
    notifyBeforeMinutes: number;
    notifyOnBreach: boolean;
}

interface ManageTiersProps {
    tiers: TierItem[];
    availableLabels?: Array<{ id: string; name: string }>;
}

export default function ManageTiersPage({
    tiers = [],
    availableLabels = [],
}: ManageTiersProps) {
    const confirm = useConfirm();

    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [selectedTier, setSelectedTier] = useState<TierItem | null>(null);
    const [tierName, setTierName] = useState('');
    const [externalId, setExternalId] = useState('');
    const [defaultPriority, setDefaultPriority] = useState('normal');
    const [idCopied, setIdCopied] = useState(false);

    // SLAs State
    const [slaCards, setSlaCards] = useState<SlaCard[]>([]);

    // Default label options if empty
    const labelOptions =
        availableLabels.length > 0
            ? availableLabels
            : [
                  { id: '1', name: 'Feedback' },
                  { id: '2', name: 'Account' },
                  { id: '3', name: 'Question' },
                  { id: '4', name: 'Billing' },
              ];

    // Add New SLA Card
    const handleAddSla = (type: 'first_response' | 'next_response') => {
        const hasFirstResponse = slaCards.some(
            (s) => s.type === 'first_response',
        );

        if (type === 'next_response' && !hasFirstResponse) {
            return;
        }

        const newCard: SlaCard = {
            id: `sla_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type,
            hours: 0,
            minutes: 0,
            onlyBusinessHours: false,
            priorities: [],
            labels: [],
            requireAllLabels: false,
            notifyBeforeHours: 0,
            notifyBeforeMinutes: 0,
            notifyOnBreach: false,
        };

        setSlaCards((prev) => {
            const updated = [...prev, newCard];

            return updated.sort((a, b) =>
                a.type === 'first_response'
                    ? -1
                    : b.type === 'first_response'
                      ? 1
                      : 0,
            );
        });
    };

    // Remove SLA Card
    const handleRemoveSla = (slaId: string) => {
        setSlaCards((prev) => prev.filter((s) => s.id !== slaId));
    };

    // Update SLA Card Field
    const handleUpdateSlaField = (
        slaId: string,
        field: keyof SlaCard,
        value: any,
    ) => {
        setSlaCards((prev) =>
            prev.map((s) => {
                if (s.id !== slaId) {
                    return s;
                }

                return { ...s, [field]: value };
            }),
        );
    };

    // Toggle Priority in SLA Card
    const handleTogglePriority = (slaId: string, priority: string) => {
        setSlaCards((prev) =>
            prev.map((s) => {
                if (s.id !== slaId) {
                    return s;
                }

                const current = s.priorities;
                const updated = current.includes(priority)
                    ? current.filter((p) => p !== priority)
                    : [...current, priority];

                return { ...s, priorities: updated };
            }),
        );
    };

    // Toggle Label in SLA Card
    const handleToggleLabel = (slaId: string, labelName: string) => {
        setSlaCards((prev) =>
            prev.map((s) => {
                if (s.id !== slaId) {
                    return s;
                }

                const current = s.labels;
                const updated = current.includes(labelName)
                    ? current.filter((l) => l !== labelName)
                    : [...current, labelName];

                return { ...s, labels: updated };
            }),
        );
    };

    // Open Create Tier View
    const handleOpenCreateTier = () => {
        setTierName('');
        setExternalId('');
        setDefaultPriority('normal');
        setSlaCards([]);
        setView('create');
    };

    // Open Edit Tier View
    const handleOpenEditTier = (tr: TierItem) => {
        setSelectedTier(tr);
        setTierName(tr.name);
        const loadedSlas = [...(tr.slas || [])].sort((a, b) =>
            a.type === 'first_response'
                ? -1
                : b.type === 'first_response'
                  ? 1
                  : 0,
        );
        setSlaCards(loadedSlas);
        setView('edit');
    };

    // Save Tier Edits
    const handleUpdateTier = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!selectedTier || !tierName.trim()) {
            return;
        }

        // Validate SLAs
        for (const sla of slaCards) {
            const totalResponseMinutes = sla.hours * 60 + sla.minutes;
            const totalNotifyMinutes =
                sla.notifyBeforeHours * 60 + sla.notifyBeforeMinutes;

            if (
                totalResponseMinutes > 0 &&
                totalNotifyMinutes >= totalResponseMinutes
            ) {
                toast.error(
                    `Error in ${sla.type === 'first_response' ? 'First' : 'Next'} response time SLA: The notification time before breach must be lower than the response time.`,
                );

                return;
            }
        }

        router.patch(
            `/settings/tiers/${selectedTier.id}`,
            {
                name: tierName.trim(),
                external_id: externalId.trim() || null,
                priority: defaultPriority,
                slas: slaCards as any,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setView('list');
                    setSelectedTier(null);
                },
            },
        );
    };

    // Create Tier
    const handleCreateTier = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!tierName.trim()) {
            return;
        }

        // Validate SLAs
        for (const sla of slaCards) {
            const totalResponseMinutes = sla.hours * 60 + sla.minutes;
            const totalNotifyMinutes =
                sla.notifyBeforeHours * 60 + sla.notifyBeforeMinutes;

            if (
                totalResponseMinutes > 0 &&
                totalNotifyMinutes >= totalResponseMinutes
            ) {
                toast.error(
                    `Error in ${sla.type === 'first_response' ? 'First' : 'Next'} response time SLA: The notification time before breach must be lower than the response time.`,
                );

                return;
            }
        }

        router.post(
            `/settings/tiers`,
            {
                name: tierName.trim(),
                external_id: externalId.trim() || null,
                priority: defaultPriority,
                color: tierName.toLowerCase().includes('paid')
                    ? '#f59e0b'
                    : '#a855f7',
                slas: slaCards as any,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setTierName('');
                    setExternalId('');
                    setSlaCards([]);
                    setView('list');
                },
            },
        );
    };

    const handleDeleteTier = async (tierId: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }

        if (
            await confirm({
                title: 'Delete this tier?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(`/settings/tiers/${tierId}`, {
                preserveState: true,
                onSuccess: () => {
                    if (view === 'edit') {
                        setView('list');
                        setSelectedTier(null);
                    }
                },
            });
        }
    };

    const handleCopyTierId = () => {
        if (!selectedTier) {
            return;
        }

        navigator.clipboard.writeText(`tr_${selectedTier.id}`);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
    };

    // Shared Render Helper for SLA Section
    const renderSlaSection = () => {
        const hasFirstResponse = slaCards.some(
            (s) => s.type === 'first_response',
        );

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-foreground">
                            SLAs
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                            Add SLAs to keep your support timely.
                        </p>
                    </div>

                    {/* Add SLA Dropdown Button */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70"
                            >
                                <span>Add SLA</span>
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 space-y-1 border-border bg-card p-1.5 text-foreground">
                            <DropdownMenuItem
                                onClick={() => handleAddSla('first_response')}
                                className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-medium hover:bg-muted"
                            >
                                <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>First response time</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!hasFirstResponse}
                                onClick={() => {
                                    if (hasFirstResponse) {
                                        handleAddSla('next_response');
                                    }
                                }}
                                className={`flex items-center justify-between rounded p-2 text-xs font-medium transition-colors ${
                                    !hasFirstResponse
                                        ? 'cursor-not-allowed text-muted-foreground opacity-40'
                                        : 'cursor-pointer hover:bg-muted'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Next response time</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Render Interactive SLA Cards */}
                {slaCards.map((sla) => {
                    const totalRespMin = sla.hours * 60 + sla.minutes;
                    const totalNotifyMin =
                        sla.notifyBeforeHours * 60 + sla.notifyBeforeMinutes;
                    const isInvalidNotificationTime =
                        totalRespMin > 0 && totalNotifyMin >= totalRespMin;

                    return (
                        <div
                            key={sla.id}
                            className="relative space-y-4 rounded-xl border border-border bg-card p-5"
                        >
                            {/* Remove SLA Card Button (x) */}
                            <button
                                type="button"
                                onClick={() => handleRemoveSla(sla.id)}
                                className="absolute top-4 right-4 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {/* Row 1: Title & Time Inputs + Business Hours Toggle */}
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <CornerUpLeft className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-bold text-foreground capitalize">
                                        {sla.type === 'first_response'
                                            ? 'First response time'
                                            : 'Next response time'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            min="0"
                                            value={sla.hours}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'hours',
                                                    Math.max(
                                                        0,
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    ),
                                                )
                                            }
                                            className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:border-ring focus:outline-none"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            hour
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={sla.minutes}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'minutes',
                                                    Math.max(
                                                        0,
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    ),
                                                )
                                            }
                                            className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:border-ring focus:outline-none"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            minutes
                                        </span>
                                    </div>

                                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                        <span>Only during business hours</span>
                                        <input
                                            type="checkbox"
                                            checked={sla.onlyBusinessHours}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'onlyBusinessHours',
                                                    e.target.checked,
                                                )
                                            }
                                            className="cursor-pointer rounded border-border bg-background text-primary focus:ring-0"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Row 2: Priorities Filter */}
                            <div className="space-y-1.5">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Applies{' '}
                                    {sla.priorities.length > 0
                                        ? 'when the priority of the thread is any of'
                                        : 'to threads with any priority'}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {sla.priorities.map((p) => (
                                        <span
                                            key={p}
                                            className="flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-xs font-semibold text-warning capitalize"
                                        >
                                            <span>≡ {p}</span>
                                            <X
                                                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleTogglePriority(
                                                        sla.id,
                                                        p,
                                                    )
                                                }
                                            />
                                        </span>
                                    ))}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="cursor-pointer rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                                            >
                                                + Add priority
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-40 space-y-0.5 border-border bg-card p-1 text-foreground">
                                            {[
                                                'urgent',
                                                'high',
                                                'normal',
                                                'low',
                                            ].map((pr) => (
                                                <DropdownMenuItem
                                                    key={pr}
                                                    onClick={() =>
                                                        handleTogglePriority(
                                                            sla.id,
                                                            pr,
                                                        )
                                                    }
                                                    className="cursor-pointer rounded p-1.5 text-xs capitalize hover:bg-muted"
                                                >
                                                    {pr}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Row 3: Labels Filter */}
                            <div className="space-y-1.5 border-t border-border/40 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        And the thread has{' '}
                                        {sla.labels.length > 0
                                            ? sla.requireAllLabels
                                                ? 'all of these labels'
                                                : 'any of these labels'
                                            : 'any label (or no labels)'}
                                    </span>
                                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                        <span>Require all labels</span>
                                        <input
                                            type="checkbox"
                                            checked={sla.requireAllLabels}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'requireAllLabels',
                                                    e.target.checked,
                                                )
                                            }
                                            className="cursor-pointer rounded border-border bg-background text-primary focus:ring-0"
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    {sla.labels.map((lbl) => (
                                        <span
                                            key={lbl}
                                            className="flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-1 text-xs font-semibold text-primary"
                                        >
                                            <span>💬 {lbl}</span>
                                            <X
                                                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleToggleLabel(
                                                        sla.id,
                                                        lbl,
                                                    )
                                                }
                                            />
                                        </span>
                                    ))}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="cursor-pointer rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                                            >
                                                + Add label
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="max-h-40 w-48 space-y-0.5 overflow-y-auto border-border bg-card p-1 text-foreground">
                                            {labelOptions.map((l) => (
                                                <DropdownMenuItem
                                                    key={l.id}
                                                    onClick={() =>
                                                        handleToggleLabel(
                                                            sla.id,
                                                            l.name,
                                                        )
                                                    }
                                                    className="cursor-pointer rounded p-1.5 text-xs hover:bg-muted"
                                                >
                                                    {l.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Row 4: Escalation & Notification before Breach Validation */}
                            <div className="space-y-2 border-t border-border/40 pt-2">
                                <h5 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <span>↑</span> Escalate to your team
                                </h5>

                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    sla.notifyBeforeHours > 0 ||
                                                    sla.notifyBeforeMinutes > 0
                                                }
                                                onChange={(e) => {
                                                    if (!e.target.checked) {
                                                        handleUpdateSlaField(
                                                            sla.id,
                                                            'notifyBeforeHours',
                                                            0,
                                                        );
                                                        handleUpdateSlaField(
                                                            sla.id,
                                                            'notifyBeforeMinutes',
                                                            0,
                                                        );
                                                    } else {
                                                        handleUpdateSlaField(
                                                            sla.id,
                                                            'notifyBeforeMinutes',
                                                            12,
                                                        );
                                                    }
                                                }}
                                                className="cursor-pointer rounded border-border bg-background text-primary focus:ring-0"
                                            />
                                            <span>Notify</span>
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            value={sla.notifyBeforeHours}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'notifyBeforeHours',
                                                    Math.max(
                                                        0,
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    ),
                                                )
                                            }
                                            className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:border-ring focus:outline-none"
                                        />
                                        <span>hour</span>

                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={sla.notifyBeforeMinutes}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'notifyBeforeMinutes',
                                                    Math.max(
                                                        0,
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    ),
                                                )
                                            }
                                            className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs text-foreground focus:border-ring focus:outline-none"
                                        />
                                        <span>minutes</span>
                                        <span>before breach</span>
                                    </div>

                                    {/* SLA Validation Warning Notice */}
                                    {isInvalidNotificationTime && (
                                        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-1.5 text-[11px] text-warning">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                The notification time before
                                                breach must be lower than the{' '}
                                                {sla.type === 'first_response'
                                                    ? 'first'
                                                    : 'next'}{' '}
                                                response time.
                                            </span>
                                        </div>
                                    )}

                                    <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            checked={sla.notifyOnBreach}
                                            onChange={(e) =>
                                                handleUpdateSlaField(
                                                    sla.id,
                                                    'notifyOnBreach',
                                                    e.target.checked,
                                                )
                                            }
                                            className="cursor-pointer rounded border-border bg-background text-primary focus:ring-0"
                                        />
                                        <span>Notify when SLA breaches</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {slaCards.length === 0 && (
                    <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
                        No SLAs configured. Click "Add SLA" to create a First or
                        Next response time policy.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Tiers & SLAs" />

            {view === 'edit' && selectedTier ? (
                /* EDIT TIER VIEW */
                <div className="space-y-6">
                    <div
                        onClick={() => {
                            setView('list');
                            setSelectedTier(null);
                        }}
                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Tiers</span>
                    </div>

                    <h1 className="text-xl font-semibold">Edit tier</h1>

                    <form
                        onSubmit={handleUpdateTier}
                        className="max-w-3xl space-y-6"
                    >
                        {/* Name */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                Name
                            </label>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring">
                                <span className="text-warning">🔸</span>
                                <input
                                    type="text"
                                    value={tierName}
                                    onChange={(e) =>
                                        setTierName(e.target.value)
                                    }
                                    placeholder="e.g. Free tier"
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Tier ID */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <h3 className="text-xs font-bold text-foreground">
                                Tier ID
                            </h3>
                            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                                <span>tr_{selectedTier.id}</span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={handleCopyTierId}
                                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                                        >
                                            {idCopied ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Copy Tier ID
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* External ID */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                External ID
                            </label>
                            <input
                                type="text"
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="e.g. 'free-tier'"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>

                        {/* Default Priority */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                Default priority
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                                This priority will be assigned to all threads
                                for this tier of customer.
                            </p>
                            <Select
                                value={defaultPriority}
                                onValueChange={(val) => setDefaultPriority(val)}
                            >
                                <SelectTrigger className="h-8 w-48 border-border bg-background text-xs font-medium text-foreground capitalize">
                                    <SelectValue placeholder="Normal" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card text-foreground">
                                    <SelectItem value="urgent">
                                        Urgent
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="normal">
                                        Normal
                                    </SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SLAs Section */}
                        {renderSlaSection()}

                        {/* Submit & Archive Actions */}
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <Button
                                type="submit"
                                disabled={!tierName.trim()}
                                className="text-xs font-semibold"
                            >
                                Save changes
                            </Button>

                            <button
                                type="button"
                                onClick={(e) =>
                                    handleDeleteTier(selectedTier.id, e)
                                }
                                className="cursor-pointer text-xs font-semibold text-destructive hover:text-destructive/80"
                            >
                                Delete tier
                            </button>
                        </div>
                    </form>
                </div>
            ) : view === 'create' ? (
                /* CREATE TIER VIEW (IDENTICAL FORM TO EDIT TIER VIEW) */
                <div className="space-y-6">
                    <div
                        onClick={() => setView('list')}
                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Tiers</span>
                    </div>

                    <h1 className="text-xl font-semibold">Create tier</h1>

                    <form
                        onSubmit={handleCreateTier}
                        className="max-w-3xl space-y-6"
                    >
                        {/* Name */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                Name
                            </label>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring">
                                <span className="text-warning">🔸</span>
                                <input
                                    type="text"
                                    value={tierName}
                                    onChange={(e) =>
                                        setTierName(e.target.value)
                                    }
                                    placeholder="e.g. Free tier"
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* External ID */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                External ID
                            </label>
                            <input
                                type="text"
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="e.g. 'free-tier'"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>

                        {/* Default Priority */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <label className="text-xs font-semibold text-foreground">
                                Default priority
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                                This priority will be assigned to all threads
                                for this tier of customer.
                            </p>
                            <Select
                                value={defaultPriority}
                                onValueChange={(val) => setDefaultPriority(val)}
                            >
                                <SelectTrigger className="h-8 w-48 border-border bg-background text-xs font-medium text-foreground capitalize">
                                    <SelectValue placeholder="Normal" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card text-foreground">
                                    <SelectItem value="urgent">
                                        Urgent
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="normal">
                                        Normal
                                    </SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SLAs Section */}
                        {renderSlaSection()}

                        {/* Submit Action */}
                        <div className="flex items-center justify-end border-t border-border pt-4">
                            <Button
                                type="submit"
                                disabled={!tierName.trim()}
                                className="text-xs font-semibold"
                            >
                                Create tier
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                /* TIERS MANAGEMENT LIST VIEW */
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Tiers &amp; SLAs
                        </h1>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Manage customer service tiers, priorities, and
                            response SLA policies across your workspace.
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-muted-foreground">
                            Total Tiers: {tiers.length}
                        </div>

                        <Button
                            onClick={handleOpenCreateTier}
                            className="flex h-8 cursor-pointer items-center gap-1.5 border border-border bg-card px-3 text-xs text-foreground hover:bg-muted"
                        >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            <span>Create tier</span>
                        </Button>
                    </div>

                    {/* Tiers List */}
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {tiers.map((tr) => (
                            <TierManagementCard
                                key={tr.id}
                                tier={tr}
                                onEdit={handleOpenEditTier}
                                onDelete={handleDeleteTier}
                            />
                        ))}

                        {tiers.length === 0 && (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No tiers found. Click "Create tier" to create
                                one.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
