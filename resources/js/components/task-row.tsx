import { router, usePage } from '@inertiajs/react';
import {
    Building2,
    Link as LinkIcon,
    MoreHorizontal,
    Trash2,
    User,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import { Assignee } from '@/components/assignee';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface TaskRowMember {
    id: number;
    name: string;
    email: string;
}
export interface TaskRowCompany {
    id: string;
    name: string;
    slug: string;
}
export interface TaskRowData {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'done';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    assigned_to: number | null;
    company_id: string | null;
    tenant_id: string | null;
    thread_id: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    assignee?: TaskRowMember | null;
    company?: TaskRowCompany | null;
    tenant?: { id: string; name: string } | null;
    thread?: { id: string; title: string } | null;
}

interface TaskRowProps {
    task: TaskRowData;
    isSelected?: boolean;
    onClick?: () => void;
    onToggleStatus: (event: MouseEvent, task: TaskRowData) => void;
    onCopyLink: (task: TaskRowData) => void;
    onDelete: (task: TaskRowData) => void;
    showCompanyPill?: boolean;
}

export default function TaskRow({
    task,
    isSelected = false,
    onClick,
    onToggleStatus,
    onCopyLink,
    onDelete,
    showCompanyPill = true,
}: TaskRowProps) {
    const displayId = `TASK-${task.id.slice(0, 4).toUpperCase()}`;
    const currentUserId = usePage().props.auth.user?.id ?? null;

    return (
        <div
            onClick={onClick}
            className={cn(
                'group flex flex-col justify-between gap-3 border-b p-3 transition-colors sm:flex-row sm:items-center',
                onClick && 'cursor-pointer hover:bg-muted/50',
                isSelected && 'bg-muted',
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <Checkbox
                    checked={task.status === 'done'}
                    aria-label={`Mark ${task.title} as ${task.status === 'done' ? 'open' : 'done'}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleStatus(event, task);
                    }}
                />
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {displayId}
                </span>
                <span
                    className={cn(
                        'truncate text-sm font-medium',
                        task.status === 'done' &&
                            'text-muted-foreground line-through',
                    )}
                >
                    {task.title}
                </span>
            </div>
            <div className="flex items-center justify-end gap-2">
                {showCompanyPill && task.company && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                            event.stopPropagation();

                            router.get(`/companies/${task.company?.slug}`);
                        }}
                    >
                        <Building2 data-icon="inline-start" />
                        {task.company.name}
                    </Button>
                )}
                {task.assignee ? (
                    <Assignee
                        assignee={task.assignee}
                        currentUserId={currentUserId}
                        compact
                    />
                ) : (
                    <Avatar className="size-7">
                        <AvatarFallback>
                            <User />
                        </AvatarFallback>
                    </Avatar>
                )}
                <Badge
                    variant={task.status === 'done' ? 'secondary' : 'outline'}
                >
                    {task.status === 'done' ? 'Done' : 'Open'}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        asChild
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${task.title}`}
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onCopyLink(task)}>
                                <LinkIcon />
                                Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDelete(task)}
                            >
                                <Trash2 />
                                Delete task
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
