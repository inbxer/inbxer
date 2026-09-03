export type SidebarStats = {
    my_threads_count: number;
    tasks_count: number;
    all_threads_count: number;
    not_assigned_count: number;
    labels: Array<{
        id: string;
        name: string;
        color: string;
        icon: string | null;
        threads_count: number;
    }>;
    tiers: Array<{
        id: string;
        name: string;
        color: string;
        threads_count: number;
    }>;
    channels: Array<{
        id: string;
        name: string;
        type: string;
        icon: string;
        threads_count: number;
    }>;
    favorites?: Array<{
        id: string;
        filter_key: string;
        title: string;
        url: string;
    }>;
    savedViews?: Array<{
        id: string;
        name: string;
        filters: { filter?: string } | null;
    }>;
    canManageSavedViews?: boolean;
};

export type SupportTask = {
    id: string;
    team_id: number;
    title: string;
    description: string | null;
    status: 'open' | 'done';
    priority: 'urgent' | 'high' | 'normal' | 'low';
    assigned_to: number | null;
    thread_id: string | null;
    tenant_id: string | null;
    company_id: string | null;
    due_at: string | null;
    completed_at: string | null;
    completed_by: number | null;
    created_at: string;
    updated_at: string;
    assignee?: { id: number; name: string } | null;
    thread?: { id: string; title: string } | null;
    tenant?: { id: string; name: string; email: string } | null;
    company?: { id: string; name: string } | null;
};

export type Label = { id: string; name: string; color?: string };
export type TeamMember = { id: number; name: string; email?: string };
export type CompanyDetails = {
    id: string;
    name: string;
    slug?: string;
    domain?: string | null;
    tier_id?: string | null;
    owner_id?: number | null;
    tier?: { id: string; name: string } | null;
    owner?: { id: number; name: string } | null;
    metadata?: unknown;
    arr?: string | number | null;
    contract_value?: string | number | null;
};
export type CustomerGroup = { id: string; name: string; color?: string };
export type Tenant = {
    id: string;
    name: string;
    email?: string;
    company_id?: string | null;
    company?: CompanyDetails | null;
    groups?: CustomerGroup[];
    tier?: { id: string; name: string } | null;
};
export type TimelineEntry = {
    id: string;
    actor_type: 'user' | 'tenant' | 'system' | 'ai';
    actor_id: string | null;
    entry_type:
        'message' | 'note' | 'status_change' | 'priority_change' | 'assignment';
    body: string | null;
    body_html: string | null;
    is_internal: boolean;
    metadata: any;
    status?: 'sending' | 'failed';
    attachments?: Array<{
        name: string;
        url: string;
        mime_type: string;
        size: string;
    }>;
    created_at: string;
};
export type SupportThread = {
    id: string;
    sequence_number?: number;
    title: string;
    status: string;
    priority: string;
    assigned_to?: number | null;
    assignee_id?: string | null;
    updated_at: string;
    created_at?: string;
    tenant_id?: string;
    tenant?: Tenant | null;
    channel?: { id?: string; name: string; type: string } | null;
    channel_id?: string | null;
    tier?: { id: string; name: string; color?: string } | null;
    tier_id?: string | null;
    labels?: Label[];
    tasks?: SupportTask[];
    assignee?: { id: number; name: string } | null;
    timeline_entries?: TimelineEntry[];
    related_threads?: SupportThread[];
    ai_handoff_at?: string | null;
};
