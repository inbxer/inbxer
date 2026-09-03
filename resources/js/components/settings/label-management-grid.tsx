import {
    GripVertical,
    Users,
    HelpCircle,
    MessageCircle,
    Code2,
    CreditCard,
    Bug,
    Tag,
    Trash2,
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LabelItemData {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    is_team?: boolean;
    ai_description?: string;
    threads_count?: number;
}

interface LabelManagementGridProps {
    lbl: LabelItemData;
    idx: number;
    isBeingDragged: boolean;
    isDragOver: boolean;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onEdit: (lbl: LabelItemData) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function LabelManagementGrid({
    lbl,
    idx,
    isBeingDragged,
    isDragOver,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onEdit,
    onDelete,
}: LabelManagementGridProps) {
    const LabelIcon =
        lbl.icon === 'users' || lbl.is_team
            ? Users
            : lbl.icon === 'help-circle' || lbl.name.includes('Question')
              ? HelpCircle
              : lbl.icon === 'message-circle' || lbl.name.includes('Feedback')
                ? MessageCircle
                : lbl.icon === 'code-2' || lbl.name.includes('Account')
                  ? Code2
                  : lbl.icon === 'credit-card' || lbl.name.includes('Billing')
                    ? CreditCard
                    : lbl.icon === 'bug' || lbl.name.includes('Bug')
                      ? Bug
                      : Tag;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            onClick={() => onEdit(lbl)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    onEdit(lbl);
                }
            }}
            role="button"
            tabIndex={0}
            className={cn(
                'group flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50',
                isBeingDragged && 'border-dashed opacity-40',
                isDragOver && 'ring-2 ring-ring',
            )}
        >
            <div className="flex items-center gap-3">
                <div className="cursor-grab text-muted-foreground active:cursor-grabbing">
                    <GripVertical className="size-4" />
                </div>
                <LabelIcon className="size-4 text-muted-foreground" />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lbl.name}</span>
                    {(lbl.is_team || lbl.icon === 'users') && (
                        <Badge variant="secondary">Team</Badge>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Badge variant="outline">
                    {lbl.threads_count ?? 0} threads
                </Badge>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${lbl.name}`}
                    onClick={(event) => onDelete(lbl.id, event)}
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
}
