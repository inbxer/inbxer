import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Star,
    Maximize2,
    Globe,
    Trash2,
    Sparkles,
    Search,
    Plus,
    Copy,
    Check,
    Pencil,
    Users2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import TaskRow from '@/components/task-row';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import WorkspaceDisplay from '@/components/workspace-display';
import WorkspaceFilter from '@/components/workspace-filter';
import { useConfirm } from '@/hooks/use-confirm';

interface TierOption {
    id: string;
    name: string;
}

interface GroupOption {
    id: string;
    name: string;
    color: string | null;
}

interface CompanyTenant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
}

interface Company {
    id: string;
    name: string;
    slug: string;
    tenants: CompanyTenant[];
}

interface Tenant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    external_id: string | null;
    company_id: string | null;
    tier_id: string | null;
    created_at: string;
    company?: Company | null;
    tier?: TierOption | null;
    groups?: GroupOption[];
}

interface Thread {
    id: string;
    title: string;
    status: string;
    priority: string;
    updated_at: string;
    tenant?: { name: string; email: string } | null;
}

interface Task {
    id: string;
    title: string;
    status: 'open' | 'done';
    due_at: string | null;
    assignee?: { id: number; name: string; email: string } | null;
    company?: { id: string; name: string; slug: string } | null;
}

interface CustomerItem {
    id: string;
    tenant_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    external_id: string | null;
    created_at?: string;
}

interface TenantDetailsProps {
    tenant: Tenant;
    threads: Thread[];
    tasks: Task[];
    tiers: TierOption[];
    customers?: CustomerItem[];
    groups?: GroupOption[];
}

type TenantUpdatePayload = Partial<
    Pick<
        Tenant,
        'name' | 'email' | 'phone' | 'external_id' | 'company_id' | 'tier_id'
    >
>;

