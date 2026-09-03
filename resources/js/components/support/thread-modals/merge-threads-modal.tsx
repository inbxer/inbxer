import { X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SupportThread } from '@/types/support';

interface MergeThreadsModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    selectedThread: SupportThread | null;
    selectedParentThreadId: string;
    setSelectedParentThreadId: (id: string) => void;
    filteredLinkableThreads: SupportThread[];
    handleMergeThreadsSubmit: (e: React.FormEvent) => void;
}

export function MergeThreadsModal({
    show,
    setShow,
    selectedThread,
    selectedParentThreadId,
    setSelectedParentThreadId,
    filteredLinkableThreads,
    handleMergeThreadsSubmit,
}: MergeThreadsModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md space-y-4 rounded-2xl border-border bg-background p-5 text-foreground shadow-2xl">
                <DialogHeader className="flex flex-row items-start justify-between border-b border-border pb-3">
                    <DialogTitle className="text-sm font-bold text-foreground">
                        Merge threads
                    </DialogTitle>
                    <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <form onSubmit={handleMergeThreadsSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                                Parent
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                stays active
                            </span>
                        </div>

                        <Select
                            value={selectedParentThreadId}
                            onValueChange={(val) =>
                                setSelectedParentThreadId(val)
                            }
                        >
                            <SelectTrigger className="h-9 w-full border border-border bg-card text-xs font-medium text-foreground">
                                <SelectValue placeholder="Select parent thread" />
                            </SelectTrigger>
                            <SelectContent className="max-h-48 border-border bg-background text-foreground">
                                {filteredLinkableThreads.map((t) => (
                                    <SelectItem
                                        key={t.id}
                                        value={t.id}
                                        className="cursor-pointer text-xs"
                                    >
                                        T-{t.sequence_number || 1} {t.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                                Child
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                will be set to ignored
                            </span>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-2.5 font-mono text-xs font-semibold text-primary">
                            T-{selectedThread?.sequence_number || 1}{' '}
                            {selectedThread?.title}
                        </div>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                        <div className="text-[11px] font-semibold text-foreground">
                            What will happen
                        </div>
                        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                            <li>Child thread status will move to ignored</li>
                            <li>
                                New messages will appear in the parent timeline
                            </li>
                            <li>
                                You can reply to child messages directly from
                                the parent thread
                            </li>
                        </ul>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={!selectedParentThreadId}
                            className="h-8 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:opacity-90"
                        >
                            Merge threads
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
