import { router, usePage, Head } from '@inertiajs/react';
import React, { useState, useEffect } from 'react';
import type { PendingAiDraft } from '@/components/support/ai-draft-review-card';
import { ThreadBoardView } from '@/components/support/thread-board-view';
import { ThreadCustomerSidebar } from '@/components/support/thread-customer-sidebar';
import { ThreadFilterHeader } from '@/components/support/thread-filter-header';
import { ThreadListPanel } from '@/components/support/thread-list-panel';
import { ThreadModals } from '@/components/support/thread-modals';
import { ThreadTableView } from '@/components/support/thread-table-view';
import { ThreadTierSidebar } from '@/components/support/thread-tier-sidebar';
import { ThreadTimelineComposer } from '@/components/support/thread-timeline-composer';
import { useThreadPageActions } from '@/hooks/use-thread-page-actions';
import { formatRelativeTime } from '@/lib/thread-format';
import type { SupportTask } from '@/types';
import type {
    CompanyDetails,
    CustomerGroup,
    SupportThread,
    Tenant,
} from '@/types/support';

interface ThreadsPageProps {
    threads: SupportThread[];
    selectedThread: SupportThread | null;
    pendingAiDraft: PendingAiDraft | null;
    recentThreads?: SupportThread[];
    filter: string;
    teamMembers: Array<{ id: number; name: string; email: string }>;
    availableLabels: Array<{ id: string; name: string; color?: string }>;
    availableTiers: Array<{ id: string; name: string; color?: string }>;
    availableTasks?: SupportTask[];
    availableCompanies?: CompanyDetails[];
    availableGroups?: CustomerGroup[];
    availableTenants?: Tenant[];
}

