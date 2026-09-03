import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Star,
    MoreHorizontal,
    Maximize2,
    Globe,
    DollarSign,
    User,
    Award,
    Slack,
    TrendingUp,
    MessageSquare,
    Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import TaskRow from '@/components/task-row';
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
import WorkspaceDisplay from '@/components/workspace-display';
import WorkspaceFilter from '@/components/workspace-filter';
import { useConfirm } from '@/hooks/use-confirm';

interface TierOption {
    id: string;
    name: string;
    color: string | null;
}

interface MemberOption {
    id: number;
    name: string;
    email: string;
}

interface Tenant {
    id: string;
    name: string;
    email: string;
}

interface Thread {
    id: string;
    title: string;
    status: string;
    priority: string;
    updated_at: string;
    tenant?: Tenant | null;
}

interface Task {
    id: string;
    title: string;
    status: string;
    due_at: string | null;
    assignee?: MemberOption | null;
}

interface Company {
    id: string;
    name: string;
    domain: string | null;
    logo_url: string | null;
    slug: string;
    contract_value: number;
    tier_id: string | null;
    owner_id: number | null;
    tenants: Tenant[];
    created_at: string;
    tier?: TierOption | null;
    owner?: MemberOption | null;
}

interface CompanyDetailsProps {
    company: Company;
    threads: Thread[];
    tasks: Task[];
    teamMembers: MemberOption[];
    tiers: TierOption[];
}

type CompanyUpdatePayload = Partial<
    Pick<
        Company,
        | 'name'
        | 'domain'
        | 'logo_url'
        | 'contract_value'
        | 'tier_id'
        | 'owner_id'
    >
>;

