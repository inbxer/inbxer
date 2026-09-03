import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export type AssigneeStatus = 'online' | 'offline';

export type AssigneeUser = {
    id: number;
    name: string;
    email?: string | null;
    avatar?: string | null;
};

type AssigneeProps = {
    assignee: AssigneeUser;
    /** The logged-in user id. When it matches the assignee, a "ME" badge is shown. */
    currentUserId?: number | null;
    /** Presence status. Defaults to online for the current user, offline otherwise. */
    status?: AssigneeStatus;
    showMe?: boolean;
    showStatusLabel?: boolean;
    /** Render only the avatar + presence dot (no name / ME badge). */
    compact?: boolean;
    /** Avatar size. Defaults to 'md'. */
    size?: 'sm' | 'md';
    className?: string;
};

const statusStyles: Record<AssigneeStatus, string> = {
    online: 'bg-success',
    offline: 'bg-muted-foreground/40',
};

const statusLabels: Record<AssigneeStatus, string> = {
    online: 'Online',
    offline: 'Offline',
};

const avatarSizes: Record<'sm' | 'md', string> = {
    sm: 'size-6',
    md: 'size-7',
};

const dotSizes: Record<'sm' | 'md', string> = {
    sm: 'size-2',
    md: 'size-2.5',
};

export function Assignee({
    assignee,
    currentUserId = null,
    status,
    showMe = true,
    showStatusLabel = false,
    compact = false,
    size = 'md',
    className,
}: AssigneeProps) {
    const getInitials = useInitials();
    const isMe = currentUserId != null && assignee.id === currentUserId;
    const resolvedStatus: AssigneeStatus =
        status ?? (isMe ? 'online' : 'offline');
    const showAvatar = Boolean(assignee.avatar && assignee.avatar !== '');

    if (compact) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            'relative inline-flex shrink-0 cursor-pointer',
                            className,
                        )}
                        aria-label={`${assignee.name} · ${statusLabels[resolvedStatus]}`}
                    >
                        <Avatar className={avatarSizes[size]}>
                            {showAvatar ? (
                                <AvatarImage
                                    src={assignee.avatar as string}
                                    alt={assignee.name}
                                />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                                {getInitials(assignee.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={cn(
                                'absolute -right-0.5 -bottom-0.5 block rounded-full border-2 border-background',
                                dotSizes[size],
                                statusStyles[resolvedStatus],
                            )}
                        />
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {`${assignee.name} · ${statusLabels[resolvedStatus]}`}
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className="relative shrink-0">
                <Avatar className={cn('size-8', size === 'sm' && 'size-6')}>
                    {showAvatar ? (
                        <AvatarImage
                            src={assignee.avatar as string}
                            alt={assignee.name}
                        />
                    ) : null}
                    <AvatarFallback className={cn(size === 'sm' && 'text-xs')}>
                        {getInitials(assignee.name)}
                    </AvatarFallback>
                </Avatar>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            aria-label={statusLabels[resolvedStatus]}
                            className={cn(
                                'absolute -right-0.5 -bottom-0.5 block cursor-pointer rounded-full border-2 border-background',
                                size === 'sm' ? 'size-2' : 'size-2.5',
                                statusStyles[resolvedStatus],
                            )}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        {statusLabels[resolvedStatus]}
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                    {assignee.name}
                </span>
                {isMe && showMe ? (
                    <Badge
                        variant="secondary"
                        className="h-5 shrink-0 px-1.5 text-[10px]"
                    >
                        ME
                    </Badge>
                ) : null}
                {showStatusLabel ? (
                    <span
                        className={cn(
                            'shrink-0 text-xs',
                            resolvedStatus === 'online'
                                ? 'text-success'
                                : 'text-muted-foreground',
                        )}
                    >
                        {statusLabels[resolvedStatus]}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

type AssigneeListProps = {
    assignees: AssigneeUser[];
    currentUserId?: number | null;
    /** Optional per-member presence map (id -> status). */
    statuses?: Record<number, AssigneeStatus>;
    showStatusLabel?: boolean;
    compact?: boolean;
    size?: 'sm' | 'md';
    className?: string;
};

/**
 * Renders a list of assignees with the logged-in user always first and tagged "ME".
 */
export function AssigneeList({
    assignees,
    currentUserId = null,
    statuses = {},
    showStatusLabel = false,
    compact = false,
    size = 'md',
    className,
}: AssigneeListProps) {
    const sorted = [...assignees].sort((a, b) => {
        const aIsMe = a.id === currentUserId;
        const bIsMe = b.id === currentUserId;

        if (aIsMe !== bIsMe) {
            return aIsMe ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {sorted.map((assignee) => (
                <Assignee
                    key={assignee.id}
                    assignee={assignee}
                    currentUserId={currentUserId}
                    status={statuses[assignee.id]}
                    showStatusLabel={showStatusLabel}
                    compact={compact}
                    size={size}
                />
            ))}
        </div>
    );
}

const UNASSIGNED_VALUE = '__unassigned__';

type AssigneeSelectProps = {
    assignees: AssigneeUser[];
    /** Currently selected user id, or null for unassigned. */
    value?: number | null;
    onValueChange: (userId: number | null) => void;
    currentUserId?: number | null;
    /** Optional per-member presence map (id -> status). */
    statuses?: Record<number, AssigneeStatus>;
    /** Label shown when nothing is selected (with a User icon). Defaults to "Unassigned". */
    placeholder?: string;
    /** Trigger size. Defaults to 'sm'. */
    size?: 'sm' | 'default';
    disabled?: boolean;
    triggerClassName?: string;
    contentClassName?: string;
};

/**
 * Full assignee select: shows the selected member as avatar + presence dot + name
 * (with a "ME" badge for the current user) in the trigger, and a User icon +
 * placeholder when nothing is selected. The current user is always listed first.
 */
export function AssigneeSelect({
    assignees,
    value = null,
    onValueChange,
    currentUserId = null,
    statuses = {},
    placeholder = 'Unassigned',
    size = 'sm',
    disabled = false,
    triggerClassName,
    contentClassName,
}: AssigneeSelectProps) {
    const selected =
        value != null
            ? assignees.find((assignee) => assignee.id === value)
            : undefined;

    // Current user first, then alphabetical.
    const sorted = [...assignees].sort((a, b) => {
        const aIsMe = a.id === currentUserId;
        const bIsMe = b.id === currentUserId;

        if (aIsMe !== bIsMe) {
            return aIsMe ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    const unassignedContent = (
        <span className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4 shrink-0" />
            {placeholder}
        </span>
    );

    return (
        <Select
            value={value != null ? String(value) : UNASSIGNED_VALUE}
            onValueChange={(val) =>
                onValueChange(val === UNASSIGNED_VALUE ? null : Number(val))
            }
            disabled={disabled}
        >
            <SelectTrigger
                size={size}
                className={cn(
                    'h-auto w-48 max-w-full overflow-hidden py-1 shadow-none',
                    size === 'sm' ? 'min-h-8 px-2.5' : 'min-h-9 px-3',
                    triggerClassName,
                )}
                aria-label="Select assignee"
            >
                {selected ? (
                    <Assignee
                        assignee={selected}
                        currentUserId={currentUserId}
                        status={statuses[selected.id]}
                        size="sm"
                        className="min-w-0 flex-1 overflow-hidden"
                    />
                ) : (
                    unassignedContent
                )}
            </SelectTrigger>
            <SelectContent
                align="end"
                avoidCollisions
                collisionPadding={12}
                className={cn(
                    'w-64 max-w-[calc(100vw-1.5rem)] min-w-0',
                    contentClassName,
                )}
            >
                <SelectGroup>
                    <SelectLabel>Assignment</SelectLabel>
                    <SelectItem
                        value={UNASSIGNED_VALUE}
                        className="text-muted-foreground"
                    >
                        {unassignedContent}
                    </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Team members</SelectLabel>
                    {sorted.map((member) => (
                        <SelectItem key={member.id} value={String(member.id)}>
                            <Assignee
                                assignee={member}
                                currentUserId={currentUserId}
                                status={statuses[member.id]}
                                className="min-w-0"
                            />
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
