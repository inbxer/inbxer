import {
    Check,
    Clock,
    Inbox,
    ListFilter,
    MessageCircle,
    Search,
    SlidersHorizontal,
    UserX,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { Assignee } from '@/components/assignee';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CHANNEL_ICONS } from '@/lib/channel-icons';
import { getThreadStatusOption } from '@/lib/thread-status';
import type { SupportThread } from '@/types/support';

interface TeamMember {
    id: number;
    name: string;
    email: string;
}

interface ThreadTableViewProps {
    groupedThreadsMap: Record<string, SupportThread[]>;
    groupBy: string;
    visibleProperties: Record<string, boolean>;
    handleSelectThread: (id: string) => void;
    formatRelativeTime: (dateString?: string) => string;
    sortedThreads: SupportThread[];
    filter: string;
    filterTitle: string;
    currentUser?: { id: number; name: string };
    teamMembers?: TeamMember[];
    onAssignThread?: (threadId: string, userId: number | null) => void;
}

function AssigneePicker({
    thread,
    currentUser,
    teamMembers,
    onAssignThread,
}: {
    thread: SupportThread;
    currentUser?: { id: number; name: string };
    teamMembers: TeamMember[];
    onAssignThread: (threadId: string, userId: number | null) => void;
}) {
    const [query, setQuery] = useState('');
    const filtered = teamMembers.filter((m) =>
        m.name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={
                        thread.assignee
                            ? thread.assignee.name
                            : 'Unassigned — click to assign'
                    }
                >
                    {thread.assignee ? (
                        <Assignee
                            assignee={thread.assignee}
                            currentUserId={currentUser?.id}
                            compact
                        />
                    ) : (
                        <Avatar className="size-6 border">
                            <AvatarFallback className="text-[10px] font-semibold uppercase">
                                U
                            </AvatarFallback>
                        </Avatar>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-56 p-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b px-2 py-1.5">
                    <Search className="size-3.5 text-muted-foreground" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Search"
                        className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <DropdownMenuItem
                    onClick={() => onAssignThread(thread.id, null)}
                    className="gap-2 text-muted-foreground"
                >
                    <UserX className="size-3.5" />
                    Unassign all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {filtered.map((member) => {
                    const isAssigned = thread.assigned_to === member.id;

                    return (
                        <DropdownMenuItem
                            key={member.id}
                            onClick={() => onAssignThread(thread.id, member.id)}
                            className="gap-2"
                        >
                            <Assignee
                                assignee={member}
                                currentUserId={currentUser?.id}
                                compact
                                size="sm"
                            />
                            <span className="flex-1 truncate">
                                {member.name}
                                {currentUser?.id === member.id ? ' (me)' : ''}
                            </span>
                            {isAssigned && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        No matches
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function ThreadTableView({
    groupedThreadsMap,
    groupBy,
    visibleProperties,
    handleSelectThread,
    formatRelativeTime,
    sortedThreads,
    filter,
    filterTitle,
    currentUser,
    teamMembers = [],
    onAssignThread,
}: ThreadTableViewProps) {
    const openThread = (
        event: KeyboardEvent<HTMLTableRowElement>,
        threadId: string,
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelectThread(threadId);
        }
    };

    if (sortedThreads.length === 0) {
        return (
            <Empty className="m-4 min-h-72 border">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Inbox />
                    </EmptyMedia>
                    <EmptyTitle>No threads found</EmptyTitle>
                    <EmptyDescription>
                        There are no threads in {filterTitle || filter} yet.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto">
            {Object.entries(groupedThreadsMap).map(
                ([groupTitle, groupThreads]) => (
                    <section
                        key={groupTitle}
                        aria-labelledby={`thread-group-${groupTitle}`}
                    >
                        {groupBy !== 'none' && (
                            <div className="sticky top-0 z-10 flex items-center justify-between border-y bg-muted/95 px-4 py-2 backdrop-blur">
                                <div className="flex items-center gap-2">
                                    <ListFilter
                                        className="size-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <h3
                                        id={`thread-group-${groupTitle}`}
                                        className="text-xs font-semibold tracking-wide uppercase"
                                    >
                                        {groupTitle}
                                    </h3>
                                </div>
                                <Badge variant="secondary">
                                    {groupThreads.length}
                                </Badge>
                            </div>
                        )}

                        <Table>
                            <TableBody>
                                {groupThreads.map((thread) => (
                                    <TableRow
                                        key={thread.id}
                                        tabIndex={0}
                                        className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
                                        onClick={() =>
                                            handleSelectThread(thread.id)
                                        }
                                        onKeyDown={(event) =>
                                            openThread(event, thread.id)
                                        }
                                        aria-label={`Open thread ${thread.title}`}
                                    >
                                        <TableCell className="w-full px-4 py-3">
                                            <div className="flex min-w-64 items-center gap-3">
                                                {visibleProperties.status &&
                                                    (() => {
                                                        const statusOption =
                                                            getThreadStatusOption(
                                                                thread.status,
                                                            );
                                                        const StatusIcon =
                                                            statusOption.icon;

                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <span className="cursor-help">
                                                                        <StatusIcon
                                                                            className={`size-3.5 shrink-0 ${statusOption.color}`}
                                                                        />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {
                                                                        statusOption.label
                                                                    }
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                                {visibleProperties.customer && (
                                                    <Avatar className="size-7 border">
                                                        <AvatarFallback className="text-xs font-semibold uppercase">
                                                            {thread.tenant?.name?.charAt(
                                                                0,
                                                            ) || 'A'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {visibleProperties.company && (
                                                            <span className="truncate text-sm font-medium">
                                                                {thread.tenant
                                                                    ?.company
                                                                    ?.name ||
                                                                    thread
                                                                        .tenant
                                                                        ?.name ||
                                                                    'Anonymous customer'}
                                                            </span>
                                                        )}
                                                        {visibleProperties.ref &&
                                                            thread.sequence_number && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-mono"
                                                                >
                                                                    T-
                                                                    {
                                                                        thread.sequence_number
                                                                    }
                                                                </Badge>
                                                            )}
                                                    </div>
                                                    {visibleProperties.previewText && (
                                                        <div className="flex min-w-0 items-center gap-2 text-xs">
                                                            <span className="truncate font-medium text-foreground">
                                                                {thread.title}
                                                            </span>
                                                            <span className="hidden truncate text-muted-foreground sm:inline">
                                                                No preview
                                                                available
                                                            </span>
                                                        </div>
                                                    )}
                                                    {visibleProperties.tenant &&
                                                        thread.tenant
                                                            ?.email && (
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {
                                                                    thread
                                                                        .tenant
                                                                        .email
                                                                }
                                                            </p>
                                                        )}
                                                    {visibleProperties.labels &&
                                                        thread.labels &&
                                                        thread.labels.length >
                                                            0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                {thread.labels.map(
                                                                    (label) => (
                                                                        <Badge
                                                                            key={
                                                                                label.id
                                                                            }
                                                                            variant="outline"
                                                                            className="gap-1 font-normal"
                                                                        >
                                                                            <span
                                                                                className="size-1.5 rounded-full"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        label.color ||
                                                                                        undefined,
                                                                                }}
                                                                            />
                                                                            {
                                                                                label.name
                                                                            }
                                                                        </Badge>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-4">
                                                {visibleProperties.sla && (
                                                    <Badge variant="secondary">
                                                        12h SLA
                                                    </Badge>
                                                )}
                                                {visibleProperties.tasks && (
                                                    <Badge variant="outline">
                                                        0 tasks
                                                    </Badge>
                                                )}
                                                {visibleProperties.linkedIssues && (
                                                    <Badge variant="outline">
                                                        0 issues
                                                    </Badge>
                                                )}
                                                {visibleProperties.linkedThreads && (
                                                    <Badge variant="outline">
                                                        0 threads
                                                    </Badge>
                                                )}
                                                {visibleProperties.tier && (
                                                    <Badge variant="secondary">
                                                        {thread.tier?.name ||
                                                            'Free Tier'}
                                                    </Badge>
                                                )}
                                                <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground capitalize">
                                                    <SlidersHorizontal className="size-3.5" />
                                                    {thread.priority ||
                                                        'Normal'}
                                                </span>
                                                {visibleProperties.lastUpdated && (
                                                    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                                                        {visibleProperties.channel &&
                                                            thread.channel
                                                                ?.type &&
                                                            (() => {
                                                                const ChannelIcon =
                                                                    CHANNEL_ICONS[
                                                                        thread
                                                                            .channel
                                                                            .type
                                                                    ] ||
                                                                    MessageCircle;

                                                                return (
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <span className="cursor-help">
                                                                                <ChannelIcon className="size-3.5" />
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            {thread
                                                                                .channel!
                                                                                .name ||
                                                                                thread
                                                                                    .channel!
                                                                                    .type}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                );
                                                            })()}
                                                        <Clock className="size-3.5" />
                                                        {formatRelativeTime(
                                                            thread.updated_at,
                                                        )}
                                                    </span>
                                                )}
                                                {visibleProperties.created &&
                                                    thread.created_at && (
                                                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                                                            {new Date(
                                                                thread.created_at,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                {visibleProperties.assignee &&
                                                    (onAssignThread ? (
                                                        <AssigneePicker
                                                            thread={thread}
                                                            currentUser={
                                                                currentUser
                                                            }
                                                            teamMembers={
                                                                teamMembers
                                                            }
                                                            onAssignThread={
                                                                onAssignThread
                                                            }
                                                        />
                                                    ) : thread.assignee ? (
                                                        <Assignee
                                                            assignee={
                                                                thread.assignee
                                                            }
                                                            currentUserId={
                                                                currentUser?.id
                                                            }
                                                            compact
                                                        />
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Avatar className="size-6 border">
                                                                    <AvatarFallback className="text-[10px] font-semibold uppercase">
                                                                        U
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Unassigned
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </section>
                ),
            )}
        </div>
    );
}
