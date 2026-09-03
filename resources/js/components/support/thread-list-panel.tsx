import {
    Building2,
    CheckSquare,
    Clock,
    Code2,
    Eye,
    EyeOff,
    HelpCircle,
    MessageCircle,
    Monitor,
    MessagesSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CHANNEL_ICONS } from '@/lib/channel-icons';
import { getThreadStatusOption } from '@/lib/thread-status';
import { cn } from '@/lib/utils';
import type { SupportThread } from '@/types/support';

interface ThreadListPanelProps {
    threads: SupportThread[];
    selectedThread: SupportThread | null;
    visibleProperties: Record<string, boolean>;
    propertyToggleItems: Array<{ key: string; label: string }>;
    toggleProperty: (key: string) => void;
    handleSelectThread: (id: string) => void;
    formatRelativeTime: (dateStr: string) => string;
}

export function ThreadListPanel({
    threads,
    selectedThread,
    visibleProperties,
    propertyToggleItems,
    toggleProperty,
    handleSelectThread,
    formatRelativeTime,
}: ThreadListPanelProps) {
    return (
        <aside className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden border-b bg-background text-foreground lg:w-80 lg:border-r lg:border-b-0">
            <header className="flex items-center justify-between gap-3 border-b p-3">
                <div className="min-w-0">
                    <h2 className="font-semibold">Threads</h2>
                    <p className="truncate text-xs text-muted-foreground">
                        {threads.length} conversations
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Monitor data-icon="inline-start" />
                            Display
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            Visible properties
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {propertyToggleItems.map((property) => {
                                const isVisible =
                                    visibleProperties[property.key];

                                return (
                                    <DropdownMenuItem
                                        key={property.key}
                                        onClick={() =>
                                            toggleProperty(property.key)
                                        }
                                    >
                                        <span className="flex-1">
                                            {property.label}
                                        </span>
                                        {isVisible ? <Eye /> : <EyeOff />}
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <div className="flex cd-scroll min-h-0 flex-1 flex-col overflow-y-auto">
                {threads.map((thread) => {
                    const isSelected = selectedThread?.id === thread.id;
                    const organization =
                        thread.tenant?.company?.name ||
                        thread.tenant?.name ||
                        'Anonymous customer';

                    return (
                        <button
                            key={thread.id}
                            type="button"
                            onClick={() => handleSelectThread(thread.id)}
                            className={cn(
                                'flex w-full flex-col gap-2 border-b p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
                                isSelected && 'bg-muted',
                            )}
                            aria-current={isSelected ? 'true' : undefined}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Avatar className="size-7 rounded-md">
                                        <AvatarFallback className="rounded-md">
                                            {organization
                                                .charAt(0)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-xs font-medium">
                                        {organization}
                                    </span>
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
                                                    <TooltipTrigger asChild>
                                                        <span className="shrink-0 cursor-help">
                                                            <StatusIcon
                                                                className={`size-3.5 ${statusOption.color}`}
                                                            />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {statusOption.label}
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })()}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-medium">
                                    {visibleProperties.ref &&
                                    thread.sequence_number
                                        ? `T-${thread.sequence_number} · `
                                        : ''}
                                    {thread.title}
                                </h3>
                                {visibleProperties.previewText && (
                                    <p className="truncate text-xs text-muted-foreground">
                                        {thread.title || 'No preview available'}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {visibleProperties.company && (
                                    <Badge variant="outline">
                                        <Building2 />
                                        {organization}
                                    </Badge>
                                )}
                                {visibleProperties.tier && thread.tier && (
                                    <Badge variant="secondary">
                                        {thread.tier.name}
                                    </Badge>
                                )}
                                {visibleProperties.labels &&
                                    thread.labels?.map((label) => (
                                        <Badge key={label.id} variant="outline">
                                            {label.name.includes('Question') ? (
                                                <HelpCircle />
                                            ) : (
                                                <Code2 />
                                            )}
                                            {label.name}
                                        </Badge>
                                    ))}
                                {visibleProperties.tasks &&
                                    thread.tasks?.map((task) => (
                                        <Badge key={task.id} variant="outline">
                                            <CheckSquare />
                                            {task.title}
                                        </Badge>
                                    ))}
                            </div>
                            <footer className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className="capitalize">
                                    {thread.priority || 'Normal'} priority
                                </span>
                                <div className="flex items-center gap-2">
                                    {visibleProperties.channel &&
                                        thread.channel?.type &&
                                        (() => {
                                            const ChannelIcon =
                                                CHANNEL_ICONS[
                                                    thread.channel.type
                                                ] || MessageCircle;

                                            return (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">
                                                            <ChannelIcon className="size-3" />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {thread.channel!.name ||
                                                            thread.channel!
                                                                .type}
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })()}
                                    {visibleProperties.lastUpdated && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {formatRelativeTime(
                                                thread.updated_at,
                                            )}
                                        </span>
                                    )}
                                </div>
                            </footer>
                        </button>
                    );
                })}
                {threads.length === 0 && (
                    <Empty className="min-h-64 border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <MessagesSquare />
                            </EmptyMedia>
                            <EmptyTitle>No threads found</EmptyTitle>
                            <EmptyDescription>
                                Try changing the current filters or view.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </aside>
    );
}