export default function TenantDetailsPage({
    tenant,
    threads = [],
    tasks = [],
    tiers = [],
    customers = [],
    groups = [],
}: TenantDetailsProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as any;
    const confirm = useConfirm();

    // Synchronize tab state with URL query parameter
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');

            if (
                tab &&
                ['threads', 'customers', 'tasks', 'issues'].includes(tab)
            ) {
                return tab;
            }
        }

        return 'threads';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );
    const [customerSearch, setCustomerSearch] = useState('');
    const [editingRefId, setEditingRefId] = useState(false);
    const [refIdValue, setRefIdValue] = useState(tenant.external_id ?? '');
    const [refIdCopied, setRefIdCopied] = useState(false);
    const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

    const {
        data: customerData,
        setData: setCustomerData,
        post: postCustomer,
        processing: customerProcessing,
        errors: customerErrors,
        reset: resetCustomer,
    } = useForm({
        tenant_id: tenant.id,
        name: '',
        external_id: '',
    });

    const handleCreateCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        postCustomer(currentTeam ? `/customers` : '/customers', {
            onSuccess: () => {
                setCreateCustomerOpen(false);
                resetCustomer();
                toast.success('Customer created successfully.');
            },
        });
    };

    const handleDeleteCustomer = async (
        customerId: string,
        customerName: string,
    ) => {
        if (
            await confirm({
                title: `Delete customer ${customerName}?`,
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(
                currentTeam
                    ? `/customers/${customerId}`
                    : `/customers/${customerId}`,
                {
                    onSuccess: () =>
                        toast.success('Customer deleted successfully.'),
                },
            );
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);

            if (params.get('tab') !== activeTab) {
                params.set('tab', activeTab);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState(
                    { ...window.history.state, as: newUrl, url: newUrl },
                    '',
                    newUrl,
                );
            }
        }
    }, [activeTab]);

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

    const handleUpdateTenant = (attributes: TenantUpdatePayload) => {
        setSaveStatus('saving');
        router.patch(
            currentTeam ? `/tenants/${tenant.id}` : `/tenants/${tenant.id}`,
            attributes,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                },
                onError: () => {
                    setSaveStatus('idle');
                    toast.error('Failed to update tenant details.');
                },
            },
        );
    };

    const handleToggleGroup = (groupId: string, checked: boolean) => {
        const currentIds = (tenant.groups ?? []).map((g) => g.id);
        const nextIds = checked
            ? [...currentIds, groupId]
            : currentIds.filter((id) => id !== groupId);

        router.post(
            currentTeam
                ? `/tenants/${tenant.id}/groups`
                : `/tenants/${tenant.id}/groups`,
            { group_ids: nextIds },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleDeleteTenant = async () => {
        if (
            await confirm({
                title: `Delete contact ${tenant.name}?`,
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(
                currentTeam ? `/tenants/${tenant.id}` : `/tenants/${tenant.id}`,
            );
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) {
            return 'Just now';
        }

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        }

        if (diffHrs < 24) {
            return `${diffHrs}h ago`;
        }

        return `${diffDays}d ago`;
    };

    return (
        <>
            <Head title={`${tenant.name} — Workspace`} />

            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground xl:flex-row">
                {/* Main Content Column */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto border-b border-border/60 p-4 md:p-6 xl:border-r xl:border-b-0">
                    {/* Header Nav */}
                    <div className="flex items-center justify-between">
                        <Link
                            href={currentTeam ? `/tenants` : '/tenants'}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Tenants</span>
                        </Link>

                        <div className="flex items-center gap-3">
                            <button className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
                                <Star className="h-3.5 w-3.5" />
                            </button>
                            <button className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
                                <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Title Banner */}
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-foreground uppercase">
                            {tenant.name.charAt(0)}
                        </div>
                        <div className="flex flex-col space-y-0.5 text-left">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                                <span>{tenant.name}</span>
                            </h2>
                            <span className="font-mono text-[10px] font-medium text-muted-foreground">
                                {formatRelativeTime(tenant.created_at)} by You
                            </span>
                        </div>
                    </div>

                    {/* Tabs navigation */}
                    <div className="flex flex-col gap-3 border-b border-border/60 pb-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex max-w-full items-center gap-1 overflow-x-auto">
                            {['threads', 'customers', 'tasks', 'issues'].map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                                            activeTab === tab
                                                ? 'border border-border bg-card text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ),
                            )}
                        </div>

                        {/* Search and Filters toolbar (Only visible on Threads tab) */}
                        {activeTab === 'threads' && (
                            <div className="flex items-center gap-2">
                                <WorkspaceFilter />
                                <WorkspaceDisplay />
                            </div>
                        )}

                        {/* Add customer button (Only visible on Customers tab) */}
                        {activeTab === 'customers' && (
                            <button
                                onClick={() => setCreateCustomerOpen(true)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                            >
                                <span>Add customer</span>
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Active tab contents */}
                    <div className="flex-1">
                        {activeTab === 'threads' && (
                            <div className="space-y-4">
                                {threads.length > 0 ? (
                                    <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background">
                                        {threads.map((thread) => (
                                            <div
                                                key={thread.id}
                                                className="flex cursor-pointer items-center justify-between p-4 transition-all hover:bg-card/30"
                                                onClick={() =>
                                                    router.get(
                                                        currentTeam
                                                            ? `/threads?thread=${thread.id}`
                                                            : `/threads?thread=${thread.id}`,
                                                    )
                                                }
                                            >
                                                <div className="flex flex-col space-y-1 text-left">
                                                    <h4 className="text-xs font-bold text-foreground transition-colors hover:text-primary">
                                                        {thread.title}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Updated{' '}
                                                            {formatRelativeTime(
                                                                thread.updated_at,
                                                            )}
                                                        </span>
                                                        {thread.tenant && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {
                                                                    thread
                                                                        .tenant
                                                                        .name
                                                                }
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
                                            {tenant.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            Any threads in todo will show here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'customers' && (
                            <div className="space-y-4">
                                {/* Search customers */}
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search customers"
                                        value={customerSearch}
                                        onChange={(e) =>
                                            setCustomerSearch(e.target.value)
                                        }
                                        className="w-full border-b border-border/60 bg-transparent py-2 pr-3 pl-9 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:border-border focus:outline-none"
                                    />
                                </div>

                                {(() => {
                                    const filtered = customers.filter(
                                        (c) =>
                                            c.name
                                                .toLowerCase()
                                                .includes(
                                                    customerSearch.toLowerCase(),
                                                ) ||
                                            (c.email &&
                                                c.email
                                                    .toLowerCase()
                                                    .includes(
                                                        customerSearch.toLowerCase(),
                                                    )) ||
                                            (c.external_id &&
                                                c.external_id
                                                    .toLowerCase()
                                                    .includes(
                                                        customerSearch.toLowerCase(),
                                                    )),
                                    );

                                    return filtered.length > 0 ? (
                                        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background">
                                            {filtered.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onClick={() =>
                                                        router.get(
                                                            currentTeam
                                                                ? `/customers/${c.id}`
                                                                : `/customers/${c.id}`,
                                                        )
                                                    }
                                                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-card/30"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase">
                                                            {c.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-xs font-bold text-foreground">
                                                                {c.name}
                                                            </span>
                                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                                {c.email ||
                                                                    c.external_id ||
                                                                    'No external ID'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteCustomer(
                                                                        c.id,
                                                                        c.name,
                                                                    )
                                                                }
                                                                className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Delete customer
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                            <h3 className="text-xs font-bold text-foreground">
                                                No customers
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground">
                                                No customers have been added to
                                                this tenant yet.
                                            </p>
                                            <button
                                                onClick={() =>
                                                    setCreateCustomerOpen(true)
                                                }
                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                                            >
                                                <span>Add customer</span>
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })()}
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
                                                showCompanyPill={true}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                        <h3 className="text-xs font-bold text-foreground">
                                            No tasks belonging to {tenant.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            Any tasks assigned to this contact
                                            will show here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'issues' && (
                            <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                <h3 className="text-xs font-bold text-foreground">
                                    No issues belonging to {tenant.name}
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Any issues related to this contact will show
                                    here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Details Sidebar Panel */}
                <aside className="flex w-full shrink-0 flex-col justify-between gap-6 overflow-y-auto p-4 md:p-6 xl:w-80">
                    <div className="flex flex-col gap-6">
                        {/* Header details */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <span className="text-xs font-bold tracking-wider text-foreground uppercase">
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

                        {/* Fields List */}
                        <div className="space-y-4 text-xs">
                            {/* Reference ID — editable inline */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Globe className="h-3.5 w-3.5" />
                                    <span>Reference ID</span>
                                    {!editingRefId && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => {
                                                        if (refIdCopied) {
                                                            return;
                                                        }

                                                        const val =
                                                            tenant.external_id ||
                                                            tenant.id.slice(
                                                                0,
                                                                8,
                                                            );
                                                        navigator.clipboard.writeText(
                                                            val,
                                                        );
                                                        setRefIdCopied(true);
                                                        setTimeout(
                                                            () =>
                                                                setRefIdCopied(
                                                                    false,
                                                                ),
                                                            1500,
                                                        );
                                                    }}
                                                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                                                >
                                                    {refIdCopied ? (
                                                        <Check className="h-3 w-3 text-primary" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Copy
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </span>
                                {editingRefId ? (
                                    <input
                                        type="text"
                                        value={refIdValue}
                                        autoFocus
                                        onChange={(e) =>
                                            setRefIdValue(e.target.value)
                                        }
                                        onBlur={() => {
                                            setEditingRefId(false);

                                            if (
                                                refIdValue !==
                                                (tenant.external_id ?? '')
                                            ) {
                                                handleUpdateTenant({
                                                    external_id:
                                                        refIdValue || null,
                                                } as any);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                (
                                                    e.target as HTMLInputElement
                                                ).blur();
                                            }

                                            if (e.key === 'Escape') {
                                                setRefIdValue(
                                                    tenant.external_id ?? '',
                                                );
                                                setEditingRefId(false);
                                            }
                                        }}
                                        className="w-28 rounded border border-border bg-card/50 px-2 py-0.5 font-mono text-xs text-foreground transition-colors focus:border-border focus:outline-none"
                                    />
                                ) : (
                                    <button
                                        onClick={() => {
                                            setRefIdValue(
                                                tenant.external_id ?? '',
                                            );
                                            setEditingRefId(true);
                                        }}
                                        className="group flex items-center gap-1 font-mono font-semibold text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <span>
                                            {tenant.external_id ||
                                                tenant.id.slice(0, 8)}
                                        </span>
                                        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </button>
                                )}
                            </div>

                            {/* Tier dropdown */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Tier</span>
                                </span>
                                <Select
                                    value={tenant.tier_id ?? 'none'}
                                    onValueChange={(val) =>
                                        handleUpdateTenant({
                                            tier_id:
                                                val === 'none' ? null : val,
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-7.5 w-36 border-border bg-card/50 text-xs font-medium text-foreground">
                                        <SelectValue placeholder="Add tier" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-background text-foreground">
                                        <SelectItem value="none">
                                            Add tier
                                        </SelectItem>
                                        {tiers.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Groups multi-select */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Users2 className="h-3.5 w-3.5" />
                                    <span>Groups</span>
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex h-7.5 w-36 items-center justify-between rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground">
                                            <span className="truncate">
                                                {tenant.groups &&
                                                tenant.groups.length > 0
                                                    ? tenant.groups
                                                          .map((g) => g.name)
                                                          .join(', ')
                                                    : 'Add group'}
                                            </span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="w-48 border-border bg-background text-foreground"
                                    >
                                        {groups.length === 0 && (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                No groups yet
                                            </div>
                                        )}
                                        {groups.map((g) => (
                                            <DropdownMenuCheckboxItem
                                                key={g.id}
                                                checked={(
                                                    tenant.groups ?? []
                                                ).some((tg) => tg.id === g.id)}
                                                onCheckedChange={(checked) =>
                                                    handleToggleGroup(
                                                        g.id,
                                                        checked === true,
                                                    )
                                                }
                                                onSelect={(e) =>
                                                    e.preventDefault()
                                                }
                                            >
                                                <span
                                                    className="mr-1.5 size-2 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            g.color ??
                                                            '#60a5fa',
                                                    }}
                                                />
                                                {g.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="my-4 border-t border-border/60" />

                        {/* No tenant fields warning message */}
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No tenant fields to show
                        </div>
                    </div>

                    {/* Bottom Delete trigger */}
                    <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                        <button
                            onClick={handleDeleteTenant}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 py-2 text-xs font-semibold text-destructive transition-all hover:bg-destructive/20"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Contact</span>
                        </button>
                        <span className="text-center text-[10px] text-muted-foreground">
                            Saved automatically
                        </span>
                    </div>
                </aside>
            </div>

            {/* Add Customer Modal */}
            <Dialog
                open={createCustomerOpen}
                onOpenChange={setCreateCustomerOpen}
            >
                <DialogContent className="border border-border bg-background text-foreground">
                    <form onSubmit={handleCreateCustomer} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-sm font-bold text-foreground">
                                Add Customer Contact
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Create a new customer contact record.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="name"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Customer name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. John Doe"
                                    value={customerData.name}
                                    onChange={(e) =>
                                        setCustomerData('name', e.target.value)
                                    }
                                    className="border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                                    required
                                />
                                {customerErrors.name && (
                                    <p className="text-[11px] text-destructive">
                                        {customerErrors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="external_id"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    External ID
                                </Label>
                                <Input
                                    id="external_id"
                                    placeholder="e.g. CUST-10012"
                                    value={customerData.external_id}
                                    onChange={(e) =>
                                        setCustomerData(
                                            'external_id',
                                            e.target.value,
                                        )
                                    }
                                    className="border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                                />
                                {customerErrors.external_id && (
                                    <p className="text-[11px] text-destructive">
                                        {customerErrors.external_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateCustomerOpen(false)}
                                className="border-border bg-card text-xs text-foreground hover:bg-muted"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={customerProcessing}
                                className="bg-primary text-xs font-bold text-primary-foreground hover:opacity-90"
                            >
                                {customerProcessing
                                    ? 'Creating...'
                                    : 'Add customer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
