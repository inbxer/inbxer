import React from 'react';
import { AddSlackChannelModal } from '@/components/support/thread-modals/add-slack-channel-modal';
import { ChangeCustomerModal } from '@/components/support/thread-modals/change-customer-modal';
import { CreateCompanyModal } from '@/components/support/thread-modals/create-company-modal';
import { CreateTaskModal } from '@/components/support/thread-modals/create-task-modal';
import { DomainMismatchModal } from '@/components/support/thread-modals/domain-mismatch-modal';
import { LinkThreadModal } from '@/components/support/thread-modals/link-thread-modal';
import { LockThreadModal } from '@/components/support/thread-modals/lock-thread-modal';
import { MergeThreadsModal } from '@/components/support/thread-modals/merge-threads-modal';
import { RenameCompanyModal } from '@/components/support/thread-modals/rename-company-modal';
import { RenameCustomerModal } from '@/components/support/thread-modals/rename-customer-modal';
import { TaskSearchModal } from '@/components/support/thread-modals/task-search-modal';
import type { SupportThread, CompanyDetails, Tenant } from '@/types/support';

interface ThreadModalsProps {
    showMergeThreadsModal: boolean;
    setShowMergeThreadsModal: (show: boolean) => void;
    showLockThreadModal: boolean;
    setShowLockThreadModal: (show: boolean) => void;
    showChangeCustomerModal: boolean;
    setShowChangeCustomerModal: (show: boolean) => void;
    showRenameCustomerModal: boolean;
    setShowRenameCustomerModal: (show: boolean) => void;
    showSlackChannelModal: boolean;
    setShowSlackChannelModal: (show: boolean) => void;
    showRenameCompanyModal: boolean;
    setShowRenameCompanyModal: (show: boolean) => void;
    showCreateCompanyModal: boolean;
    setShowCreateCompanyModal: (show: boolean) => void;
    showDomainMismatchModal: boolean;
    setShowDomainMismatchModal: (show: boolean) => void;
    showLinkThreadModal: boolean;
    setShowLinkThreadModal: (show: boolean) => void;
    showTaskSearchModal: boolean;
    setShowTaskSearchModal: (show: boolean) => void;
    showCreateTaskModal: boolean;
    setShowCreateTaskModal: (show: boolean) => void;
    selectedThread: SupportThread | null;
    selectedParentThreadId: string;
    setSelectedParentThreadId: (id: string) => void;
    filteredLinkableThreads: SupportThread[];
    selectedTenantIdToChange: string;
    setSelectedTenantIdToChange: (id: string) => void;
    availableTenants: Tenant[];
    renameCustomerName: string;
    setRenameCustomerName: (name: string) => void;
    slackSearchQuery: string;
    setSlackSearchQuery: (query: string) => void;
    filteredSlackChannels: string[];
    newSlackChannelName: string;
    setNewSlackChannelName: (name: string) => void;
    renameCompanyName: string;
    setRenameCompanyName: (name: string) => void;
    newCompanyName: string;
    setNewCompanyName: (name: string) => void;
    newCompanyDomain: string;
    setNewCompanyDomain: (domain: string) => void;
    tenantEmailDomain: string;
    pendingCompanyToLink: CompanyDetails | null;
    threadSearchQuery: string;
    setThreadSearchQuery: (query: string) => void;
    taskSearchQuery: string;
    setTaskSearchQuery: (query: string) => void;
    filteredLinkableTasks: Array<{ id: string; title: string; status: string }>;
    newTaskTitle: string;
    setNewTaskTitle: (title: string) => void;
    newTaskDescription: string;
    setNewTaskDescription: (desc: string) => void;
    currentUser: { id: number; name: string } | null;
    company?: CompanyDetails | null;
    handleMergeThreadsSubmit: (e: React.FormEvent) => void;
    handleLockThreadSubmit: () => void;
    handleChangeCustomerForThread: (e: React.FormEvent) => void;
    handleRenameCustomer: (e: React.FormEvent) => void;
    handleAddSlackChannelSubmit: (e: React.FormEvent) => void;
    handleRenameCompany: (e: React.FormEvent) => void;
    handleCreateNewCompany: (e: React.FormEvent) => void;
    executeAttachCompany: (companyId: string) => void;
    handleLinkTargetThread: (targetId: string) => void;
    handleLinkTask: (taskId: string) => void;
    handleCreateAndLinkTask: (e: React.FormEvent) => void;
    formatRelativeTime: (dateStr: string) => string;
}

/**
 * Container that renders every modal used on the threads page. Each modal is
 * its own self-contained component under `thread-modals/`; this file just
 * wires the page's state/handlers to the right one.
 */
