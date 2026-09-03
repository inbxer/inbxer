import { Building2, CircleDot, Square, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CompanyDetails, SupportThread } from '@/types/support';

interface CreateTaskModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    newTaskTitle: string;
    setNewTaskTitle: (title: string) => void;
    newTaskDescription: string;
    setNewTaskDescription: (desc: string) => void;
    currentUser: { id: number; name: string } | null;
    company?: CompanyDetails | null;
    selectedThread: SupportThread | null;
    handleCreateAndLinkTask: (e: React.FormEvent) => void;
}

export function CreateTaskModal({
    show,
    setShow,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDescription,
    setNewTaskDescription,
    currentUser,
    company,
    selectedThread,
    handleCreateAndLinkTask,
}: CreateTaskModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-lg space-y-4 rounded-2xl border-border bg-background p-5 text-foreground shadow-2xl">
                <form onSubmit={handleCreateAndLinkTask} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 items-center gap-2">
                            <Square className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <Input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) =>
                                    setNewTaskTitle(e.target.value)
                                }
                                placeholder="Task title"
                                className="w-full bg-transparent text-sm font-semibold text-foreground placeholder-muted-foreground focus:outline-none"
                                autoFocus
                            />
                        </div>
                        <X
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setShow(false)}
                        />
                    </div>

                    <div className="pl-6">
                        <Textarea
                            value={newTaskDescription}
                            onChange={(e) =>
                                setNewTaskDescription(e.target.value)
                            }
                            placeholder="Add optional description"
                            className="h-16 w-full resize-none bg-transparent text-xs text-muted-foreground placeholder-muted-foreground/60 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground">
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                                <span>Assigned to me</span>
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5 text-success" />
                                <span>{company?.name || 'Acme'}</span>
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-primary">
                                <CircleDot className="h-3.5 w-3.5 text-primary" />
                                <span>
                                    T-{selectedThread?.sequence_number || 1}{' '}
                                    {selectedThread?.title}
                                </span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShow(false)}
                                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                                <span>Cancel</span>
                                <span className="py-0.2 rounded border border-border bg-card px-1 font-mono text-[10px] text-muted-foreground">
                                    esc
                                </span>
                            </Button>

                            <Button
                                type="submit"
                                disabled={!newTaskTitle.trim()}
                                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:opacity-90"
                            >
                                <span>Create</span>
                                <span className="py-0.2 rounded border border-border bg-card px-1 font-mono text-[10px] text-primary-foreground">
                                    Ctrl ↵
                                </span>
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
