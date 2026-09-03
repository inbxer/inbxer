import {
    Bell,
    CheckSquare,
    FileText,
    GitBranch,
    Globe,
    Lock,
    Slack,
    Sparkles,
    Tag,
    Tags,
    UserMinus,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DragEvent } from 'react';
import type { InsertionPoint, OptionItem } from './types';

const ACTION_ICONS: Record<string, LucideIcon> = {
    apply_labels: Tag,
    remove_labels: Tags,
    assign_to_user: UserPlus,
    unassign_thread: UserMinus,
    set_priority: Bell,
    set_status: CheckSquare,
    set_tier: Tag,
    add_note: FileText,
    lock_thread: Lock,
    assign_to_ai: Sparkles,
    send_slack_notification: Slack,
    send_http_request: Globe,
};

/** MIME type used to carry a block definition through native HTML5 drag-and-drop. */
export const BLOCK_DRAG_MIME = 'application/x-workflow-block';

export type DraggedBlock =
    { kind: 'condition' } | { kind: 'action'; actionType: string };

interface AddBlockPanelProps {
    insertionPoint: InsertionPoint | null;
    actionOptions: OptionItem[];
    onAddCondition: (point: InsertionPoint) => void;
    onAddAction: (point: InsertionPoint, actionType: string) => void;
    onClose: () => void;
}

export function AddBlockPanel({
    insertionPoint,
    actionOptions,
    onAddCondition,
    onAddAction,
    onClose,
}: AddBlockPanelProps) {
    const startDrag = (e: DragEvent, block: DraggedBlock) => {
        e.dataTransfer.setData(BLOCK_DRAG_MIME, JSON.stringify(block));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="flex h-full w-80 flex-col border-l border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-3">
                <div>
                    <h3 className="text-sm font-semibold">Add block</h3>
                    <p className="text-[11px] text-muted-foreground">
                        Drag onto the canvas, or click to insert here.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Close
                </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-3">
                <div>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Logic
                    </p>
                    <button
                        type="button"
                        draggable
                        onDragStart={(e) => startDrag(e, { kind: 'condition' })}
                        onClick={() =>
                            insertionPoint && onAddCondition(insertionPoint)
                        }
                        className="flex w-full cursor-grab items-center gap-2 rounded-md border border-border p-2.5 text-left text-xs font-medium transition-colors hover:bg-muted active:cursor-grabbing"
                    >
                        <div className="flex size-6 items-center justify-center rounded bg-warning/20 text-warning">
                            <GitBranch className="size-3.5" />
                        </div>
                        If/else
                    </button>
                </div>

                <div>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Action
                    </p>
                    <div className="space-y-1">
                        {actionOptions.map((option) => {
                            const Icon =
                                ACTION_ICONS[option.value] ?? CheckSquare;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    draggable
                                    onDragStart={(e) =>
                                        startDrag(e, {
                                            kind: 'action',
                                            actionType: option.value,
                                        })
                                    }
                                    onClick={() =>
                                        insertionPoint &&
                                        onAddAction(
                                            insertionPoint,
                                            option.value,
                                        )
                                    }
                                    className="flex w-full cursor-grab items-center gap-2 rounded-md border border-border p-2.5 text-left text-xs font-medium transition-colors hover:bg-muted active:cursor-grabbing"
                                >
                                    <div className="flex size-6 items-center justify-center rounded bg-primary/20 text-primary">
                                        <Icon className="size-3.5" />
                                    </div>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