export default function ThreadsPage({
    threads = [],
    selectedThread,
    pendingAiDraft = null,
    filter = 'my_threads',
    teamMembers = [],
    availableLabels = [],
    availableTiers = [],
    availableTasks = [],
    availableCompanies = [],
    availableTenants = [],
}: ThreadsPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as any;
    const currentUser = (props.auth as any)?.user;
    const stats = props.sidebarStats as any;

    // Realtime: any new message on this team (Slack, email, chat widget, or an agent reply)
    // refreshes the thread list and the open conversation instantly — no polling.
    useEffect(() => {
        if (!currentTeam?.id) {
            return;
        }

        window.Echo.private(`team.${currentTeam.id}`)
            .listen('.message.created', () => {
                router.reload({ only: ['threads', 'selectedThread'] });
            })
            .listen('.ai-draft.created', () => {
                router.reload({ only: ['pendingAiDraft'] });
            });

        return () => {
            window.Echo.leave(`team.${currentTeam.id}`);
        };
    }, [currentTeam?.id]);

    // Layout & View State
    const [showSidebar, setShowSidebar] = useState(true);
    const [showTierSidebar, setShowTierSidebar] = useState(true);
    const [showDone, setShowDone] = useState(false);
    const [statusTab, setStatusTab] = useState<'todo' | 'snoozed' | 'all'>(
        'todo',
    );
    const [timelineFilter, setTimelineFilter] = useState<
        'all' | 'messages_only'
    >('all');

    // Star / Favorite State (Database Backed)
    const isStarred = Boolean(
        stats?.favorites?.some((f: any) => f.filter_key === filter),
    );

    const canSaveView =
        Boolean(stats?.canManageSavedViews) && filter !== 'views';
    const handleSaveView = () => {
        const name = window.prompt('Name this view', filter);

        if (!name?.trim()) {
            return;
        }

        router.post(
            `/saved-views`,
            { name: name.trim(), filters: { filter } },
            { preserveScroll: true, preserveState: true },
        );
    };

    // Advanced Display & View Mode State (Persistent across all threads/* pages)
    const [viewMode, setViewMode] = useState<'table' | 'board'>(() => {
        if (typeof window === 'undefined') {
            return 'table';
        }

        try {
            const raw = localStorage.getItem('inbxer_display_settings_v2');

            return raw ? JSON.parse(raw).viewMode || 'table' : 'table';
        } catch {
            return 'table';
        }
    });

    const [groupBy, setGroupBy] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return 'none';
        }

        try {
            const raw = localStorage.getItem('inbxer_display_settings_v2');

            return raw ? JSON.parse(raw).groupBy || 'none' : 'none';
        } catch {
            return 'none';
        }
    });

    const [sortBy, setSortBy] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return 'status_oldest';
        }

        try {
            const raw = localStorage.getItem('inbxer_display_settings_v2');

            return raw
                ? JSON.parse(raw).sortBy || 'status_oldest'
                : 'status_oldest';
        } catch {
            return 'status_oldest';
        }
    });

    // Display Properties Toggle State (Persistent in localStorage)
    const [visibleProperties, setVisibleProperties] = useState<
        Record<string, boolean>
    >(() => {
        const defaults = {
            status: true,
            customer: true,
            company: true,
            tenant: true,
            ref: true,
            previewText: true,
            tier: true,
            groups: false,
            labels: true,
            linkedIssues: false,
            linkedThreads: false,
            tasks: false,
            sla: false,
            channel: true,
            lastUpdated: true,
            created: false,
            assignee: true,
        };

        if (typeof window === 'undefined') {
            return defaults;
        }

        try {
            const raw = localStorage.getItem('inbxer_display_settings_v2');

            return raw
                ? JSON.parse(raw).visibleProperties || defaults
                : defaults;
        } catch {
            return defaults;
        }
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            localStorage.setItem(
                'inbxer_display_settings_v2',
                JSON.stringify({
                    viewMode,
                    groupBy,
                    sortBy,
                    visibleProperties,
                }),
            );
        } catch {
            // ignore
        }
    }, [viewMode, groupBy, sortBy, visibleProperties]);

    const toggleProperty = (key: string) => {
        setVisibleProperties((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // State for Reply Box / Floating Composer
    const [isInternal, setIsInternal] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [showReplyBox, setShowReplyBox] = useState(false);

    // State for Modals & Inputs
    const [showLinkThreadModal, setShowLinkThreadModal] = useState(false);
    const [threadSearchQuery, setThreadSearchQuery] = useState('');
    const [showTaskSearchModal, setShowTaskSearchModal] = useState(false);
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [showRenameCompanyModal, setShowRenameCompanyModal] = useState(false);
    const [renameCompanyName, setRenameCompanyName] = useState('');
    const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyDomain, setNewCompanyDomain] = useState('');
    const [showRenameCustomerModal, setShowRenameCustomerModal] =
        useState(false);
    const [renameCustomerName, setRenameCustomerName] = useState('');
    const [showChangeCustomerModal, setShowChangeCustomerModal] =
        useState(false);
    const [selectedTenantIdToChange, setSelectedTenantIdToChange] =
        useState<string>('');
    const [pendingCompanyToLink] = useState<CompanyDetails | null>(null);
    const [showDomainMismatchModal, setShowDomainMismatchModal] =
        useState(false);
    const [slackChannels, setSlackChannels] = useState<string[]>([]);
    const [showSlackChannelModal, setShowSlackChannelModal] = useState(false);
    const [slackSearchQuery, setSlackSearchQuery] = useState('');
    const [newSlackChannelName, setNewSlackChannelName] = useState('');
    const [showMergeThreadsModal, setShowMergeThreadsModal] = useState(false);
    const [selectedParentThreadId, setSelectedParentThreadId] =
        useState<string>('');
    const [showLockThreadModal, setShowLockThreadModal] = useState(false);

    const isThreadLocked =
        selectedThread?.status === 'ignored' ||
        selectedThread?.status === 'spam';
    const isFilteredView = !selectedThread;

    // Title / Filter Display text
    const filterTitle =
        filter === 'my_threads'
            ? 'My threads'
            : filter === 'unassigned'
              ? 'Not assigned'
              : filter === 'all'
                ? 'All threads'
                : filter === 'views'
                  ? 'Views'
                  : filter.startsWith('label:')
                    ? filter.replace('label:', '')
                    : filter.startsWith('tier:')
                      ? filter.replace('tier:', '')
                      : filter.startsWith('channel:')
                        ? filter.replace('channel:', '')
                        : filter.startsWith('user:')
                          ? (teamMembers.find(
                                (m) =>
                                    String(m.id) ===
                                    filter.replace('user:', ''),
                            )?.name ?? 'Assignee')
                          : filter;

    const {
        handleSelectThread,
        handleToggleStar,
        handleUpdateMeta,
        handleAssignThread,
        handleToggleLabel,
        handleLinkTask,
        handleCreateAndLinkTask,
        handleLinkTargetThread,
        handleUnlinkTargetThread,
        handlePostReply,
        handleLockThreadSubmit,
        handleMergeThreadsSubmit,
        handleCopyAsMarkdown,
        handleDeleteThread,
        handleCopyThreadReference,
        handleCopyThreadId,
        handleCopyThreadLink,
        handleRenameCompany,
        handleCreateNewCompany,
        handleRenameCustomer,
        handleChangeCustomerForThread,
        handleAddSlackChannelSubmit,
        executeAttachCompany,
        pendingEntries,
        retryPendingEntry,
        dismissPendingEntry,
    } = useThreadPageActions({
        currentUser,
        filter,
        filterTitle,
        selectedThread,
        isThreadLocked,
        replyBody,
        isInternal,
        setReplyBody,
        setShowReplyBox,
        newTaskTitle,
        newTaskDescription,
        setNewTaskTitle,
        setNewTaskDescription,
        setShowCreateTaskModal,
        setShowTaskSearchModal,
        setThreadSearchQuery,
        selectedParentThreadId,
        setShowMergeThreadsModal,
        setShowLockThreadModal,
        renameCompanyName,
        setShowRenameCompanyModal,
        newCompanyName,
        newCompanyDomain,
        setNewCompanyName,
        setNewCompanyDomain,
        setShowCreateCompanyModal,
        renameCustomerName,
        setShowRenameCustomerModal,
        selectedTenantIdToChange,
        setShowChangeCustomerModal,
        newSlackChannelName,
        slackChannels,
        setSlackChannels,
        setNewSlackChannelName,
        setShowSlackChannelModal,
        setShowDomainMismatchModal,
    });

    const company = selectedThread?.tenant?.company;
    const tenant = selectedThread?.tenant;
    const tenantEmailDomain = tenant?.email?.includes('@')
        ? tenant?.email.split('@')[1]
        : 'plain-customer.com';
    const companyDomain = company?.domain || undefined;
    const domainMismatch =
        tenantEmailDomain &&
        companyDomain &&
        tenantEmailDomain.toLowerCase() !== companyDomain.toLowerCase()
            ? {
                  mismatches: true,
                  tenantDomain: tenantEmailDomain,
                  companyDomain,
              }
            : null;

    // Filter threads for Link Thread modal
    const filteredLinkableThreads = threads.filter((t) => {
        if (t.id === selectedThread?.id) {
            return false;
        }

        if (!threadSearchQuery.trim()) {
            return true;
        }

        const query = threadSearchQuery.toLowerCase();
        const seq = t.sequence_number ? `t-${t.sequence_number}` : '';

        return t.title.toLowerCase().includes(query) || seq.includes(query);
    });

    // Filter tasks for Link Task modal
    const filteredLinkableTasks = availableTasks.filter((t) => {
        if (!taskSearchQuery.trim()) {
            return true;
        }

        return t.title.toLowerCase().includes(taskSearchQuery.toLowerCase());
    });

    // Filter Slack channels for Slack modal
    const filteredSlackChannels = slackChannels.filter((sc) => {
        if (!slackSearchQuery.trim()) {
            return true;
        }

        return sc.toLowerCase().includes(slackSearchQuery.toLowerCase());
    });

    // Filtering threads by selected assignee filter & sub-filters & main view filter
    const activeThreads = threads.filter((t) => {
        if (filter === 'unassigned' && t.assigned_to !== null) {
            return false;
        }

        if (
            filter === 'my_threads' &&
            currentUser?.id &&
            t.assigned_to !== currentUser.id
        ) {
            return false;
        }

        if (filter.startsWith('label:')) {
            const labelName = filter.replace('label:', '').toLowerCase();

            return t.labels?.some((l) => l.name.toLowerCase() === labelName);
        }

        if (filter.startsWith('tier:')) {
            const tierVal = filter.replace('tier:', '').toLowerCase();

            return (
                t.tier?.name?.toLowerCase() === tierVal ||
                t.tier?.id?.toLowerCase() === tierVal ||
                t.tenant?.tier?.name?.toLowerCase() === tierVal
            );
        }

        if (filter.startsWith('channel:')) {
            const chnVal = filter.replace('channel:', '').toLowerCase();

            return (
                t.channel?.name?.toLowerCase() === chnVal ||
                t.channel?.id?.toLowerCase() === chnVal ||
                t.channel?.type?.toLowerCase() === chnVal ||
                t.channel_id?.toLowerCase() === chnVal
            );
        }

        return true;
    });

    // Counts for status sub-tabs
    const todoCount = activeThreads.filter(
        (t) =>
            t.status !== 'snoozed' &&
            t.status !== 'done' &&
            t.status !== 'ignored' &&
            t.status !== 'spam',
    ).length;
    const snoozedCount = activeThreads.filter(
        (t) => t.status === 'snoozed',
    ).length;

    // Filter by status tab (Todo, Snoozed, All)
    const statusFilteredThreads = activeThreads.filter((t) => {
        if (statusTab === 'todo') {
            return (
                t.status !== 'snoozed' &&
                t.status !== 'done' &&
                t.status !== 'ignored' &&
                t.status !== 'spam'
            );
        }

        if (statusTab === 'snoozed') {
            return t.status === 'snoozed';
        }

        return true;
    });

    // Sort active threads dynamically based on `sortBy`
    const sortedThreads = [...statusFilteredThreads].sort((a, b) => {
        if (sortBy === 'status_oldest' || sortBy === 'created_oldest') {
            return (
                new Date(a.updated_at).getTime() -
                new Date(b.updated_at).getTime()
            );
        }

        if (sortBy === 'priority_high_low') {
            const weights: Record<string, number> = {
                urgent: 4,
                high: 3,
                normal: 2,
                low: 1,
            };

            return (
                (weights[b.priority || 'normal'] || 0) -
                (weights[a.priority || 'normal'] || 0)
            );
        }

        return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    });

    // Grouping threads dynamically based on `groupBy`
    const groupedThreadsMap: Record<string, SupportThread[]> = {};

    if (groupBy === 'none') {
        groupedThreadsMap['All'] = sortedThreads;
    } else {
        sortedThreads.forEach((t) => {
            let key = 'Default';

            if (groupBy === 'company') {
                key = t.tenant?.company?.name || 'No Company';
            } else if (groupBy === 'status') {
                key = t.status || 'Needs first response';
            } else if (groupBy === 'priority') {
                key = t.priority || 'Normal';
            } else if (groupBy === 'tier') {
                key = t.tier?.name || 'Free Tier';
            } else if (groupBy === 'channel') {
                key = t.channel?.name || 'Chat';
            } else if (groupBy === 'assignee') {
                key = t.assigned_to
                    ? `Assigned #${t.assigned_to}`
                    : 'Unassigned';
            }

            if (!groupedThreadsMap[key]) {
                groupedThreadsMap[key] = [];
            }

            groupedThreadsMap[key].push(t);
        });
    }

    // Timeline Entries Filtering based on View Mode
    const displayedTimelineEntries = [
        ...(selectedThread?.timeline_entries || []),
        ...pendingEntries.filter(
            (entry) => entry.thread_id === selectedThread?.id,
        ),
    ].filter((entry) => {
        if (timelineFilter === 'all') {
            return true;
        }

        return (
            entry.entry_type === 'message' ||
            (entry.entry_type === 'note' && entry.is_internal === true)
        );
    });

    // Display Properties Configuration items
    const propertyToggleItems = [
        { key: 'status', label: 'Status' },
        { key: 'customer', label: 'Customer' },
        { key: 'company', label: 'Company' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'ref', label: 'Ref' },
        { key: 'previewText', label: 'Preview text' },
        { key: 'tier', label: 'Tier' },
        { key: 'groups', label: 'Groups' },
        { key: 'labels', label: 'Labels' },
        { key: 'linkedIssues', label: 'Linked issues' },
        { key: 'linkedThreads', label: 'Linked threads' },
        { key: 'tasks', label: 'Tasks' },
        { key: 'sla', label: 'SLA' },
        { key: 'channel', label: 'Channel' },
        { key: 'lastUpdated', label: 'Last updated' },
        { key: 'created', label: 'Created' },
        { key: 'assignee', label: 'Assignee' },
    ];

    // IF FULL-WIDTH FILTERED VIEW (Labels, Tiers, Channels from screenshot)
    if (isFilteredView) {
        return (
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
                <Head title={filterTitle} />
                <ThreadFilterHeader
                    filter={filter}
                    filterTitle={filterTitle}
                    statusTab={statusTab}
                    setStatusTab={setStatusTab}
                    todoCount={todoCount}
                    snoozedCount={snoozedCount}
                    activeThreadsCount={activeThreads.length}
                    isStarred={isStarred}
                    handleToggleStar={handleToggleStar}
                    showTierSidebar={showTierSidebar}
                    setShowTierSidebar={setShowTierSidebar}
                    showDone={showDone}
                    setShowDone={setShowDone}
                    assigneesList={teamMembers}
                    currentUserId={currentUser?.id ?? null}
                    tiersList={availableTiers}
                    labelsList={availableLabels}
                    visibleProperties={visibleProperties}
                    toggleProperty={toggleProperty}
                    viewMode={viewMode}
                    groupBy={groupBy}
                    sortBy={sortBy}
                    setViewMode={setViewMode}
                    setGroupBy={setGroupBy}
                    setSortBy={setSortBy}
                    canSaveView={canSaveView}
                    handleSaveView={handleSaveView}
                />

                {/* Content Area: Table Mode vs Kanban Board Mode + Tier Details Panel (Matching Screenshot 2) */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                        {viewMode === 'board' ? (
                            <ThreadBoardView
                                groupedThreadsMap={groupedThreadsMap}
                                handleSelectThread={handleSelectThread}
                                formatRelativeTime={formatRelativeTime}
                            />
                        ) : (
                            <ThreadTableView
                                groupedThreadsMap={groupedThreadsMap}
                                groupBy={groupBy}
                                visibleProperties={visibleProperties}
                                handleSelectThread={handleSelectThread}
                                formatRelativeTime={formatRelativeTime}
                                sortedThreads={sortedThreads}
                                filter={filter}
                                filterTitle={filterTitle}
                                currentUser={currentUser}
                                teamMembers={teamMembers}
                                onAssignThread={handleAssignThread}
                            />
                        )}
                    </div>

                    {/* Tier Details Right Panel (Matching Screenshot 2) */}
                    {filter.startsWith('tier:') && showTierSidebar && (
                        <ThreadTierSidebar
                            filter={filter}
                            availableTiers={availableTiers}
                            availableCompanies={availableCompanies}
                            threads={threads}
                            onClose={() => setShowTierSidebar(false)}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full max-h-[93vh] min-h-0 min-w-0 overflow-hidden bg-background text-foreground">
            <Head title="Inbox" />

            {/* Column 1: Left Inbox / Threads List Sidebar */}
            <ThreadListPanel
                threads={threads}
                selectedThread={selectedThread}
                visibleProperties={visibleProperties}
                propertyToggleItems={propertyToggleItems}
                toggleProperty={toggleProperty}
                handleSelectThread={handleSelectThread}
                formatRelativeTime={formatRelativeTime}
            />

            {/* Column 2: Center Thread Conversation & Activity Stream */}
            <ThreadTimelineComposer
                selectedThread={selectedThread}
                pendingAiDraft={pendingAiDraft}
                timelineFilter={timelineFilter}
                setTimelineFilter={setTimelineFilter}
                isThreadLocked={isThreadLocked}
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                displayedTimelineEntries={displayedTimelineEntries}
                retryPendingEntry={retryPendingEntry}
                dismissPendingEntry={dismissPendingEntry}
                showReplyBox={showReplyBox}
                setShowReplyBox={setShowReplyBox}
                isInternal={isInternal}
                setIsInternal={setIsInternal}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                handleCopyThreadReference={handleCopyThreadReference}
                handleCopyThreadId={handleCopyThreadId}
                handleCopyThreadLink={handleCopyThreadLink}
                handleCopyAsMarkdown={handleCopyAsMarkdown}
                handleDeleteThread={handleDeleteThread}
                setShowMergeThreadsModal={setShowMergeThreadsModal}
                setShowLockThreadModal={setShowLockThreadModal}
                handlePostReply={handlePostReply}
                formatRelativeTime={formatRelativeTime}
            />

            {/* Column 3: Right Details & Context Sidebar */}
            {selectedThread && (
                <ThreadCustomerSidebar
                    selectedThread={selectedThread}
                    showSidebar={showSidebar}
                    teamMembers={teamMembers}
                    currentUserId={currentUser?.id ?? null}
                    availableLabels={availableLabels}
                    availableTiers={availableTiers}
                    company={company}
                    domainMismatch={domainMismatch}
                    threads={threads}
                    availableCompanies={availableCompanies}
                    handleUpdateMeta={handleUpdateMeta}
                    handleToggleLabel={handleToggleLabel}
                    handleSelectThread={handleSelectThread}
                    handleUnlinkTargetThread={handleUnlinkTargetThread}
                    setShowLinkThreadModal={setShowLinkThreadModal}
                    setShowTaskSearchModal={setShowTaskSearchModal}
                    setShowAssignCompanyModal={setShowCreateCompanyModal}
                    setShowCreateCompanyModal={setShowCreateCompanyModal}
                    setShowRenameCustomerModal={setShowRenameCustomerModal}
                    setShowChangeCustomerModal={setShowChangeCustomerModal}
                    executeAttachCompany={executeAttachCompany}
                />
            )}

            {/* Modals Container */}
            <ThreadModals
                showMergeThreadsModal={showMergeThreadsModal}
                setShowMergeThreadsModal={setShowMergeThreadsModal}
                showLockThreadModal={showLockThreadModal}
                setShowLockThreadModal={setShowLockThreadModal}
                showChangeCustomerModal={showChangeCustomerModal}
                setShowChangeCustomerModal={setShowChangeCustomerModal}
                showRenameCustomerModal={showRenameCustomerModal}
                setShowRenameCustomerModal={setShowRenameCustomerModal}
                showSlackChannelModal={showSlackChannelModal}
                setShowSlackChannelModal={setShowSlackChannelModal}
                showRenameCompanyModal={showRenameCompanyModal}
                setShowRenameCompanyModal={setShowRenameCompanyModal}
                showCreateCompanyModal={showCreateCompanyModal}
                setShowCreateCompanyModal={setShowCreateCompanyModal}
                showDomainMismatchModal={showDomainMismatchModal}
                setShowDomainMismatchModal={setShowDomainMismatchModal}
                showLinkThreadModal={showLinkThreadModal}
                setShowLinkThreadModal={setShowLinkThreadModal}
                showTaskSearchModal={showTaskSearchModal}
                setShowTaskSearchModal={setShowTaskSearchModal}
                showCreateTaskModal={showCreateTaskModal}
                setShowCreateTaskModal={setShowCreateTaskModal}
                selectedThread={selectedThread}
                selectedParentThreadId={selectedParentThreadId}
                setSelectedParentThreadId={setSelectedParentThreadId}
                filteredLinkableThreads={filteredLinkableThreads}
                selectedTenantIdToChange={selectedTenantIdToChange}
                setSelectedTenantIdToChange={setSelectedTenantIdToChange}
                availableTenants={availableTenants}
                renameCustomerName={renameCustomerName}
                setRenameCustomerName={setRenameCustomerName}
                slackSearchQuery={slackSearchQuery}
                setSlackSearchQuery={setSlackSearchQuery}
                filteredSlackChannels={filteredSlackChannels}
                newSlackChannelName={newSlackChannelName}
                setNewSlackChannelName={setNewSlackChannelName}
                renameCompanyName={renameCompanyName}
                setRenameCompanyName={setRenameCompanyName}
                newCompanyName={newCompanyName}
                setNewCompanyName={setNewCompanyName}
                newCompanyDomain={newCompanyDomain}
                setNewCompanyDomain={setNewCompanyDomain}
                tenantEmailDomain={tenantEmailDomain}
                pendingCompanyToLink={pendingCompanyToLink}
                threadSearchQuery={threadSearchQuery}
                setThreadSearchQuery={setThreadSearchQuery}
                taskSearchQuery={taskSearchQuery}
                setTaskSearchQuery={setTaskSearchQuery}
                filteredLinkableTasks={filteredLinkableTasks}
                newTaskTitle={newTaskTitle}
                setNewTaskTitle={setNewTaskTitle}
                newTaskDescription={newTaskDescription}
                setNewTaskDescription={setNewTaskDescription}
                currentUser={currentUser}
                company={company}
                handleMergeThreadsSubmit={handleMergeThreadsSubmit}
                handleLockThreadSubmit={handleLockThreadSubmit}
                handleChangeCustomerForThread={handleChangeCustomerForThread}
                handleRenameCustomer={handleRenameCustomer}
                handleAddSlackChannelSubmit={handleAddSlackChannelSubmit}
                handleRenameCompany={handleRenameCompany}
                handleCreateNewCompany={handleCreateNewCompany}
                executeAttachCompany={executeAttachCompany}
                handleLinkTargetThread={handleLinkTargetThread}
                handleLinkTask={handleLinkTask}
                handleCreateAndLinkTask={handleCreateAndLinkTask}
                formatRelativeTime={formatRelativeTime}
            />
        </div>
    );
}