export default function CompanyDetails({
    company,
    threads,
    tasks,
    teamMembers,
    tiers,
}: CompanyDetailsProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam;
    const confirm = useConfirm();

    // Read active tab from URL query params if present, default to 'threads'
    const queryParams =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : null;
    const urlTab = queryParams
        ? (queryParams.get('tab') as
              'threads' | 'tasks' | 'people' | 'issues' | null)
        : null;
    const [activeTab, setActiveTab] = useState<
        'threads' | 'tasks' | 'people' | 'issues'
    >(
        urlTab && ['threads', 'tasks', 'people', 'issues'].includes(urlTab)
            ? urlTab
            : 'threads',
    );
    const [isStarred, setIsStarred] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );

    // Handle tab change and update URL query params
    const handleTabChange = (
        newTab: 'threads' | 'tasks' | 'people' | 'issues',
    ) => {
        setActiveTab(newTab);
        router.get(
            window.location.pathname,
            { tab: newTab },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Local inputs for auto-save
    const [localDomain, setLocalDomain] = useState(company.domain || '');
    const [localContractValue, setLocalContractValue] = useState(
        company.contract_value?.toString() || '',
    );
    const [slackChannels, setSlackChannels] = useState<string[]>([]);
    const [slackInputOpen, setSlackInputOpen] = useState(false);
    const [newSlackChannel, setNewSlackChannel] = useState('');

    // Tasks row event handlers
    const handleToggleTaskStatus = (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        const newStatus = task.status === 'open' ? 'done' : 'open';
        router.patch(
            currentTeam ? `/tasks/${task.id}` : `/tasks/${task.id}`,
            { status: newStatus },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleCopyTaskLink = (task: any) => {
        if (!currentTeam) {
            return;
        }

        const taskUrl = `${window.location.origin}//tasks?task=${task.id}`;
        navigator.clipboard.writeText(taskUrl);
        toast.success('Task link copied to clipboard!');
    };

    const handleDeleteTask = async (task: any) => {
        if (
            await confirm({
                title: 'Delete this task?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(
                currentTeam ? `/tasks/${task.id}` : `/tasks/${task.id}`,
                { preserveState: true, preserveScroll: true },
            );
        }
    };

    const handleUpdateCompany = (attributes: CompanyUpdatePayload) => {
        setSaveStatus('saving');
        router.patch(
            currentTeam
                ? `/companies/${company.id}`
                : `/companies/${company.id}`,
            attributes,
            {
                preserveState: true,
                onSuccess: () => {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                },
                onError: () => {
                    setSaveStatus('idle');
                    toast.error('Failed to update company.');
                },
            },
        );
    };

    const handleDeleteCompany = async () => {
        if (
            await confirm({
                title: 'Delete this company?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(
                currentTeam
                    ? `/companies/${company.id}`
                    : `/companies/${company.id}`,
                {
                    onSuccess: () => {
                        toast.success('Company deleted successfully.');
                    },
                },
            );
        }
    };

    const handleAddSlackChannel = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newSlackChannel.trim()) {
            return;
        }

        const updated = [...slackChannels, newSlackChannel.trim()];
        setSlackChannels(updated);
        setNewSlackChannel('');
        setSlackInputOpen(false);
        toast.success('Slack channel linked successfully.');
    };

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background xl:flex-row">
            <Head title={`${company.name} - Company Profile`} />

            {/* Left Content Column */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-b border-border p-4 md:p-6 xl:border-r xl:border-b-0">
                <div className="flex flex-col gap-6">
                    {/* Back header navigation */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link
                            href={currentTeam ? `/companies` : '/companies'}
                            className="flex items-center gap-1 transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Companies</span>
                        </Link>
                    </div>

                    {/* Company Profile Title Block */}
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                                {company.name}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Star Icon */}
                            <button
                                onClick={() => setIsStarred(!isStarred)}
                                className={`rounded border border-border p-1.5 transition-colors hover:bg-card ${
                                    isStarred
                                        ? 'border-warning/30 bg-warning/5 text-warning'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Star
                                    className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`}
                                />
                            </button>

                            {/* Options Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="rounded border border-border p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-32 border-border bg-background text-foreground">
                                    <DropdownMenuItem
                                        onClick={handleDeleteCompany}
                                        className="flex cursor-pointer items-center gap-2 text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete profile</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <button className="rounded border border-border p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground">
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation & Filters */}
                    <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto">
                            {(
                                [
                                    'threads',
                                    'tasks',
                                    'people',
                                    'issues',
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`rounded-t-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                                        activeTab === tab
                                            ? 'border-b-2 border-primary text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'threads' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {/* Reusable Advanced Flyout Filters Component */}
                                <WorkspaceFilter
                                    teamMembers={teamMembers}
                                    tiers={tiers}
                                />

                                {/* Reusable Advanced Flyout Display Settings Component */}
                                <WorkspaceDisplay />
                            </div>
                        )}
                    </div>

                    {/* Tab Content Display Workspace */}
                    <div className="py-6">
                        {activeTab === 'threads' && (
                            <div className="space-y-4">
                                {threads.length > 0 ? (
                                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                                        {threads.map((thread) => (
                                            <div
                                                key={thread.id}
                                                className="flex cursor-pointer items-center justify-between p-4 transition-all hover:bg-card/40"
                                                onClick={() =>
                                                    router.get(
                                                        currentTeam
                                                            ? `/threads`
                                                            : '/threads',
                                                    )
                                                }
                                            >
                                                <div className="flex items-center gap-3">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                    <div className="flex flex-col text-left">
                                                        <h4 className="text-xs font-bold text-foreground">
                                                            {thread.title}
                                                        </h4>
                                                        {thread.tenant && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {
                                                                    thread
                                                                        .tenant
                                                                        .name
                                                                }{' '}
                                                                (
                                                                {
                                                                    thread
                                                                        .tenant
                                                                        .email
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                                                    {thread.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                        <h3 className="text-xs font-bold text-foreground">
                                            No threads in todo belonging to{' '}
                                            {company.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            Any threads in todo will show here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="space-y-4">
                                {tasks.length > 0 ? (
                                    <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background">
                                        {tasks.map((task) => (
                                            <TaskRow
                                                key={task.id}
                                                task={task as any}
                                                onClick={() =>
                                                    router.get(
                                                        currentTeam
                                                            ? `/tasks?task=${task.id}`
                                                            : `/tasks?task=${task.id}`,
                                                    )
                                                }
                                                onToggleStatus={
                                                    handleToggleTaskStatus
                                                }
                                                onCopyLink={handleCopyTaskLink}
                                                onDelete={handleDeleteTask}
                                                showCompanyPill={false}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                        <h3 className="text-xs font-bold text-foreground">
                                            No tasks belonging to {company.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            Any tasks assigned to this company
                                            will show here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'people' && (
                            <div className="space-y-4">
                                <h3 className="px-1 text-xs font-bold text-foreground">
                                    Contacts ({company.tenants.length})
                                </h3>
                                {company.tenants.length > 0 ? (
                                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                                        {company.tenants.map((contact) => (
                                            <div
                                                key={contact.id}
                                                className="flex items-center gap-3 p-4"
                                            >
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-xs font-bold text-foreground">
                                                        {contact.name}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        {contact.email}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-border bg-background p-16 text-center text-xs text-muted-foreground">
                                        No contacts grouped under this
                                        organization.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'issues' && (
                            <div className="rounded-xl border border-border bg-background p-16 text-center text-xs text-muted-foreground">
                                No issues tracked for {company.name} yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right details sidebar column */}
            <aside className="flex w-full shrink-0 flex-col justify-between gap-6 overflow-y-auto bg-background p-4 md:p-6 xl:w-80">
                <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-sm font-bold text-foreground">
                            Details
                        </span>
                        {saveStatus === 'saving' && (
                            <span className="animate-pulse text-[10px] text-muted-foreground">
                                Saving...
                            </span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="text-[10px] font-semibold text-primary">
                                Saved
                            </span>
                        )}
                    </div>

                    {/* Metadata Rows */}
                    <div className="space-y-4 text-xs">
                        {/* Domain */}
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Globe className="h-3.5 w-3.5" />
                                <span>Domain</span>
                            </span>
                            <input
                                type="text"
                                value={localDomain}
                                onChange={(e) => setLocalDomain(e.target.value)}
                                onBlur={() => {
                                    if (
                                        localDomain !== (company.domain || '')
                                    ) {
                                        handleUpdateCompany({
                                            domain: localDomain || null,
                                        });
                                    }
                                }}
                                className="w-36 bg-transparent py-0.5 text-right text-foreground focus:border-b focus:border-border focus:outline-none"
                                placeholder="acme.com"
                            />
                        </div>

                        {/* Contract Value / ARR */}
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Contract value</span>
                            </span>
                            <div className="flex w-36 items-center justify-end">
                                <span className="mr-0.5 font-mono text-muted-foreground">
                                    $
                                </span>
                                <input
                                    type="text"
                                    value={localContractValue}
                                    onChange={(e) =>
                                        setLocalContractValue(e.target.value)
                                    }
                                    onBlur={() => {
                                        const parsed =
                                            parseInt(localContractValue) || 0;

                                        if (parsed !== company.contract_value) {
                                            handleUpdateCompany({
                                                contract_value: parsed,
                                            });
                                        }
                                    }}
                                    className="w-28 bg-transparent py-0.5 text-right font-mono text-foreground focus:border-b focus:border-border focus:outline-none"
                                    placeholder="Add contract value"
                                />
                            </div>
                        </div>

                        {/* Account Owner */}
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                <span>Account owner</span>
                            </span>
                            <Select
                                value={company.owner_id?.toString() ?? 'none'}
                                onValueChange={(val) =>
                                    handleUpdateCompany({
                                        owner_id:
                                            val === 'none' ? null : Number(val),
                                    })
                                }
                            >
                                <SelectTrigger className="h-7 w-36 border-border bg-card/50 text-xs text-foreground">
                                    <SelectValue placeholder="Add account owner" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-background text-foreground">
                                    <SelectItem value="none">
                                        Add account owner
                                    </SelectItem>
                                    {teamMembers.map((member) => (
                                        <SelectItem
                                            key={member.id}
                                            value={member.id.toString()}
                                        >
                                            {member.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Company Tier */}
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Award className="h-3.5 w-3.5" />
                                <span>Company tier</span>
                            </span>
                            <Select
                                value={company.tier_id ?? 'none'}
                                onValueChange={(val) =>
                                    handleUpdateCompany({
                                        tier_id: val === 'none' ? null : val,
                                    })
                                }
                            >
                                <SelectTrigger className="h-7 w-36 border-border bg-card/50 text-xs text-foreground">
                                    <SelectValue placeholder="Tier" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-background text-foreground">
                                    <SelectItem value="none">Tier</SelectItem>
                                    {tiers.map((tier) => (
                                        <SelectItem
                                            key={tier.id}
                                            value={tier.id}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            tier.color ||
                                                            '#a78bfa',
                                                    }}
                                                />
                                                <span>{tier.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Slack channels */}
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Slack className="h-3.5 w-3.5" />
                                <span>Slack channels</span>
                            </span>

                            <div className="text-right">
                                {slackInputOpen ? (
                                    <form
                                        onSubmit={handleAddSlackChannel}
                                        className="flex items-center gap-1"
                                    >
                                        <input
                                            type="text"
                                            value={newSlackChannel}
                                            onChange={(e) =>
                                                setNewSlackChannel(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="#support"
                                            className="w-24 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none"
                                            autoFocus
                                            onBlur={() =>
                                                setTimeout(
                                                    () =>
                                                        setSlackInputOpen(
                                                            false,
                                                        ),
                                                    200,
                                                )
                                            }
                                        />
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setSlackInputOpen(true)}
                                        className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {slackChannels.length > 0
                                            ? slackChannels.join(', ')
                                            : 'Add Slack channel +'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="my-4 border-t border-border/60" />

                    {/* Support Volume Chart placeholder */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Support volume (30 days)</span>
                            </span>
                            <button className="text-[10px] text-muted-foreground transition-colors hover:text-foreground">
                                View more
                            </button>
                        </div>

                        {/* Chart Area */}
                        <div className="flex h-32 flex-col justify-center space-y-2 rounded-xl border border-border/60 bg-card/30 p-6 text-center">
                            <span className="text-[10px] text-muted-foreground">
                                No data
                            </span>
                        </div>

                        {/* Chart Dates Row */}
                        <div className="flex justify-between px-2 font-mono text-[9px] text-muted-foreground">
                            <span>Jul 22</span>
                            <span>Aug 1</span>
                            <span>Today</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-border/60 pt-4">
                    <span className="text-[10px] text-muted-foreground">
                        Saved automatically
                    </span>
                </div>
            </aside>
        </div>
    );
}
