import { router } from '@inertiajs/react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import { formatFullMarkdownDate } from '@/lib/thread-format';
import type { SupportThread, TimelineEntry } from '@/types/support';

export interface PendingTimelineEntry extends TimelineEntry {
    thread_id: string;
    status: 'sending' | 'failed';
}

interface UseThreadPageActionsArgs {
    currentUser: { id?: number; name?: string } | undefined;
    filter: string;
    filterTitle: string;
    selectedThread: SupportThread | null | undefined;
    isThreadLocked: boolean;

    replyBody: string;
    isInternal: boolean;
    setReplyBody: (value: string) => void;
    setShowReplyBox: (value: boolean) => void;

    newTaskTitle: string;
    newTaskDescription: string;
    setNewTaskTitle: (value: string) => void;
    setNewTaskDescription: (value: string) => void;
    setShowCreateTaskModal: (value: boolean) => void;
    setShowTaskSearchModal: (value: boolean) => void;
    setThreadSearchQuery: (value: string) => void;

    selectedParentThreadId: string;
    setShowMergeThreadsModal: (value: boolean) => void;
    setShowLockThreadModal: (value: boolean) => void;

    renameCompanyName: string;
    setShowRenameCompanyModal: (value: boolean) => void;

    newCompanyName: string;
    newCompanyDomain: string;
    setNewCompanyName: (value: string) => void;
    setNewCompanyDomain: (value: string) => void;
    setShowCreateCompanyModal: (value: boolean) => void;

    renameCustomerName: string;
    setShowRenameCustomerModal: (value: boolean) => void;

    selectedTenantIdToChange: string;
    setShowChangeCustomerModal: (value: boolean) => void;

    newSlackChannelName: string;
    slackChannels: string[];
    setSlackChannels: React.Dispatch<React.SetStateAction<string[]>>;
    setNewSlackChannelName: (value: string) => void;
    setShowSlackChannelModal: (value: boolean) => void;

    setShowDomainMismatchModal: (value: boolean) => void;
}

/**
 * All the mutation/action handlers used by the threads page. Extracted into a
 * hook so the page component itself stays focused on layout and derived data.
 */
