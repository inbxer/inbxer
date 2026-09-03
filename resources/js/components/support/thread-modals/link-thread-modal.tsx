import { Check, MessageCircle, Search } from 'lucide-react';
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
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import type { SupportThread } from '@/types/support';

interface LinkThreadModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    threadSearchQuery: string;
    setThreadSearchQuery: (query: string) => void;
    filteredLinkableThreads: SupportThread[];
    selectedThread: SupportThread | null;
    handleLinkTargetThread: (targetId: string) => void;
    formatRelativeTime: (dateStr: string) => string;
}

export function LinkThreadModal({
    show,
    setShow,
    threadSearchQuery,
    setThreadSearchQuery,
    filteredLinkableThreads,
    selectedThread,
    handleLinkTargetThread,
    formatRelativeTime,
}: LinkThreadModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md overflow-hidden border-border bg-background p-0 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border p-4">
                    <DialogTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span>Link thread</span>
                    </DialogTitle>
                    <span className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        esc
                    </span>
                </DialogHeader>

                <div className="flex items-center gap-2 border-b border-border bg-card p-3">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="text"
                        value={threadSearchQuery}
                        onChange={(e) => setThreadSearchQuery(e.target.value)}
                        placeholder="Search for a thread"
                        className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        autoFocus
                    />
                </div>

                <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                    {filteredLinkableThreads.map((thr) => {
                        const isLinked = selectedThread?.related_threads?.some(
                            (rt) => rt.id === thr.id,
                        );

                        return (
                            <div
                                key={thr.id}
                                onClick={() => handleLinkTargetThread(thr.id)}
                                className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-colors hover:bg-card"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span className="font-mono font-bold text-primary">
                                        {thr.sequence_number
                                            ? `T-${thr.sequence_number}`
                                            : ''}
                                    </span>
                                    <span className="truncate text-foreground">
                                        {thr.title}
                                    </span>
                                </div>
                                {isLinked ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                                        <Check className="h-3 w-3" /> Linked
                                    </span>
                                ) : (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {formatRelativeTime(thr.updated_at)}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {filteredLinkableThreads.length === 0 && (
                        <Empty className="border-0 p-6">
                            <EmptyHeader>
                                <EmptyTitle className="text-sm">
                                    No results
                                </EmptyTitle>
                                <EmptyDescription>
                                    No linkable threads match your search.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
