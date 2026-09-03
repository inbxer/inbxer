import {
    Layers,
    FileText,
    Building2,
    Mail,
    Phone,
    Pencil,
    Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface CustomerData {
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
        company?: { id: string; name: string } | null;
        tier?: { id: string; name: string } | null;
    } | null;
    company?: { id: string; name: string } | null;
    group?: { id: string; name: string } | null;
}

interface CustomerProfileCardProps {
    customer: CustomerData;
    saveStatus: 'idle' | 'saving' | 'saved';
    groups?: { id: string; name: string }[];
    tenants?: { id: string; name: string }[];
    companies?: { id: string; name: string }[];
    onUpdateCustomer: (attributes: Partial<CustomerData>) => void;
    onUpdateTenant: (tenantId: string) => void;
    onDeleteCustomer: () => void;
}

export function CustomerProfileCard({
    customer,
    saveStatus,
    groups = [],
    tenants = [],
    companies = [],
    onUpdateCustomer,
    onUpdateTenant,
    onDeleteCustomer,
}: CustomerProfileCardProps) {
    const [editingEmail, setEditingEmail] = useState(false);
    const [emailValue, setEmailValue] = useState(customer.email ?? '');
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState(customer.phone ?? '');
    const [editingExternalId, setEditingExternalId] = useState(false);
    const [externalIdValue, setExternalIdValue] = useState(
        customer.external_id ?? '',
    );

    return (
        <div className="flex w-80 flex-col justify-between space-y-6 overflow-y-auto border-l border-border/60 p-4">
            <div className="space-y-6">
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

                <div className="space-y-4 text-xs">
                    {/* Groups */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Groups</span>
                        </span>
                        <Select
                            value={customer.customer_group_id ?? 'none'}
                            onValueChange={(val) =>
                                onUpdateCustomer({
                                    customer_group_id:
                                        val === 'none' ? null : val,
                                })
                            }
                        >
                            <SelectTrigger className="h-7.5 w-36 border-border bg-card/50 px-2 text-xs font-medium text-foreground">
                                <SelectValue placeholder="Add group" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem value="none">Add group</SelectItem>
                                {groups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                        {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tenants */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Tenants</span>
                        </span>
                        <Select
                            value={customer.tenant_id ?? 'none'}
                            onValueChange={(val) => onUpdateTenant(val)}
                        >
                            <SelectTrigger className="h-7.5 w-36 border-border bg-card/50 px-2 text-xs font-medium text-foreground">
                                <SelectValue placeholder="Add tenant" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                {tenants.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Company */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>Company</span>
                        </span>
                        <Select
                            value={
                                customer.company_id ??
                                customer.tenant?.company?.id ??
                                'none'
                            }
                            onValueChange={(val) =>
                                onUpdateCustomer({
                                    company_id: val === 'none' ? null : val,
                                })
                            }
                        >
                            <SelectTrigger className="h-7.5 w-36 border-border bg-card/50 px-2 text-xs font-medium text-foreground">
                                <SelectValue placeholder="Add company" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem value="none">No company</SelectItem>
                                {companies.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="my-2 border-t border-border/60" />

                    {/* Email */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email</span>
                        </span>
                        {editingEmail ? (
                            <input
                                type="email"
                                value={emailValue}
                                autoFocus
                                onChange={(e) => setEmailValue(e.target.value)}
                                onBlur={() => {
                                    setEditingEmail(false);

                                    if (emailValue !== (customer.email ?? '')) {
                                        onUpdateCustomer({
                                            email: emailValue || null,
                                        });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                    }

                                    if (e.key === 'Escape') {
                                        setEmailValue(customer.email ?? '');
                                        setEditingEmail(false);
                                    }
                                }}
                                className="w-36 rounded border border-border bg-card/50 px-2 py-0.5 text-xs text-foreground focus:border-border focus:outline-none"
                            />
                        ) : (
                            <button
                                onClick={() => setEditingEmail(true)}
                                className="flex max-w-[140px] cursor-pointer items-center gap-1 truncate font-mono text-[11px] text-foreground hover:text-primary"
                            >
                                <span>{customer.email || 'None'}</span>
                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </button>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>Phone</span>
                        </span>
                        {editingPhone ? (
                            <input
                                type="text"
                                value={phoneValue}
                                autoFocus
                                onChange={(e) => setPhoneValue(e.target.value)}
                                onBlur={() => {
                                    setEditingPhone(false);

                                    if (phoneValue !== (customer.phone ?? '')) {
                                        onUpdateCustomer({
                                            phone: phoneValue || null,
                                        });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                    }

                                    if (e.key === 'Escape') {
                                        setPhoneValue(customer.phone ?? '');
                                        setEditingPhone(false);
                                    }
                                }}
                                className="w-36 rounded border border-border bg-card/50 px-2 py-0.5 text-xs text-foreground focus:border-border focus:outline-none"
                            />
                        ) : (
                            <button
                                onClick={() => setEditingPhone(true)}
                                className="flex max-w-[140px] cursor-pointer items-center gap-1 truncate font-mono text-[11px] text-foreground hover:text-primary"
                            >
                                <span>{customer.phone || 'None'}</span>
                            </button>
                        )}
                    </div>

                    {/* External ID */}
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span>External ID</span>
                        </span>
                        {editingExternalId ? (
                            <input
                                type="text"
                                value={externalIdValue}
                                autoFocus
                                onChange={(e) =>
                                    setExternalIdValue(e.target.value)
                                }
                                onBlur={() => {
                                    setEditingExternalId(false);

                                    if (
                                        externalIdValue !==
                                        (customer.external_id ?? '')
                                    ) {
                                        onUpdateCustomer({
                                            external_id:
                                                externalIdValue || null,
                                        });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                    }

                                    if (e.key === 'Escape') {
                                        setExternalIdValue(
                                            customer.external_id ?? '',
                                        );
                                        setEditingExternalId(false);
                                    }
                                }}
                                className="w-36 rounded border border-border bg-card/50 px-2 py-0.5 text-xs text-foreground focus:border-border focus:outline-none"
                            />
                        ) : (
                            <button
                                onClick={() => setEditingExternalId(true)}
                                className="flex max-w-[140px] cursor-pointer items-center gap-1 truncate font-mono text-[11px] text-foreground hover:text-primary"
                            >
                                <span>{customer.external_id || 'None'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t border-border/60 pt-4">
                <button
                    onClick={onDeleteCustomer}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete customer</span>
                </button>
            </div>
        </div>
    );
}
