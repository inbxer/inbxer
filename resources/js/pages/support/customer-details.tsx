import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Star, Maximize2, SquarePen } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { CustomerProfileCard } from '@/components/customers/customer-profile-card';
import WorkspaceDisplay from '@/components/workspace-display';
import WorkspaceFilter from '@/components/workspace-filter';
import { useConfirm } from '@/hooks/use-confirm';

interface CompanyOption {
    id: string;
    name: string;
}

interface GroupOption {
    id: string;
    name: string;
}

interface TenantOption {
    id: string;
    name: string;
    company?: CompanyOption | null;
}

interface Customer {
    id: string;
    tenant_id: string;
    company_id?: string | null;
    customer_group_id?: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    external_id: string | null;
    created_at?: string;
    tenant?: {
        id: string;
        name: string;
        company?: CompanyOption | null;
        tier?: { id: string; name: string } | null;
    } | null;
    company?: CompanyOption | null;
    group?: GroupOption | null;
}

interface Thread {
    id: string;
    title: string;
    status: string;
    priority: string;
    updated_at: string;
    tenant?: { name: string; email: string } | null;
    labels?: { id: string; name: string; color?: string }[];
}

interface CustomerDetailsProps {
    customer: Customer;
    threads: Thread[];
    tenants: TenantOption[];
    companies?: CompanyOption[];
    groups?: GroupOption[];
}

export default function CustomerDetailsPage({
    customer,
    threads = [],
    tenants = [],
    companies = [],
    groups = [],
}: CustomerDetailsProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as any;
    const confirm = useConfirm();

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );

    const handleUpdateCustomer = (attributes: Partial<Customer>) => {
        setSaveStatus('saving');
        router.patch(
            currentTeam
                ? `/customers/${customer.id}`
                : `/customers/${customer.id}`,
            attributes as any,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                },
                onError: () => {
                    setSaveStatus('idle');
                    toast.error('Failed to update customer details.');
                },
            },
        );
    };

    const handleDeleteCustomer = async () => {
        if (
            await confirm({
                title: `Delete customer ${customer.name}?`,
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(
                currentTeam
                    ? `/customers/${customer.id}`
                    : `/customers/${customer.id}`,
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
            return `${diffMins}min ago`;
        }

        if (diffHrs < 24) {
            return `${diffHrs}h ago`;
        }

        return `${diffDays}d ago`;
    };

    const handleUpdateTenant = (tenantId: string) => {
        if (tenantId !== 'none' && tenantId !== customer.tenant_id) {
            handleUpdateCustomer({ tenant_id: tenantId });
        }
    };

    const handleCreateThread = () => {
        router.post('/threads', { tenant_id: customer.tenant_id });
    };

    return (
        <>
            <Head title={`${customer.name} — Customer Profile`} />

            <div className="-mx-4 -my-3 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background text-foreground">
                {/* Main Content Column */}
                <div className="flex min-w-0 flex-1 flex-col space-y-6 overflow-y-auto border-r border-border/60 p-4">
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
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-foreground uppercase">
                            {customer.name.charAt(0)}
                        </div>
                        <h2 className="text-sm font-bold text-foreground">
                            {customer.name}
                        </h2>
                    </div>

                    {/* Tabs / Action Toolbar */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-3">
                            <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-foreground">
                                Threads
                            </span>
                            <button
                                onClick={handleCreateThread}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-all hover:bg-card hover:text-foreground"
                            >
                                <span>Create thread</span>
                                <SquarePen className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <WorkspaceFilter />
                            <WorkspaceDisplay />
                        </div>
                    </div>

                    {/* Threads List */}
                    <div className="flex-1 space-y-3">
                        {threads.length > 0 ? (
                            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background">
                                {threads.map((thread) => (
                                    <div
                                        key={thread.id}
                                        onClick={() =>
                                            router.get(
                                                currentTeam
                                                    ? `/threads?thread=${thread.id}`
                                                    : `/threads?thread=${thread.id}`,
                                            )
                                        }
                                        className="group flex cursor-pointer items-center justify-between p-3.5 transition-all hover:bg-card/30"
                                    >
                                        <div className="flex flex-col space-y-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                                                    {thread.title}
                                                </span>
                                                {thread.tenant?.name && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        {thread.tenant.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {thread.labels?.map((label) => (
                                                    <span
                                                        key={label.id}
                                                        className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                                    >
                                                        {label.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                                                = {thread.priority || 'Normal'}
                                            </span>
                                            <span className="font-mono text-[10px]">
                                                {formatRelativeTime(
                                                    thread.updated_at,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-xl border border-border bg-background p-16 text-center">
                                <h3 className="text-xs font-bold text-foreground">
                                    No threads for {customer.name}
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Support threads associated with this
                                    customer will show here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <CustomerProfileCard
                    customer={customer}
                    saveStatus={saveStatus}
                    groups={groups}
                    tenants={tenants}
                    companies={companies}
                    onUpdateCustomer={handleUpdateCustomer}
                    onUpdateTenant={handleUpdateTenant}
                    onDeleteCustomer={handleDeleteCustomer}
                />
            </div>
        </>
    );
}
