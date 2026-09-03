import { router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronDown,
    MessageCircle,
    Copy,
    Link2,
    FileText,
    SlidersHorizontal,
    MoreHorizontal,
    GitMerge,
    Lock,
    Trash2,
    PanelRightClose,
    PanelRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SupportThread } from '@/types/support';

interface ThreadTimelineHeaderProps {
    selectedThread: SupportThread;
    timelineFilter: 'all' | 'messages_only';
    setTimelineFilter: (filter: 'all' | 'messages_only') => void;
    isThreadLocked: boolean;
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    handleCopyThreadReference: () => void;
    handleCopyThreadId: () => void;
    handleCopyThreadLink: () => void;
    handleCopyAsMarkdown: (type: 'messages_only' | 'all') => void;
    handleDeleteThread: () => void;
    setShowMergeThreadsModal: (show: boolean) => void;
    setShowLockThreadModal: (show: boolean) => void;
    formatRelativeTime: (dateStr: string) => string;
}

export function ThreadTimelineHeader({
    selectedThread,
    timelineFilter,
    setTimelineFilter,
    isThreadLocked,
    showSidebar,
    setShowSidebar,
    handleCopyThreadReference,
    handleCopyThreadId,
    handleCopyThreadLink,
    handleCopyAsMarkdown,
    handleDeleteThread,
    setShowMergeThreadsModal,
    setShowLockThreadModal,
    formatRelativeTime,
}: ThreadTimelineHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-border bg-background p-3.5">
            <div className="flex items-center gap-2.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                router.get(
                                    window.location.pathname,
                                    {},
                                    { preserveState: true },
                                )
                            }
                            className="flex cursor-pointer items-center gap-1 rounded border border-border bg-card p-1 text-[11px] text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                        >
                            <ChevronLeft data-icon="inline-start" />
                            <span className="font-semibold">Back</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Close thread view and back to threads list
                    </TooltipContent>
                </Tooltip>

                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
                    <MessageCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                    <h2 className="text-xs leading-none font-bold text-foreground">
                        {selectedThread.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0"
                                >
                                    <span>
                                        T-{selectedThread.sequence_number || 1}
                                    </span>
                                    <ChevronDown data-icon="inline-end" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48 space-y-1 border-border bg-background p-1.5 text-foreground">
                                <DropdownMenuItem
                                    onClick={handleCopyThreadReference}
                                    className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold hover:bg-card"
                                >
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copy thread reference</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleCopyThreadId}
                                    className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold hover:bg-card"
                                >
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copy thread ID</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleCopyThreadLink}
                                    className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold hover:bg-card"
                                >
                                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copy thread link</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <span>•</span>
                        <span className="flex items-center gap-1">💬 Chat</span>
                        <span>
                            {formatRelativeTime(selectedThread.updated_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-2">
                <ToggleGroup
                    type="single"
                    value={timelineFilter}
                    onValueChange={(value) =>
                        value &&
                        setTimelineFilter(value as 'all' | 'messages_only')
                    }
                    variant="outline"
                    size="sm"
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem
                                value="messages_only"
                                aria-label="Messages and notes only"
                            >
                                <FileText />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Messages and notes only</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem
                                value="all"
                                aria-label="Full timeline"
                            >
                                <SlidersHorizontal />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Full timeline</TooltipContent>
                    </Tooltip>
                </ToggleGroup>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label="Thread actions"
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-52 space-y-1 border-border bg-background p-1.5 text-foreground">
                        <DropdownMenuItem
                            onClick={() => setShowMergeThreadsModal(true)}
                            className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold hover:bg-card"
                        >
                            <GitMerge className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Merge threads</span>
                        </DropdownMenuItem>

                        {!isThreadLocked && (
                            <DropdownMenuItem
                                onClick={() => setShowLockThreadModal(true)}
                                className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold hover:bg-card"
                            >
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Lock thread</span>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex cursor-pointer items-center justify-between rounded p-2 text-xs hover:bg-card">
                                <div className="flex items-center gap-2">
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copy as markdown</span>
                                </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-56 space-y-1 border-border bg-background p-1.5 text-foreground">
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleCopyAsMarkdown(
                                                'messages_only',
                                            )
                                        }
                                        className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs hover:bg-card"
                                    >
                                        <span>Messages only</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleCopyAsMarkdown('all')
                                        }
                                        className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs hover:bg-card"
                                    >
                                        <span>
                                            Messages and timeline entries
                                        </span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <Separator />

                        <DropdownMenuItem
                            onClick={handleDeleteThread}
                            className="flex cursor-pointer items-center gap-2 rounded p-2 text-xs font-semibold text-destructive hover:bg-card"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            <span>Delete thread</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    variant={showSidebar ? 'secondary' : 'outline'}
                    size="icon"
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`cursor-pointer rounded-lg border border-border p-1.5 transition-colors ${
                        showSidebar
                            ? 'bg-card text-foreground'
                            : 'bg-card/50 text-muted-foreground hover:text-foreground'
                    }`}
                    title={
                        showSidebar
                            ? 'Hide details sidebar'
                            : 'Show details sidebar'
                    }
                >
                    {showSidebar ? <PanelRightClose /> : <PanelRight />}
                </Button>
            </div>
        </div>
    );
}