export function ThreadModals({
    showMergeThreadsModal,
    setShowMergeThreadsModal,
    showLockThreadModal,
    setShowLockThreadModal,
    showChangeCustomerModal,
    setShowChangeCustomerModal,
    showRenameCustomerModal,
    setShowRenameCustomerModal,
    showSlackChannelModal,
    setShowSlackChannelModal,
    showRenameCompanyModal,
    setShowRenameCompanyModal,
    showCreateCompanyModal,
    setShowCreateCompanyModal,
    showDomainMismatchModal,
    setShowDomainMismatchModal,
    showLinkThreadModal,
    setShowLinkThreadModal,
    showTaskSearchModal,
    setShowTaskSearchModal,
    showCreateTaskModal,
    setShowCreateTaskModal,
    selectedThread,
    selectedParentThreadId,
    setSelectedParentThreadId,
    filteredLinkableThreads,
    selectedTenantIdToChange,
    setSelectedTenantIdToChange,
    availableTenants,
    renameCustomerName,
    setRenameCustomerName,
    slackSearchQuery,
    setSlackSearchQuery,
    filteredSlackChannels,
    newSlackChannelName,
    setNewSlackChannelName,
    renameCompanyName,
    setRenameCompanyName,
    newCompanyName,
    setNewCompanyName,
    newCompanyDomain,
    setNewCompanyDomain,
    tenantEmailDomain,
    pendingCompanyToLink,
    threadSearchQuery,
    setThreadSearchQuery,
    taskSearchQuery,
    setTaskSearchQuery,
    filteredLinkableTasks,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDescription,
    setNewTaskDescription,
    currentUser,
    company,
    handleMergeThreadsSubmit,
    handleLockThreadSubmit,
    handleChangeCustomerForThread,
    handleRenameCustomer,
    handleAddSlackChannelSubmit,
    handleRenameCompany,
    handleCreateNewCompany,
    executeAttachCompany,
    handleLinkTargetThread,
    handleLinkTask,
    handleCreateAndLinkTask,
    formatRelativeTime,
}: ThreadModalsProps) {
    return (
        <>
            <MergeThreadsModal
                show={showMergeThreadsModal}
                setShow={setShowMergeThreadsModal}
                selectedThread={selectedThread}
                selectedParentThreadId={selectedParentThreadId}
                setSelectedParentThreadId={setSelectedParentThreadId}
                filteredLinkableThreads={filteredLinkableThreads}
                handleMergeThreadsSubmit={handleMergeThreadsSubmit}
            />

            <LockThreadModal
                show={showLockThreadModal}
                setShow={setShowLockThreadModal}
                handleLockThreadSubmit={handleLockThreadSubmit}
            />

            <ChangeCustomerModal
                show={showChangeCustomerModal}
                setShow={setShowChangeCustomerModal}
                selectedTenantIdToChange={selectedTenantIdToChange}
                setSelectedTenantIdToChange={setSelectedTenantIdToChange}
                availableTenants={availableTenants}
                handleChangeCustomerForThread={handleChangeCustomerForThread}
            />

            <RenameCustomerModal
                show={showRenameCustomerModal}
                setShow={setShowRenameCustomerModal}
                renameCustomerName={renameCustomerName}
                setRenameCustomerName={setRenameCustomerName}
                handleRenameCustomer={handleRenameCustomer}
            />

            <AddSlackChannelModal
                show={showSlackChannelModal}
                setShow={setShowSlackChannelModal}
                slackSearchQuery={slackSearchQuery}
                setSlackSearchQuery={setSlackSearchQuery}
                filteredSlackChannels={filteredSlackChannels}
                newSlackChannelName={newSlackChannelName}
                setNewSlackChannelName={setNewSlackChannelName}
                handleAddSlackChannelSubmit={handleAddSlackChannelSubmit}
            />

            <RenameCompanyModal
                show={showRenameCompanyModal}
                setShow={setShowRenameCompanyModal}
                renameCompanyName={renameCompanyName}
                setRenameCompanyName={setRenameCompanyName}
                handleRenameCompany={handleRenameCompany}
            />

            <CreateCompanyModal
                show={showCreateCompanyModal}
                setShow={setShowCreateCompanyModal}
                newCompanyName={newCompanyName}
                setNewCompanyName={setNewCompanyName}
                newCompanyDomain={newCompanyDomain}
                setNewCompanyDomain={setNewCompanyDomain}
                handleCreateNewCompany={handleCreateNewCompany}
            />

            <DomainMismatchModal
                show={showDomainMismatchModal}
                setShow={setShowDomainMismatchModal}
                tenantEmailDomain={tenantEmailDomain}
                pendingCompanyToLink={pendingCompanyToLink}
                executeAttachCompany={executeAttachCompany}
            />

            <LinkThreadModal
                show={showLinkThreadModal}
                setShow={setShowLinkThreadModal}
                threadSearchQuery={threadSearchQuery}
                setThreadSearchQuery={setThreadSearchQuery}
                filteredLinkableThreads={filteredLinkableThreads}
                selectedThread={selectedThread}
                handleLinkTargetThread={handleLinkTargetThread}
                formatRelativeTime={formatRelativeTime}
            />

            <TaskSearchModal
                show={showTaskSearchModal}
                setShow={setShowTaskSearchModal}
                setShowCreateTaskModal={setShowCreateTaskModal}
                taskSearchQuery={taskSearchQuery}
                setTaskSearchQuery={setTaskSearchQuery}
                filteredLinkableTasks={filteredLinkableTasks}
                handleLinkTask={handleLinkTask}
            />

            <CreateTaskModal
                show={showCreateTaskModal}
                setShow={setShowCreateTaskModal}
                newTaskTitle={newTaskTitle}
                setNewTaskTitle={setNewTaskTitle}
                newTaskDescription={newTaskDescription}
                setNewTaskDescription={setNewTaskDescription}
                currentUser={currentUser}
                company={company}
                selectedThread={selectedThread}
                handleCreateAndLinkTask={handleCreateAndLinkTask}
            />
        </>
    );
}
