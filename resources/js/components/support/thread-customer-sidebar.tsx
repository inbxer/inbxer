import { usePage } from '@inertiajs/react';
import {
    X,
    Plus,
    Check,
    Link2,
    MessageCircle,
    CircleDot,
    CheckSquare,
    Building2,
    Pencil,
    MoreHorizontal,
    Copy,
    ArrowLeftRight,
    Trash2,
    Ban,
    Search,
    Sparkles,
    Loader2,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { AssigneeSelect } from '@/components/assignee';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { THREAD_STATUS_OPTIONS } from '@/lib/thread-status';
import type {
    SupportThread,
    Label,
    CompanyDetails,
    TeamMember,
} from '@/types/support';

interface ThreadCustomerSidebarProps {
    selectedThread: SupportThread;
    showSidebar: boolean;
    teamMembers: TeamMember[];
    currentUserId?: number | null;
    availableLabels: Label[];
    availableTiers: Array<{ id: string; name: string }>;
    company?: CompanyDetails | null;
    domainMismatch: {
        mismatches: boolean;
        tenantDomain?: string;
        companyDomain?: string;
    } | null;
    threads?: SupportThread[];
    availableCompanies?: CompanyDetails[];
    handleUpdateMeta: (
        field: 'status' | 'priority' | 'assigned_to' | 'tier_id',
        value: string | null,
    ) => void;
    handleToggleLabel: (labelId: string) => void;
    handleSelectThread: (id: string) => void;
    handleUnlinkTargetThread: (targetId: string, e: React.MouseEvent) => void;
    setShowLinkThreadModal: (show: boolean) => void;
    setShowTaskSearchModal: (show: boolean) => void;
    setShowAssignCompanyModal: (show: boolean) => void;
    setShowCreateCompanyModal?: (show: boolean) => void;
    setShowRenameCustomerModal?: (show: boolean) => void;
    setShowChangeCustomerModal?: (show: boolean) => void;
    executeAttachCompany?: (companyId: string) => void;
}

export function ThreadCustomerSidebar({
    selectedThread,
    showSidebar,
    teamMembers,
    currentUserId = null,
    availableLabels,
    availableTiers,
    company,
    domainMismatch,
    threads = [],
    availableCompanies = [],
    handleUpdateMeta,
    handleToggleLabel,
    handleSelectThread,
    handleUnlinkTargetThread,
    setShowLinkThreadModal,
    setShowTaskSearchModal,
    setShowCreateCompanyModal,
    setShowRenameCustomerModal,
    setShowChangeCustomerModal,
    executeAttachCompany,
}: ThreadCustomerSidebarProps) {
    const confirm = useConfirm();
    const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
    const [companySearchQuery, setCompanySearchQuery] = React.useState('');

    const { ai } = usePage().props as unknown as {
        ai?: {
            thread_catchups_enabled?: boolean;
            similar_threads_enabled?: boolean;
        } | null;
    };
    const catchupsEnabled = Boolean(ai?.thread_catchups_enabled);
    const similarThreadsEnabled = Boolean(ai?.similar_threads_enabled);

    const [summary, setSummary] = React.useState<{
        threadId: string;
        text: string;
    } | null>(null);
    const [summaryLoading, setSummaryLoading] = React.useState(false);
    const [similarThreads, setSimilarThreads] = React.useState<{
        threadId: string;
        items: Array<{ id: string; title: string | null; status: string }>;
    } | null>(null);
    const [similarLoading, setSimilarLoading] = React.useState(false);

    const filteredCompanies = availableCompanies.filter((c) =>
        c.name.toLowerCase().includes(companySearchQuery.toLowerCase()),
    );

    const currentThreadId = selectedThread.id;
    const currentSummary =
        summary?.threadId === currentThreadId ? summary.text : null;
    const currentSimilarThreads =
        similarThreads?.threadId === currentThreadId
            ? similarThreads.items
            : [];

    const fetchSummary = async () => {
        setSummaryLoading(true);

        try {
            const response = await fetch(
                `/threads/${currentThreadId}/ai-summary`,
                { headers: { Accept: 'application/json' } },
            );
            const data = await response.json();

            if (!response.ok) {
                toast.error(data?.error || 'Could not generate a summary.');

                return;
            }

            setSummary({ threadId: currentThreadId, text: data.summary });
        } catch {
            toast.error('Could not generate a summary.');
        } finally {
            setSummaryLoading(false);
        }
    };

    React.useEffect(() => {
        if (!similarThreadsEnabled) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            setSimilarLoading(true);

            try {
                const response = await fetch(
                    `/threads/${currentThreadId}/similar`,
                    { headers: { Accept: 'application/json' } },
                );
                const data = response.ok ? await response.json() : null;

                if (!cancelled && data?.threads) {
                    setSimilarThreads({
                        threadId: currentThreadId,
                        items: data.threads,
                    });
                }
            } catch {
                // ignore — widget just stays empty
            } finally {
                if (!cancelled) {
                    setSimilarLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [currentThreadId, similarThreadsEnabled]);

    if (!showSidebar) {
        return null;
    }

    const customerThreads = selectedThread.tenant?.id
        ? threads.filter((t) => t.tenant?.id === selectedThread.tenant?.id)
        : [];

    return (
        <aside className="cd-scroll h-full min-h-0 w-80 min-w-0 shrink-0 overflow-y-auto border-l bg-background p-4 text-xs text-foreground transition-all max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-xl">
            <div className="flex flex-col gap-6">
                {/* Header Title & Description */}
                <div className="space-y-1">
                    <h3 className="text-xs font-bold text-foreground">
                        {selectedThread.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                        The customer is asking for help but provides no specific
                        details.
                    </p>
                </div>

                {/* AI Catch-up Summary */}
                {catchupsEnabled && (
                    <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span>Catch me up</span>
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={summaryLoading}
                                onClick={fetchSummary}
                            >
                                {summaryLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : currentSummary ? (
                                    'Refresh'
                                ) : (
                                    'Summarize'
                                )}
                            </Button>
                        </div>
                        {currentSummary && (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {currentSummary}
                            </p>
                        )}
                    </div>
                )}

                {/* Similar Threads */}
                {similarThreadsEnabled &&
                    (similarLoading || currentSimilarThreads.length > 0) && (
                        <div className="space-y-1.5 rounded-xl border border-border bg-card p-3.5">
                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                                Similar threads
                            </span>
                            {similarLoading ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Looking for similar threads…</span>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {currentSimilarThreads.map((related) => (
                                        <div
                                            key={related.id}
                                            onClick={() =>
                                                handleSelectThread(related.id)
                                            }
                                            className="flex cursor-pointer items-center gap-1.5 truncate rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-muted"
                                        >
                                            <CircleDot className="h-3 w-3 shrink-0 text-primary" />
                                            <span className="truncate">
                                                {related.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                {/* Attributes List */}
                <div className="space-y-3.5 border-t border-border/60 pt-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">
                            Status
                        </span>
                        <Select
                            value={
                                selectedThread.status || 'needs_first_response'
                            }
                            onValueChange={(val) =>
                                handleUpdateMeta('status', val)
                            }
                        >
                            <SelectTrigger className="h-7 w-44 border-border bg-card text-xs font-medium text-primary">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="w-52 border-border bg-background p-1 text-foreground">
                                {THREAD_STATUS_OPTIONS.map((option) => {
                                    const Icon = option.icon;

                                    return (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            className="cursor-pointer text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    className={`h-3.5 w-3.5 ${option.color}`}
                                                />
                                                <span>{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">
                            Assignee
                        </span>
                        <AssigneeSelect
                            assignees={teamMembers}
                            value={selectedThread.assigned_to ?? null}
                            onValueChange={(val) =>
                                handleUpdateMeta(
                                    'assigned_to',
                                    val === null ? null : String(val),
                                )
                            }
                            currentUserId={currentUserId}
                            triggerClassName="w-36 border-border bg-card text-foreground"
                        />
                    </div>

                    {/* Priority */}
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">
                            Priority
                        </span>
                        <Select
                            value={selectedThread.priority || 'normal'}
                            onValueChange={(val) =>
                                handleUpdateMeta('priority', val)
                            }
                        >
                            <SelectTrigger className="h-7 w-40 border-border bg-card text-xs font-medium text-foreground capitalize">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Multiple Labels Management */}
                    <div className="flex items-start justify-between gap-2">
                        <span className="pt-1 font-medium text-muted-foreground">
                            Labels
                        </span>
                        <div className="flex max-w-[200px] flex-wrap items-center justify-end gap-1">
                            {selectedThread.labels?.map((l) => (
                                <Badge key={l.id} variant="secondary">
                                    <span>{l.name}</span>
                                    <X
                                        className="h-2.5 w-2.5 cursor-pointer text-muted-foreground hover:text-destructive"
                                        onClick={() => handleToggleLabel(l.id)}
                                    />
                                </Badge>
                            ))}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Plus />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="max-h-48 overflow-y-auto border-border bg-background text-foreground">
                                    {availableLabels.map((lbl) => {
                                        const isAttached =
                                            selectedThread.labels?.some(
                                                (l) => l.id === lbl.id,
                                            );

                                        return (
                                            <DropdownMenuItem
                                                key={lbl.id}
                                                onClick={() =>
                                                    handleToggleLabel(lbl.id)
                                                }
                                                className="flex cursor-pointer items-center justify-between text-xs hover:bg-card"
                                            >
                                                <span>{lbl.name}</span>
                                                {isAttached && (
                                                    <Check className="h-3.5 w-3.5 text-primary" />
                                                )}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                    {availableLabels.length === 0 && (
                                        <div className="p-2 text-[10px] text-muted-foreground">
                                            No labels available.
                                        </div>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Thread Tier */}
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">
                            Thread tier
                        </span>
                        <Select
                            value={selectedThread.tier_id || 'no_tier'}
                            onValueChange={(val) =>
                                handleUpdateMeta(
                                    'tier_id',
                                    val === 'no_tier' ? null : val,
                                )
                            }
                        >
                            <SelectTrigger className="h-7 w-36 border-border bg-card text-xs font-medium text-foreground">
                                <SelectValue placeholder="no tier" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem
                                    value="no_tier"
                                    className="text-muted-foreground"
                                >
                                    no tier
                                </SelectItem>
                                {availableTiers.map((tr) => (
                                    <SelectItem key={tr.id} value={tr.id}>
                                        {tr.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Links & Tasks Section */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                        <span>
                            Links (
                            {(selectedThread.related_threads?.length || 0) +
                                (selectedThread.tasks?.length || 0)}
                            )
                        </span>
                    </div>

                    {/* Thread Links Section */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <Link2 className="h-3.5 w-3.5 text-primary" />
                                <span>Thread links</span>
                                <span className="rounded border border-border bg-card px-1 font-mono text-[10px] text-muted-foreground">
                                    I
                                </span>
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Plus />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 border-border bg-background p-1 text-foreground">
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setShowLinkThreadModal(true)
                                        }
                                        className="flex cursor-pointer items-center gap-2 p-2 text-xs font-semibold hover:bg-card"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                        <span>Link thread</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-1">
                            {selectedThread.related_threads?.map(
                                (relThread) => (
                                    <div
                                        key={relThread.id}
                                        onClick={() =>
                                            handleSelectThread(relThread.id)
                                        }
                                        className="group flex cursor-pointer items-center justify-between rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                            <span className="font-semibold text-primary">
                                                {relThread.sequence_number
                                                    ? `T-${relThread.sequence_number}`
                                                    : ''}
                                            </span>
                                            <span className="truncate text-foreground/80">
                                                {relThread.title}
                                            </span>
                                        </div>
                                        <X
                                            className="h-3 w-3 cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                            onClick={(e) =>
                                                handleUnlinkTargetThread(
                                                    relThread.id,
                                                    e,
                                                )
                                            }
                                        />
                                    </div>
                                ),
                            )}

                            {(!selectedThread.related_threads ||
                                selectedThread.related_threads.length ===
                                    0) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowLinkThreadModal(true)}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-border bg-card/50 px-2 py-1.5 text-[11px] text-muted-foreground transition-all hover:bg-card"
                                >
                                    <Plus data-icon="inline-start" />
                                    <span>Link a thread</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="space-y-1.5 border-t border-border/40 pt-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <CheckSquare className="h-3.5 w-3.5 text-success" />
                                <span>Tasks</span>
                                <span className="rounded border border-border bg-card px-1 font-mono text-[10px] text-muted-foreground">
                                    T
                                </span>
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowTaskSearchModal(true)}
                                className="cursor-pointer rounded border border-border bg-card p-1 text-muted-foreground transition-all hover:text-foreground"
                            >
                                <Plus />
                            </Button>
                        </div>

                        <div className="space-y-1">
                            {selectedThread.tasks?.map((tsk) => (
                                <div
                                    key={tsk.id}
                                    className="flex items-center justify-between rounded border border-border bg-card px-2 py-1.5 font-mono text-[11px] text-foreground"
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        <CheckSquare className="h-3 w-3 flex-shrink-0 text-success" />
                                        <span className="truncate">
                                            {tsk.title}
                                        </span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="capitalize"
                                    >
                                        {tsk.status}
                                    </Badge>
                                </div>
                            ))}

                            {(!selectedThread.tasks ||
                                selectedThread.tasks.length === 0) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTaskSearchModal(true)}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-border bg-card/50 px-2 py-1.5 text-[11px] text-muted-foreground transition-all hover:bg-card"
                                >
                                    <Plus data-icon="inline-start" />
                                    <span>Link a task</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Organization / Company Card */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-success" />
                            <span className="font-bold text-foreground">
                                {company?.name || 'No company'}
                            </span>
                        </div>

                        <DropdownMenu
                            open={companyDropdownOpen}
                            onOpenChange={setCompanyDropdownOpen}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        {company?.name ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Pencil />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex cursor-pointer items-center gap-1 rounded border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success transition-colors hover:text-success/80"
                                            >
                                                <Plus data-icon="inline-start" />
                                                <span>Add company</span>
                                            </Button>
                                        )}
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                {company?.name && (
                                    <TooltipContent>
                                        Edit Company
                                    </TooltipContent>
                                )}
                            </Tooltip>
                            <DropdownMenuContent
                                align="end"
                                className="w-64 space-y-0 overflow-hidden rounded-xl border-border bg-background p-0 text-foreground shadow-2xl"
                            >
                                {/* Search Input Header */}
                                <div className="flex items-center gap-2 border-b border-border bg-card/80 p-2.5">
                                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={companySearchQuery}
                                        onChange={(e) =>
                                            setCompanySearchQuery(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Search for company"
                                        className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                        autoFocus
                                    />
                                </div>

                                <div className="max-h-56 space-y-1 overflow-y-auto p-1.5">
                                    {/* Create New Company Option */}
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setCompanyDropdownOpen(false);

                                            if (setShowCreateCompanyModal) {
                                                setShowCreateCompanyModal(true);
                                            }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                    >
                                        <Plus data-icon="inline-start" />
                                        <span>Create new company</span>
                                    </Button>

                                    {/* Companies List */}
                                    {filteredCompanies.map((comp) => (
                                        <Button
                                            key={comp.id}
                                            type="button"
                                            variant={
                                                company?.id === comp.id
                                                    ? 'secondary'
                                                    : 'ghost'
                                            }
                                            size="sm"
                                            onClick={() => {
                                                setCompanyDropdownOpen(false);

                                                if (executeAttachCompany) {
                                                    executeAttachCompany(
                                                        comp.id,
                                                    );
                                                }
                                            }}
                                            className="w-full justify-start"
                                        >
                                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-border bg-card text-muted-foreground">
                                                <Building2 className="h-3 w-3 text-success" />
                                            </div>
                                            <span className="truncate font-medium">
                                                {comp.name}
                                            </span>
                                        </Button>
                                    ))}

                                    {filteredCompanies.length === 0 && (
                                        <div className="p-3 text-center text-[11px] text-muted-foreground">
                                            No companies found
                                        </div>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {domainMismatch?.mismatches && company?.name && (
                        <Alert>
                            <AlertTitle>Domain mismatch</AlertTitle>
                            <AlertDescription>
                                Customer domain ({domainMismatch.tenantDomain})
                                does not match company domain (
                                {domainMismatch.companyDomain}).
                            </AlertDescription>
                        </Alert>
                    )}

                    {company?.name && (company.arr || company.tier) && (
                        <div className="space-y-1.5 text-[11px] text-muted-foreground">
                            {company.arr && (
                                <div className="flex items-center justify-between">
                                    <span>ARR</span>
                                    <span className="font-mono font-bold text-foreground">
                                        {company.arr}
                                    </span>
                                </div>
                            )}
                            {company.tier && (
                                <div className="flex items-center justify-between">
                                    <span>Tier</span>
                                    <span className="font-medium text-primary">
                                        {company.tier.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Customer Contact Details Card */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                                <AvatarFallback>
                                    {selectedThread.tenant?.name?.[0] || 'C'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[150px] truncate text-xs font-bold text-foreground">
                                {selectedThread.tenant?.name ||
                                    'Anonymous Customer'}
                            </span>
                        </div>

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <MoreHorizontal />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Customer Actions
                                </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent
                                align="end"
                                className="w-48 border-border bg-background p-1 text-foreground"
                            >
                                {setShowRenameCustomerModal && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setShowRenameCustomerModal(true)
                                        }
                                        className="flex cursor-pointer items-center gap-2 p-2 text-xs hover:bg-card"
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Rename customer</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (selectedThread.tenant?.id) {
                                            navigator.clipboard.writeText(
                                                String(
                                                    selectedThread.tenant.id,
                                                ),
                                            );
                                            toast.success(
                                                'Copied customer ID!',
                                            );
                                        }
                                    }}
                                    className="flex cursor-pointer items-center gap-2 p-2 text-xs hover:bg-card"
                                >
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copy customer ID</span>
                                </DropdownMenuItem>
                                {setShowChangeCustomerModal && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setShowChangeCustomerModal(true)
                                        }
                                        className="flex cursor-pointer items-center gap-2 p-2 text-xs hover:bg-card"
                                    >
                                        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Change customer</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={async () => {
                                        if (
                                            await confirm({
                                                title: 'Delete this customer?',
                                                description:
                                                    'This cannot be undone.',
                                                confirmText: 'Delete',
                                                variant: 'destructive',
                                            })
                                        ) {
                                            toast.success('Customer deleted.');
                                        }
                                    }}
                                    className="flex cursor-pointer items-center gap-2 p-2 text-xs text-destructive hover:bg-card focus:text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete customer</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        toast.success(
                                            'Customer marked as spam.',
                                        );
                                    }}
                                    className="flex cursor-pointer items-center gap-2 p-2 text-xs text-destructive hover:bg-card focus:text-destructive"
                                >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Mark customer as spam</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {selectedThread.tenant?.email || 'No email provided'}
                    </div>

                    {/* Customer Recent Threads */}
                    {customerThreads.length > 0 && (
                        <div className="space-y-1.5 border-t border-border/40 pt-2">
                            <span className="block text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                                Recent threads
                            </span>
                            <div className="space-y-1">
                                {customerThreads.slice(0, 3).map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleSelectThread(t.id)}
                                        className={`flex cursor-pointer items-center justify-between rounded border border-border px-2 py-1 text-xs transition-colors ${
                                            t.id === selectedThread.id
                                                ? 'bg-card font-medium text-foreground'
                                                : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            <CircleDot className="h-3 w-3 flex-shrink-0 text-primary" />
                                            <span className="truncate">
                                                T-{t.sequence_number || t.id}{' '}
                                                {t.title}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
