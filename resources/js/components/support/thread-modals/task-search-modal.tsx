import { CheckSquare, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface TaskSearchModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    setShowCreateTaskModal: (show: boolean) => void;
    taskSearchQuery: string;
    setTaskSearchQuery: (query: string) => void;
    filteredLinkableTasks: Array<{ id: string; title: string; status: string }>;
    handleLinkTask: (taskId: string) => void;
}

export function TaskSearchModal({
    show,
    setShow,
    setShowCreateTaskModal,
    taskSearchQuery,
    setTaskSearchQuery,
    filteredLinkableTasks,
    handleLinkTask,
}: TaskSearchModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md overflow-hidden border-border bg-background p-0 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border p-4">
                    <DialogTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <CheckSquare className="h-4 w-4 text-success" />
                        <span>Link task</span>
                    </DialogTitle>
                    <span className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        esc
                    </span>
                </DialogHeader>

                <div className="flex items-center gap-2 border-b border-border bg-card p-3">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="Search for a task"
                        className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        autoFocus
                    />
                </div>

                <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                    <div
                        onClick={() => {
                            setShow(false);
                            setShowCreateTaskModal(true);
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs font-semibold text-success hover:bg-muted"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Create new task</span>
                    </div>

                    {filteredLinkableTasks.map((tsk) => (
                        <div
                            key={tsk.id}
                            onClick={() => handleLinkTask(tsk.id)}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-colors hover:bg-card"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <CheckSquare className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                                <span className="truncate text-foreground">
                                    {tsk.title}
                                </span>
                            </div>
                            <Badge variant="secondary" className="capitalize">
                                {tsk.status}
                            </Badge>
                        </div>
                    ))}

                    {filteredLinkableTasks.length === 0 && (
                        <Empty className="border-0 p-6">
                            <EmptyHeader>
                                <EmptyTitle className="text-sm">
                                    No tasks found
                                </EmptyTitle>
                                <EmptyDescription>
                                    Create a task or change the search query.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
