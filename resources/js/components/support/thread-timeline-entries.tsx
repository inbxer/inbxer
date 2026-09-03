import { router } from '@inertiajs/react';
import {
    MessageCircle,
    Copy,
    Link2,
    FileText,
    MoreHorizontal,
    CircleDot,
    User as UserIcon,
    Paperclip,
    Download,
    Pencil,
    Clock,
    Smile,
    Sparkles,
    ExternalLink,
    Search as SearchIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { MarkdownBody } from '@/components/support/markdown-body';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { searchEmoji } from '@/lib/emoji-data';
import type { SupportThread, TimelineEntry } from '@/types/support';

interface ThreadTimelineEntriesProps {
    selectedThread: SupportThread;
    displayedTimelineEntries: TimelineEntry[];
    formatRelativeTime: (dateStr: string) => string;
    onViewHistory: (entry: TimelineEntry) => void;
    retryPendingEntry: (entry: TimelineEntry) => void;
    dismissPendingEntry: (entryId: string) => void;
}

export function ThreadTimelineEntries({
    selectedThread,
    displayedTimelineEntries,
    formatRelativeTime,
    onViewHistory,
    retryPendingEntry,
    dismissPendingEntry,
}: ThreadTimelineEntriesProps) {
    const [editingNoteId, setEditingNoteId] = React.useState<string | null>(
        null,
    );
    const [editingNoteBody, setEditingNoteBody] = React.useState<string>('');
    const [reactionPickerEntryId, setReactionPickerEntryId] = React.useState<
        string | null
    >(null);
    const [emojiSearchQuery, setEmojiSearchQuery] = React.useState('');

    const isSlackThread = selectedThread?.channel?.type === 'slack';

    const isSlackLinkedEntry = (entry: TimelineEntry): boolean =>
        isSlackThread &&
        Boolean(entry.metadata?.slack_channel_id) &&
        Boolean(entry.metadata?.slack_ts);

    const handleCopyMessageText = (entry: TimelineEntry) => {
        navigator.clipboard.writeText(entry.body || '');
        toast.success('Copied message text!');
    };

    const handleCopyEntryLink = (entry: TimelineEntry) => {
        const url = `${window.location.origin}${window.location.pathname}${window.location.search}#entry-${entry.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Copied link to this entry!');
    };

    const handleOpenInSlack = async (entry: TimelineEntry) => {
        if (!selectedThread) {
            return;
        }

        const res = await fetch(
            `/threads/${selectedThread.id}/timeline/${entry.id}/slack-link`,
        );
        const data = await res.json();

        if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
            toast.error('Could not resolve the Slack link.');
        }
    };

    const handleCopySlackLink = async (entry: TimelineEntry) => {
        if (!selectedThread) {
            return;
        }

        const res = await fetch(
            `/threads/${selectedThread.id}/timeline/${entry.id}/slack-link`,
        );
        const data = await res.json();

        if (data.url) {
            navigator.clipboard.writeText(data.url);
            toast.success('Copied Slack link!');
        } else {
            toast.error('Could not resolve the Slack link.');
        }
    };

    const handleAddSlackReaction = (entry: TimelineEntry, emoji: string) => {
        if (!selectedThread) {
            return;
        }

        router.post(
            `/threads/${selectedThread.id}/timeline/${entry.id}/slack-reaction`,
            { emoji },
            { preserveState: true, preserveScroll: true },
        );
        setReactionPickerEntryId(null);
        setEmojiSearchQuery('');
    };

    const handleSaveNoteEdit = (entryId: string) => {
        if (!selectedThread || !editingNoteBody.trim()) {
            return;
        }

        router.patch(
            `/threads/${selectedThread.id}/timeline/${entryId}`,
            { body: editingNoteBody },
            {
                preserveState: true,
                onSuccess: () => {
                    setEditingNoteId(null);
                    setEditingNoteBody('');
                },
            },
        );
    };

    const filteredEmojis = searchEmoji(emojiSearchQuery).slice(0, 48);

    return (
        <div className="cd-scroll flex-1 space-y-4 overflow-y-auto p-4">
            <div className="my-2 flex items-center justify-center">
                <span className="rounded-full border border-border bg-card px-3 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Timeline
                </span>
            </div>

            {displayedTimelineEntries && displayedTimelineEntries.length > 0 ? (
                <div className="space-y-2.5">
                    {displayedTimelineEntries.map((entry) => {
                        const isMessageCard =
                            entry.entry_type === 'message' ||
                            (entry.entry_type === 'note' &&
                                entry.is_internal === true &&
                                !entry.metadata?.action);

                        if (isMessageCard) {
                            const isYou = entry.actor_type === 'user';
                            const isAi = entry.actor_type === 'ai';

                            return (
                                <div
                                    key={entry.id}
                                    id={`entry-${entry.id}`}
                                    className={`group my-2 scroll-mt-4 space-y-2 rounded-xl p-3.5 target:ring-2 target:ring-primary ${
                                        isAi
                                            ? 'bg-violet-500/10'
                                            : isYou
                                              ? 'bg-primary/10'
                                              : 'bg-muted/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white uppercase ${
                                                    isAi
                                                        ? 'bg-violet-500'
                                                        : isYou
                                                          ? 'bg-primary'
                                                          : 'bg-muted-foreground'
                                                }`}
                                            >
                                                {isAi ? (
                                                    <img
                                                        src="/widget/ai-avatar.jpg"
                                                        alt="Inbi"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : isYou ? (
                                                    'Y'
                                                ) : (
                                                    (selectedThread.tenant
                                                        ?.name?.[0] ?? 'D')
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-foreground">
                                                {isAi
                                                    ? 'Inbi'
                                                    : isYou
                                                      ? 'You'
                                                      : selectedThread.tenant
                                                            ?.name ||
                                                        'Customer'}
                                            </span>
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {formatRelativeTime(
                                                    entry.created_at,
                                                )}
                                            </span>
                                            {isAi && (
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-violet-500/30 text-violet-500"
                                                >
                                                    <Sparkles className="size-3" />
                                                    AI reply
                                                </Badge>
                                            )}
                                            {entry.is_internal && (
                                                <Badge variant="secondary">
                                                    Internal Note
                                                </Badge>
                                            )}
                                            {entry.metadata?.is_auto_reply && (
                                                <Badge variant="outline">
                                                    Auto-Reply
                                                </Badge>
                                            )}
                                            {entry.status === 'sending' && (
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 text-muted-foreground"
                                                >
                                                    <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                                                    Sending…
                                                </Badge>
                                            )}
                                            {entry.status === 'failed' && (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-destructive/30 text-destructive"
                                                    >
                                                        Failed to send
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            retryPendingEntry(
                                                                entry,
                                                            )
                                                        }
                                                        className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                                                    >
                                                        Retry
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            dismissPendingEntry(
                                                                entry.id,
                                                            )
                                                        }
                                                        className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:underline"
                                                    >
                                                        Discard
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            {isSlackLinkedEntry(entry) && (
                                                <div className="relative">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setReactionPickerEntryId(
                                                                        reactionPickerEntryId ===
                                                                            entry.id
                                                                            ? null
                                                                            : entry.id,
                                                                    );
                                                                    setEmojiSearchQuery(
                                                                        '',
                                                                    );
                                                                }}
                                                                className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Smile />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Add reaction
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {reactionPickerEntryId ===
                                                        entry.id && (
                                                        <div className="absolute top-8 right-0 z-20 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                                                            <div className="relative mb-2">
                                                                <SearchIcon className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    value={
                                                                        emojiSearchQuery
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setEmojiSearchQuery(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Search emoji..."
                                                                    className="w-full rounded-md border border-border bg-background py-1 pr-2 pl-7 text-xs text-foreground focus:border-primary focus:outline-none"
                                                                />
                                                            </div>
                                                            <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
                                                                {filteredEmojis.map(
                                                                    (emoji) => (
                                                                        <Tooltip
                                                                            key={
                                                                                emoji.name
                                                                            }
                                                                        >
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleAddSlackReaction(
                                                                                            entry,
                                                                                            emoji.name,
                                                                                        )
                                                                                    }
                                                                                    className="flex cursor-pointer items-center justify-center rounded p-1 text-base hover:bg-muted"
                                                                                >
                                                                                    {
                                                                                        emoji.char
                                                                                    }
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                {
                                                                                    emoji.name
                                                                                }
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ),
                                                                )}
                                                                {filteredEmojis.length ===
                                                                    0 && (
                                                                    <span className="col-span-8 py-3 text-center text-[11px] text-muted-foreground">
                                                                        No
                                                                        matches
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <DropdownMenu>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <MoreHorizontal />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        More actions
                                                    </TooltipContent>
                                                </Tooltip>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleCopyEntryLink(
                                                                entry,
                                                            )
                                                        }
                                                    >
                                                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>
                                                            Copy link to this
                                                            entry
                                                        </span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleCopyMessageText(
                                                                entry,
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>
                                                            Copy message text
                                                        </span>
                                                    </DropdownMenuItem>
                                                    {isSlackLinkedEntry(
                                                        entry,
                                                    ) && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleOpenInSlack(
                                                                        entry,
                                                                    )
                                                                }
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span>
                                                                    Open in
                                                                    Slack
                                                                </span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleCopySlackLink(
                                                                        entry,
                                                                    )
                                                                }
                                                            >
                                                                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span>
                                                                    Copy Slack
                                                                    link
                                                                </span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {entry.metadata?.is_edited && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                onViewHistory(
                                                                    entry,
                                                                )
                                                            }
                                                            className="flex cursor-pointer items-center gap-1 rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warning hover:text-warning/80"
                                                        >
                                                            <Clock data-icon="inline-start" />
                                                            <span>edited</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        View note edit history
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}

                                            {(entry.is_internal ||
                                                entry.entry_type ===
                                                    'note') && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setEditingNoteId(
                                                                    entry.id,
                                                                );
                                                                setEditingNoteBody(
                                                                    entry.body ||
                                                                        '',
                                                                );
                                                            }}
                                                            className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Edit internal note
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    {editingNoteId === entry.id ? (
                                        <div className="space-y-2 pt-2">
                                            <Textarea
                                                value={editingNoteBody}
                                                onChange={(e) =>
                                                    setEditingNoteBody(
                                                        e.target.value,
                                                    )
                                                }
                                                className="min-h-[80px] w-full rounded-lg border border-warning/40 bg-background p-2.5 text-xs text-foreground focus:border-warning focus:outline-none"
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() =>
                                                        handleSaveNoteEdit(
                                                            entry.id,
                                                        )
                                                    }
                                                    disabled={
                                                        !editingNoteBody.trim()
                                                    }
                                                    className="h-7 rounded-md bg-warning px-3 text-xs font-bold text-warning-foreground hover:bg-warning/90"
                                                >
                                                    Save note
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingNoteId(null);
                                                        setEditingNoteBody('');
                                                    }}
                                                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-1 text-xs text-foreground/80">
                                            <MarkdownBody
                                                text={entry.body || ''}
                                            />
                                        </div>
                                    )}

                                    {/* Attachments Section */}
                                    {entry.attachments &&
                                        Array.isArray(entry.attachments) &&
                                        entry.attachments.length > 0 && (
                                            <div className="space-y-2 border-t border-border/50 pt-3">
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                                                    Attachments (
                                                    {entry.attachments.length})
                                                </span>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    {entry.attachments.map(
                                                        (
                                                            att: any,
                                                            idx: number,
                                                        ) => {
                                                            const isImg =
                                                                att.mime_type?.startsWith(
                                                                    'image/',
                                                                ) ||
                                                                /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
                                                                    att.name ||
                                                                        '',
                                                                );

                                                            return isImg ? (
                                                                <a
                                                                    key={idx}
                                                                    href={
                                                                        att.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="group relative block overflow-hidden rounded-lg border border-border bg-background/50 transition-all hover:border-primary"
                                                                >
                                                                    <img
                                                                        src={
                                                                            att.url
                                                                        }
                                                                        alt={
                                                                            att.name
                                                                        }
                                                                        className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                                                                    />
                                                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between truncate bg-black/70 p-1.5 font-mono text-[10px] text-white">
                                                                        <span className="truncate">
                                                                            {
                                                                                att.name
                                                                            }
                                                                        </span>
                                                                        <span className="ml-1 text-white/70">
                                                                            {
                                                                                att.size
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </a>
                                                            ) : (
                                                                <a
                                                                    key={idx}
                                                                    href={
                                                                        att.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-2.5 text-xs transition-all hover:bg-muted"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                                                                        <div className="truncate">
                                                                            <p className="truncate text-[11px] font-medium text-foreground">
                                                                                {
                                                                                    att.name
                                                                                }
                                                                            </p>
                                                                            <p className="font-mono text-[10px] text-muted-foreground">
                                                                                {
                                                                                    att.size
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <Download className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                                                </a>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={entry.id}
                                className="flex items-center gap-2 px-1 py-0.5 font-mono text-xs leading-snug text-muted-foreground"
                            >
                                {entry.entry_type === 'status_change' ? (
                                    <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                ) : entry.entry_type === 'assignment' ? (
                                    <UserIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                ) : (
                                    <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                )}

                                <span className="text-foreground/80">
                                    {entry.body ||
                                        `Updated ${entry.entry_type}`}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    • {formatRelativeTime(entry.created_at)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Empty className="min-h-52 border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircle />
                        </EmptyMedia>
                        <EmptyTitle>No timeline messages</EmptyTitle>
                        <EmptyDescription>
                            Messages, notes, and activity will appear here.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    );
}