export function useThreadPageActions({
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
}: UseThreadPageActionsArgs) {
    const confirm = useConfirm();
    const [pendingEntries, setPendingEntries] = useState<
        PendingTimelineEntry[]
    >([]);

    const handleSelectThread = (threadId: string) => {
        router.get(
            window.location.pathname,
            { thread: threadId },
            { preserveState: true },
        );
    };

    const handleToggleStar = () => {
        const currentUrl = window.location.pathname;

        router.post(
            `/favorites/toggle`,
            {
                filter_key: filter,
                title: filterTitle,
                url: currentUrl,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleUpdateMeta = (
        key: 'status' | 'priority' | 'assigned_to' | 'tier_id',
        value: string | null,
    ) => {
        if (!selectedThread) {
            return;
        }

        router.patch(
            `/threads/${selectedThread.id}`,
            { [key]: value },
            { preserveState: true },
        );
    };

    const handleAssignThread = (threadId: string, userId: number | null) => {
        router.patch(
            `/threads/${threadId}`,
            { assigned_to: userId },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleToggleLabel = (labelId: string) => {
        if (!selectedThread) {
            return;
        }

        const currentIds = selectedThread.labels?.map((l) => l.id) || [];
        const newIds = currentIds.includes(labelId)
            ? currentIds.filter((id) => id !== labelId)
            : [...currentIds, labelId];

        router.post(
            `/threads/${selectedThread.id}/labels`,
            { label_ids: newIds },
            { preserveState: true },
        );
    };

    const handleLinkTask = (taskId?: string) => {
        if (!selectedThread) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/tasks`,
            { task_id: taskId },
            {
                preserveState: true,
                onSuccess: () => {
                    setShowTaskSearchModal(false);
                },
            },
        );
    };

    const handleCreateAndLinkTask = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!selectedThread || !newTaskTitle.trim()) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/tasks`,
            {
                title: newTaskTitle.trim(),
                description: newTaskDescription.trim() || null,
                assigned_to: currentUser?.id,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                    setShowCreateTaskModal(false);
                    setShowTaskSearchModal(false);
                },
            },
        );
    };

    const handleLinkTargetThread = (targetThreadId: string) => {
        if (!selectedThread) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/link-thread`,
            { target_thread_id: targetThreadId },
            {
                preserveState: true,
                onSuccess: () => {
                    setThreadSearchQuery('');
                },
            },
        );
    };

    const handleUnlinkTargetThread = (
        relatedThreadId: string,
        e: React.MouseEvent,
    ) => {
        e.stopPropagation();

        if (!selectedThread) {
            return;
        }

        router.delete(
            `/threads/${selectedThread.id}/unlink-thread/${relatedThreadId}`,
            { preserveState: true },
        );
    };

    const handlePostReply = (
        e?: React.FormEvent,
        attachmentsFiles?: File[],
        status?: string,
    ) => {
        if (e) {
            e.preventDefault();
        }

        if (
            !selectedThread ||
            (!replyBody.trim() &&
                (!attachmentsFiles || attachmentsFiles.length === 0)) ||
            isThreadLocked
        ) {
            return;
        }

        const threadId = selectedThread.id;
        const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimisticEntry: PendingTimelineEntry = {
            id: tempId,
            thread_id: threadId,
            actor_type: 'user',
            actor_id: currentUser?.id ? String(currentUser.id) : null,
            entry_type: isInternal ? 'note' : 'message',
            body: replyBody,
            body_html: null,
            is_internal: isInternal,
            metadata: null,
            created_at: new Date().toISOString(),
            status: 'sending',
        };

        setPendingEntries((prev) => [...prev, optimisticEntry]);
        setReplyBody('');
        setShowReplyBox(false);

        const settlePending = (nextStatus: 'failed' | null) => {
            setPendingEntries((prev) =>
                nextStatus === null
                    ? prev.filter((entry) => entry.id !== tempId)
                    : prev.map((entry) =>
                          entry.id === tempId
                              ? { ...entry, status: nextStatus }
                              : entry,
                      ),
            );
        };

        if (attachmentsFiles && attachmentsFiles.length > 0) {
            const formData = new FormData();
            formData.append('body', replyBody);
            formData.append('is_internal', isInternal ? '1' : '0');

            if (status) {
                formData.append('status', status);
            }

            attachmentsFiles.forEach((file, idx) => {
                formData.append(`attachments[${idx}]`, file);
            });

            router.post(`/threads/${threadId}/reply`, formData, {
                preserveState: true,
                onSuccess: () => settlePending(null),
                onError: () => settlePending('failed'),
            });
        } else {
            router.post(
                `/threads/${threadId}/reply`,
                {
                    body: optimisticEntry.body,
                    is_internal: isInternal,
                    ...(status ? { status } : {}),
                },
                {
                    preserveState: true,
                    onSuccess: () => settlePending(null),
                    onError: () => settlePending('failed'),
                },
            );
        }
    };

    const retryPendingEntry = (entry: TimelineEntry) => {
        setPendingEntries((prev) =>
            prev.filter((pending) => pending.id !== entry.id),
        );
        setReplyBody(entry.body ?? '');
        setShowReplyBox(true);
    };

    const dismissPendingEntry = (entryId: string) => {
        setPendingEntries((prev) =>
            prev.filter((entry) => entry.id !== entryId),
        );
    };

    const handleLockThreadSubmit = () => {
        if (!selectedThread) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/lock`,
            {},
            {
                preserveState: true,
                onSuccess: () => {
                    setShowLockThreadModal(false);
                },
            },
        );
    };

    const handleMergeThreadsSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!selectedThread || !selectedParentThreadId) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/merge`,
            { parent_thread_id: selectedParentThreadId },
            {
                preserveState: true,
                onSuccess: () => {
                    setShowMergeThreadsModal(false);
                },
            },
        );
    };

    const handleCopyAsMarkdown = (type: 'messages_only' | 'all') => {
        if (!selectedThread) {
            return;
        }

        const channelName =
            selectedThread.channel?.name?.toUpperCase() || 'CHAT';
        const statusName = (
            selectedThread.status || 'needs_first_response'
        ).toUpperCase();
        const assigneeName =
            selectedThread.assignee?.name ||
            currentUser?.name ||
            'Abdelmjid Saber';
        const threadUrl = window.location.href;

        let md = `# ${selectedThread.title}\n\n`;
        md += `- **Reference:** T-${selectedThread.sequence_number || 1}\n`;
        md += `- **Thread ID:** ${selectedThread.id}\n`;
        md += `- **URL:** ${threadUrl}\n`;
        md += `- **Channel:** ${channelName}\n`;
        md += `- **Status:** ${statusName}\n`;
        md += `- **Assignee:** ${assigneeName}\n`;

        const entries = selectedThread.timeline_entries || [];

        entries.forEach((entry) => {
            const isMsg =
                entry.entry_type === 'message' ||
                (entry.entry_type === 'note' && entry.is_internal);

            if (type === 'messages_only' && !isMsg) {
                return;
            }

            const actorName =
                entry.actor_type === 'user'
                    ? selectedThread.assignee?.name ||
                      currentUser?.name ||
                      'Abdelmjid Saber'
                    : entry.actor_type === 'ai' || entry.actor_type === 'system'
                      ? 'Plain'
                      : selectedThread.tenant?.name ||
                        'Anonymous Customer #1865';

            const dateFormatted = formatFullMarkdownDate(entry.created_at);

            md += `\n---\n\n`;

            if (isMsg) {
                const msgContext = entry.is_internal
                    ? 'Thread discussion message'
                    : 'Chat';
                md += `## ${actorName} — ${msgContext} — ${dateFormatted}\n\n`;
                md += `${entry.body || ''}\n`;
            } else {
                md += `## ${actorName} — Event — ${dateFormatted}\n\n`;
                md += `${entry.body || `Updated ${entry.entry_type}`}\n`;
            }
        });

        navigator.clipboard.writeText(md);
        toast.success('Copied thread as markdown to clipboard!');
    };

    const handleDeleteThread = async () => {
        if (!selectedThread) {
            return;
        }

        if (
            await confirm({
                title: 'Delete this thread?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(`/threads/${selectedThread.id}`);
        }
    };

    const handleCopyThreadReference = () => {
        if (!selectedThread) {
            return;
        }

        navigator.clipboard.writeText(
            `T-${selectedThread.sequence_number || 1}`,
        );
        toast.success('Copied thread reference!');
    };

    const handleCopyThreadId = () => {
        if (!selectedThread) {
            return;
        }

        navigator.clipboard.writeText(selectedThread.id);
        toast.success('Copied thread ID!');
    };

    const handleCopyThreadLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Copied thread link!');
    };

    const handleUpdateCompanyDetails = (data: {
        owner_id?: number | null;
        tier_id?: string | null;
        name?: string;
    }) => {
        const company = selectedThread?.tenant?.company;

        if (!company) {
            return;
        }

        router.patch(`/companies/${company.id}`, data, {
            preserveState: true,
        });
    };

    const handleRenameCompany = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!renameCompanyName.trim()) {
            return;
        }

        handleUpdateCompanyDetails({ name: renameCompanyName.trim() });
        setShowRenameCompanyModal(false);
    };

    const handleCreateNewCompany = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!newCompanyName.trim()) {
            return;
        }

        router.post(
            `/companies`,
            {
                name: newCompanyName.trim(),
                domain: newCompanyDomain.trim() || null,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setNewCompanyName('');
                    setNewCompanyDomain('');
                    setShowCreateCompanyModal(false);
                },
            },
        );
    };

    const handleRenameCustomer = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        const tenant = selectedThread?.tenant;

        if (!tenant || !renameCustomerName.trim()) {
            return;
        }

        router.patch(
            `/tenants/${tenant.id}`,
            { name: renameCustomerName.trim() },
            {
                preserveState: true,
                onSuccess: () => {
                    setShowRenameCustomerModal(false);
                },
            },
        );
    };

    const handleChangeCustomerForThread = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!selectedThread || !selectedTenantIdToChange) {
            return;
        }

        router.patch(
            `/threads/${selectedThread.id}`,
            { tenant_id: selectedTenantIdToChange },
            {
                preserveState: true,
                onSuccess: () => {
                    setShowChangeCustomerModal(false);
                },
            },
        );
    };

    const handleAddSlackChannelSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!newSlackChannelName.trim()) {
            return;
        }

        const channel = newSlackChannelName.trim().replace(/^#/, '');

        if (!slackChannels.includes(channel)) {
            setSlackChannels((prev) => [...prev, channel]);
        }

        setNewSlackChannelName('');
        setShowSlackChannelModal(false);
    };

    const executeAttachCompany = (companyId: string) => {
        if (!selectedThread?.tenant?.id) {
            return;
        }

        router.patch(
            `/tenants/${selectedThread.tenant.id}`,
            { company_id: companyId },
            {
                preserveState: true,
                onSuccess: () => {
                    setShowDomainMismatchModal(false);
                },
            },
        );
    };

    return {
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
        handleUpdateCompanyDetails,
        handleRenameCompany,
        handleCreateNewCompany,
        handleRenameCustomer,
        handleChangeCustomerForThread,
        handleAddSlackChannelSubmit,
        executeAttachCompany,
        pendingEntries,
        retryPendingEntry,
        dismissPendingEntry,
    };
}
