import { router } from '@inertiajs/react';
import { History, MessageCircle, Sparkles, UserRound, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import type { PendingAiDraft } from '@/components/support/ai-draft-review-card';
import { MarkdownBody } from '@/components/support/markdown-body';
import { ThreadReplyComposer } from '@/components/support/thread-reply-composer';
import { ThreadTimelineEntries } from '@/components/support/thread-timeline-entries';
import { ThreadTimelineHeader } from '@/components/support/thread-timeline-header';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import type { SupportThread, TimelineEntry } from '@/types/support';

interface ThreadTimelineComposerProps {
    selectedThread: SupportThread | null;
    pendingAiDraft: PendingAiDraft | null;
    timelineFilter: 'all' | 'messages_only';
    setTimelineFilter: (filter: 'all' | 'messages_only') => void;
    isThreadLocked: boolean;
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    displayedTimelineEntries: TimelineEntry[];
    retryPendingEntry: (entry: TimelineEntry) => void;
    dismissPendingEntry: (entryId: string) => void;
    showReplyBox: boolean;
    setShowReplyBox: (show: boolean) => void;
    isInternal: boolean;
    setIsInternal: (internal: boolean) => void;
    replyBody: string;
    setReplyBody: (body: string) => void;
    handleCopyThreadReference: () => void;
    handleCopyThreadId: () => void;
    handleCopyThreadLink: () => void;
    handleCopyAsMarkdown: (type: 'messages_only' | 'all') => void;
    handleDeleteThread: () => void;
    setShowMergeThreadsModal: (show: boolean) => void;
    setShowLockThreadModal: (show: boolean) => void;
    handlePostReply: (
        e?: React.FormEvent,
        attachmentsFiles?: File[],
        status?: string,
    ) => void;
    formatRelativeTime: (dateStr: string) => string;
}

export function ThreadTimelineComposer({
    selectedThread,
    pendingAiDraft,
    timelineFilter,
    setTimelineFilter,
    isThreadLocked,
    showSidebar,
    setShowSidebar,
    displayedTimelineEntries,
    retryPendingEntry,
    dismissPendingEntry,
    showReplyBox,
    setShowReplyBox,
    isInternal,
    setIsInternal,
    replyBody,
    setReplyBody,
    handleCopyThreadReference,
    handleCopyThreadId,
    handleCopyThreadLink,
    handleCopyAsMarkdown,
    handleDeleteThread,
    setShowMergeThreadsModal,
    setShowLockThreadModal,
    handlePostReply,
    formatRelativeTime,
}: ThreadTimelineComposerProps) {
    const [historyNoteEntry, setHistoryNoteEntry] =
        React.useState<TimelineEntry | null>(null);

    const lastThreadIdRef = React.useRef<string | null>(null);
    const lastDraftIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        const threadChanged = selectedThread?.id !== lastThreadIdRef.current;
        const draftChanged = pendingAiDraft?.id !== lastDraftIdRef.current;

        if (threadChanged || draftChanged) {
            lastThreadIdRef.current = selectedThread?.id || null;
            lastDraftIdRef.current = pendingAiDraft?.id || null;

            if (pendingAiDraft) {
                if (threadChanged || !replyBody) {
                    setReplyBody(pendingAiDraft.generated_reply);
                    setShowReplyBox(true);
                    setIsInternal(false);
                }
            } else if (threadChanged) {
                setReplyBody('');
                setShowReplyBox(false);
            }
        }
    }, [
        selectedThread,
        pendingAiDraft,
        replyBody,
        setReplyBody,
        setShowReplyBox,
        setIsInternal,
    ]);

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!selectedThread || showReplyBox || isThreadLocked) {
                return;
            }

            const target = e.target as HTMLElement | null;
            const isTyping =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);

            if (isTyping || e.metaKey || e.ctrlKey || e.altKey) {
                return;
            }

            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                setIsInternal(false);
                setShowReplyBox(true);
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                setIsInternal(true);
                setShowReplyBox(true);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        selectedThread,
        showReplyBox,
        isThreadLocked,
        setIsInternal,
        setShowReplyBox,
    ]);

    return (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background text-foreground">
            {selectedThread ? (
                <>
                    <ThreadTimelineHeader
                        selectedThread={selectedThread}
                        timelineFilter={timelineFilter}
                        setTimelineFilter={setTimelineFilter}
                        isThreadLocked={isThreadLocked}
                        showSidebar={showSidebar}
                        setShowSidebar={setShowSidebar}
                        handleCopyThreadReference={handleCopyThreadReference}
                        handleCopyThreadId={handleCopyThreadId}
                        handleCopyThreadLink={handleCopyThreadLink}
                        handleCopyAsMarkdown={handleCopyAsMarkdown}
                        handleDeleteThread={handleDeleteThread}
                        setShowMergeThreadsModal={setShowMergeThreadsModal}
                        setShowLockThreadModal={setShowLockThreadModal}
                        formatRelativeTime={formatRelativeTime}
                    />

                    <ThreadTimelineEntries
                        selectedThread={selectedThread}
                        displayedTimelineEntries={displayedTimelineEntries}
                        formatRelativeTime={formatRelativeTime}
                        onViewHistory={setHistoryNoteEntry}
                        retryPendingEntry={retryPendingEntry}
                        dismissPendingEntry={dismissPendingEntry}
                    />

                    {selectedThread.ai_handoff_at && (
                        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                            <UserRound className="size-3.5 shrink-0" />
                            <span>
                                Inbi handed this conversation off to your team —
                                it will stay quiet here until an agent replies.
                            </span>
                        </div>
                    )}

                    {pendingAiDraft && !showReplyBox && (
                        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                                <Sparkles className="size-3.5 shrink-0 animate-pulse" />
                                <span>Inbi AI generated a draft reply.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setReplyBody(
                                            pendingAiDraft.generated_reply,
                                        );
                                        setShowReplyBox(true);
                                        setIsInternal(false);
                                    }}
                                    className="h-7 text-[11px] font-medium"
                                >
                                    Review Draft
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        router.post(
                                            `/ai/activity/${pendingAiDraft.id}/reject`,
                                            {},
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => {
                                                    toast.success(
                                                        'AI Draft discarded.',
                                                    );
                                                },
                                            },
                                        );
                                    }}
                                    className="h-7 text-[11px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    Discard
                                </Button>
                            </div>
                        </div>
                    )}

                    <ThreadReplyComposer
                        selectedThread={selectedThread}
                        isThreadLocked={isThreadLocked}
                        showReplyBox={showReplyBox}
                        setShowReplyBox={setShowReplyBox}
                        isInternal={isInternal}
                        setIsInternal={setIsInternal}
                        replyBody={replyBody}
                        setReplyBody={setReplyBody}
                        handleCopyAsMarkdown={handleCopyAsMarkdown}
                        handlePostReply={handlePostReply}
                        pendingAiDraft={pendingAiDraft}
                    />
                </>
            ) : (
                <Empty className="m-4 border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircle />
                        </EmptyMedia>
                        <EmptyTitle>No thread selected</EmptyTitle>
                        <EmptyDescription>
                            Select a thread from the inbox to view its
                            conversation history.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            {/* Note Edit History Modal */}
            <Dialog
                open={!!historyNoteEntry}
                onOpenChange={(open) => !open && setHistoryNoteEntry(null)}
            >
                <DialogContent className="max-w-lg overflow-hidden rounded-xl border-border bg-background p-0 text-foreground">
                    <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-card/50 p-4">
                        <DialogTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <History className="h-4 w-4 text-warning" />
                            <span>Internal Note Edit History</span>
                        </DialogTitle>
                        <X
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setHistoryNoteEntry(null)}
                        />
                    </DialogHeader>

                    <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                        {/* Current Version */}
                        <div className="space-y-1 rounded-lg border border-warning/30 bg-card p-3">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[10px] font-bold tracking-wider text-warning uppercase">
                                    Current Version
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {historyNoteEntry?.metadata?.last_edited_at
                                        ? formatRelativeTime(
                                              historyNoteEntry.metadata
                                                  .last_edited_at,
                                          )
                                        : formatRelativeTime(
                                              historyNoteEntry?.created_at ||
                                                  '',
                                          )}
                                </span>
                            </div>
                            <div className="pt-1 font-sans text-xs text-foreground">
                                <MarkdownBody
                                    text={historyNoteEntry?.body || ''}
                                />
                            </div>
                        </div>

                        {/* Past Versions Timeline */}
                        {historyNoteEntry?.metadata?.edit_history &&
                        Array.isArray(historyNoteEntry.metadata.edit_history) &&
                        historyNoteEntry.metadata.edit_history.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                <span className="block text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                                    Previous Versions (
                                    {
                                        historyNoteEntry.metadata.edit_history
                                            .length
                                    }
                                    )
                                </span>

                                <div className="space-y-2">
                                    {historyNoteEntry.metadata.edit_history
                                        .slice()
                                        .reverse()
                                        .map((hist: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="space-y-1.5 rounded-lg border border-border bg-card/50 p-3 font-sans"
                                            >
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span className="font-semibold text-foreground">
                                                        Edited by{' '}
                                                        {hist.edited_by_name ||
                                                            'Agent'}
                                                    </span>
                                                    <span className="font-mono text-[10px]">
                                                        {formatRelativeTime(
                                                            hist.edited_at,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="rounded border border-border/60 bg-background/80 p-2 text-xs text-muted-foreground">
                                                    <MarkdownBody
                                                        text={hist.body || ''}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                No previous versions recorded for this note.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
