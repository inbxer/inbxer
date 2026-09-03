import { router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Lock,
    CornerDownLeft,
    FileText,
    MoreHorizontal,
    Copy,
    Send,
    Paperclip,
    X,
    Smile,
    Search as SearchIcon,
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Link2,
    Code2,
    Zap,
    Plus,
    Check,
    Clock,
    BookOpen,
    Sparkles,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import type { PendingAiDraft } from '@/components/support/ai-draft-review-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { searchEmoji } from '@/lib/emoji-data';
import type { SupportThread } from '@/types/support';

function ToolbarButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

interface ThreadReplyComposerProps {
    selectedThread: SupportThread;
    isThreadLocked: boolean;
    showReplyBox: boolean;
    setShowReplyBox: (show: boolean) => void;
    isInternal: boolean;
    setIsInternal: (internal: boolean) => void;
    replyBody: string;
    setReplyBody: (body: string) => void;
    handleCopyAsMarkdown: (type: 'messages_only' | 'all') => void;
    handlePostReply: (
        e?: React.FormEvent,
        attachmentsFiles?: File[],
        status?: string,
    ) => void;
    pendingAiDraft: PendingAiDraft | null;
}

export function ThreadReplyComposer({
    selectedThread,
    isThreadLocked,
    showReplyBox,
    setShowReplyBox,
    isInternal,
    setIsInternal,
    replyBody,
    setReplyBody,
    handleCopyAsMarkdown,
    handlePostReply,
    pendingAiDraft,
}: ThreadReplyComposerProps) {
    const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
    const replyTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showComposerEmoji, setShowComposerEmoji] = React.useState(false);
    const [composerEmojiQuery, setComposerEmojiQuery] = React.useState('');
    const [snippets, setSnippets] = React.useState<
        Array<{
            id: string;
            name: string;
            shortcut: string | null;
            body: string;
        }>
    >([]);
    const [snippetsLoaded, setSnippetsLoaded] = React.useState(false);
    const [helpArticles, setHelpArticles] = React.useState<
        Array<{ id: string; title: string; url: string }>
    >([]);
    const [helpArticlesThreadId, setHelpArticlesThreadId] = React.useState<
        string | null
    >(null);
    const [showCreateSnippet, setShowCreateSnippet] = React.useState(false);
    const [newSnippetName, setNewSnippetName] = React.useState('');
    const [newSnippetBody, setNewSnippetBody] = React.useState('');
    const [aiSuggestionLoading, setAiSuggestionLoading] = React.useState(false);

    const { ai } = usePage().props as unknown as {
        ai?: { suggested_responses_enabled: boolean } | null;
    };
    const aiSuggestionsEnabled = Boolean(ai?.suggested_responses_enabled);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setAttachedFiles((prev) => [...prev, ...filesArray]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDiscardDraft = () => {
        if (!pendingAiDraft) {
            return;
        }

        router.post(
            `/ai/activity/${pendingAiDraft.id}/reject`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyBody('');
                    setShowReplyBox(false);
                    toast.success('AI Draft discarded.');
                },
            },
        );
    };

    const onSubmitReply = (e: React.FormEvent, status?: string) => {
        e.preventDefault();

        if (pendingAiDraft && !isInternal) {
            const edited = replyBody.trim() !== pendingAiDraft.generated_reply;

            router.post(
                `/ai/activity/${pendingAiDraft.id}/approve`,
                edited ? { generated_reply: replyBody } : {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setReplyBody('');
                        setShowReplyBox(false);
                        setAttachedFiles([]);
                        toast.success('Reply sent & draft approved.');
                    },
                },
            );

            return;
        }

        handlePostReply(e, attachedFiles, status);
        setAttachedFiles([]);
    };

    const wrapReplySelection = (before: string, after: string = before) => {
        const textarea = replyTextareaRef.current;

        if (!textarea) {
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = replyBody.slice(start, end);
        const insert = before + selected + after;
        const next = replyBody.slice(0, start) + insert + replyBody.slice(end);
        setReplyBody(next);
        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = selected
                ? start + insert.length
                : start + before.length;
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    const insertAtCursor = (text: string) => {
        const textarea = replyTextareaRef.current;

        if (!textarea) {
            setReplyBody(replyBody + text);

            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const next = replyBody.slice(0, start) + text + replyBody.slice(end);
        setReplyBody(next);
        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = start + text.length;
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    const filteredComposerEmojis = searchEmoji(composerEmojiQuery).slice(0, 48);

    const loadSnippets = () => {
        if (snippetsLoaded) {
            return;
        }

        fetch(`/snippets`, { headers: { Accept: 'application/json' } })
            .then((res) => res.json())
            .then((data) => {
                setSnippets(data.snippets || []);
                setSnippetsLoaded(true);
            })
            .catch(() => {});
    };

    const loadHelpArticles = () => {
        if (helpArticlesThreadId === selectedThread.id) {
            return;
        }

        fetch(`/threads/${selectedThread.id}/help-articles`, {
            headers: { Accept: 'application/json' },
        })
            .then((res) => res.json())
            .then((data) => {
                setHelpArticles(data.articles || []);
                setHelpArticlesThreadId(selectedThread.id);
            })
            .catch(() => {});
    };

    const handleAiSuggestion = () => {
        if (aiSuggestionLoading) {
            return;
        }

        setAiSuggestionLoading(true);

        fetch(`/threads/${selectedThread.id}/ai-suggestion`, {
            headers: { Accept: 'application/json' },
        })
            .then(async (res) => {
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data?.error ||
                            'Could not generate a suggestion right now.',
                    );
                }

                if (data.reply) {
                    insertAtCursor(data.reply);
                }
            })
            .catch((err: Error) => {
                toast.error(
                    err.message || 'Could not generate a suggestion right now.',
                );
            })
            .finally(() => {
                setAiSuggestionLoading(false);
            });
    };

    const handleCreateSnippet = () => {
        if (!newSnippetName.trim() || !newSnippetBody.trim()) {
            return;
        }

        router.post(
            `/snippets`,
            { name: newSnippetName, body: newSnippetBody },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setNewSnippetName('');
                    setNewSnippetBody('');
                    setShowCreateSnippet(false);
                    setSnippetsLoaded(false);
                    loadSnippets();
                    toast.success('Snippet created!');
                },
            },
        );
    };

    if (isThreadLocked) {
        return (
            <div className="flex items-center justify-center gap-2 border-t border-border bg-card p-3 text-center font-mono text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-warning" />
                <span>
                    This thread is locked. Any new messages from the customer
                    will start a new thread instead.
                </span>
            </div>
        );
    }

    if (!showReplyBox) {
        return (
            <div className="sticky bottom-0 z-10 flex items-center justify-center border-t border-border bg-background p-3">
                <div className="flex items-center overflow-hidden rounded-full border border-border bg-card shadow-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsInternal(false);
                            setShowReplyBox(true);
                        }}
                        className="flex cursor-pointer items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        <CornerDownLeft className="h-3.5 w-3.5" />
                        <span>
                            Reply to{' '}
                            {selectedThread.tenant?.name
                                ? selectedThread.tenant.name.split(' ')[0]
                                : 'Customer'}
                            ...
                        </span>
                        <Kbd>R</Kbd>
                    </button>

                    <div className="h-5 w-px bg-border" />

                    <button
                        type="button"
                        onClick={() => {
                            setIsInternal(true);
                            setShowReplyBox(true);
                        }}
                        className="flex cursor-pointer items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Add note</span>
                        <Kbd>N</Kbd>
                    </button>

                    <div className="h-5 w-px bg-border" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span>More</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() =>
                                    handleCopyAsMarkdown('messages_only')
                                }
                            >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Copy as markdown</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }

    const isAiDraftActive = pendingAiDraft && !isInternal;

    return (
        <>
            <form
                onSubmit={onSubmitReply}
                className={`flex flex-col gap-3 border-t p-4 transition-colors ${
                    isAiDraftActive
                        ? 'border-t-violet-500/30 bg-violet-500/5'
                        : 'border-t-border bg-background'
                }`}
            >
                {isAiDraftActive && (
                    <div className="flex items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                            <Sparkles className="size-3.5" />
                            <span className="font-semibold">
                                Inbi AI drafted a reply
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDiscardDraft}
                        >
                            Discard Draft
                        </Button>
                    </div>
                )}
                <Tabs
                    value={isInternal ? 'internal' : 'reply'}
                    onValueChange={(value) =>
                        setIsInternal(value === 'internal')
                    }
                >
                    <TabsList variant="line">
                        <TabsTrigger value="reply">
                            Reply to customer
                        </TabsTrigger>
                        <TabsTrigger value="internal">
                            Internal note
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Formatting toolbar */}
                <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-card/40 p-1">
                    <ToolbarButton
                        label="Bold"
                        onClick={() => wrapReplySelection('**')}
                    >
                        <Bold className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Italic"
                        onClick={() => wrapReplySelection('*')}
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Strikethrough"
                        onClick={() => wrapReplySelection('~~')}
                    >
                        <Strikethrough className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Bulleted list"
                        onClick={() => wrapReplySelection('\n- ', '')}
                    >
                        <List className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Numbered list"
                        onClick={() => wrapReplySelection('\n1. ', '')}
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Quote"
                        onClick={() => wrapReplySelection('\n> ', '')}
                    >
                        <Quote className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Link"
                        onClick={() => wrapReplySelection('[', '](url)')}
                    >
                        <Link2 className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Code"
                        onClick={() => wrapReplySelection('`')}
                    >
                        <Code2 className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <div className="mx-1 h-4 w-px bg-border" />

                    <div className="relative">
                        <ToolbarButton
                            label="Emoji"
                            onClick={() => {
                                setShowComposerEmoji((v) => !v);
                                setComposerEmojiQuery('');
                            }}
                        >
                            <Smile className="h-3.5 w-3.5" />
                        </ToolbarButton>
                        {showComposerEmoji && (
                            <div className="absolute bottom-9 left-0 z-20 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                                <div className="relative mb-2">
                                    <SearchIcon className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        value={composerEmojiQuery}
                                        onChange={(e) =>
                                            setComposerEmojiQuery(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Search emoji..."
                                        className="w-full rounded-md border border-border bg-background py-1 pr-2 pl-7 text-xs text-foreground focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
                                    {filteredComposerEmojis.map((emoji) => (
                                        <button
                                            key={emoji.name}
                                            type="button"
                                            onClick={() => {
                                                insertAtCursor(emoji.char);
                                                setShowComposerEmoji(false);
                                            }}
                                            className="flex cursor-pointer items-center justify-center rounded p-1 text-base hover:bg-muted"
                                            title={emoji.name}
                                        >
                                            {emoji.char}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DropdownMenu
                        onOpenChange={(open) => {
                            if (open) {
                                loadSnippets();
                            }
                        }}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                    >
                                        <Zap className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Snippets</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className="w-64">
                            {snippets.map((snippet) => (
                                <DropdownMenuItem
                                    key={snippet.id}
                                    onClick={() => insertAtCursor(snippet.body)}
                                >
                                    <span className="truncate">
                                        {snippet.name}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                            {snippets.length === 0 && (
                                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                                    No snippets yet
                                </p>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setShowCreateSnippet(true)}
                            >
                                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Create snippet</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu
                        onOpenChange={(open) => {
                            if (open) {
                                loadHelpArticles();
                            }
                        }}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                    >
                                        <BookOpen className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Help articles</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" className="w-72">
                            {helpArticles.map((article) => (
                                <DropdownMenuItem
                                    key={article.id}
                                    onClick={() =>
                                        insertAtCursor(
                                            `[${article.title}](${article.url})`,
                                        )
                                    }
                                >
                                    <span className="truncate">
                                        {article.title}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                            {helpArticles.length === 0 && (
                                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                                    No matching Help Center articles
                                </p>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {aiSuggestionsEnabled && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={aiSuggestionLoading}
                                    onClick={handleAiSuggestion}
                                >
                                    <Sparkles
                                        className={`h-3.5 w-3.5 ${aiSuggestionLoading ? 'animate-pulse' : ''}`}
                                    />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {aiSuggestionLoading
                                    ? 'Generating suggestion...'
                                    : 'AI suggestion'}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                <Textarea
                    ref={replyTextareaRef}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.form?.requestSubmit();
                        }
                    }}
                    placeholder={
                        isInternal
                            ? 'Add an internal note...'
                            : 'Type your reply...'
                    }
                    className="min-h-24 resize-none"
                />

                {/* Draft Attachments Pills */}
                {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {attachedFiles.map((file, idx) => (
                            <Badge
                                key={`${file.name}-${idx}`}
                                variant="secondary"
                                className="gap-1.5 py-1"
                            >
                                <Paperclip />
                                <span className="max-w-[150px] truncate">
                                    {file.name}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveFile(idx)}
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <Paperclip data-icon="inline-start" />
                                    Attach files
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Attach files or images
                            </TooltipContent>
                        </Tooltip>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReplyBox(false)}
                        >
                            Cancel
                        </Button>
                    </div>

                    {isInternal ? (
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                !replyBody.trim() && attachedFiles.length === 0
                            }
                        >
                            <Send data-icon="inline-start" />
                            Add note
                        </Button>
                    ) : (
                        <div
                            className={`flex items-center overflow-hidden rounded-md border ${
                                isAiDraftActive
                                    ? 'border-violet-600'
                                    : 'border-primary'
                            }`}
                        >
                            <button
                                type="submit"
                                disabled={
                                    !replyBody.trim() &&
                                    attachedFiles.length === 0
                                }
                                className={`flex h-8 items-center gap-1.5 px-3 text-xs font-semibold hover:opacity-90 disabled:opacity-50 ${
                                    isAiDraftActive
                                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                                        : 'bg-primary text-primary-foreground'
                                }`}
                            >
                                {isAiDraftActive ? (
                                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                {isAiDraftActive
                                    ? replyBody.trim() ===
                                      pendingAiDraft.generated_reply
                                        ? 'Approve & Send'
                                        : 'Save & Send'
                                    : 'Reply'}
                            </button>
                            {!isAiDraftActive && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={
                                                !replyBody.trim() &&
                                                attachedFiles.length === 0
                                            }
                                            className="flex h-8 items-center border-l border-primary-foreground/20 bg-primary px-1.5 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={(e) =>
                                                onSubmitReply(
                                                    e as unknown as React.FormEvent,
                                                )
                                            }
                                        >
                                            <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Reply</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) =>
                                                onSubmitReply(
                                                    e as unknown as React.FormEvent,
                                                    'investigating',
                                                )
                                            }
                                        >
                                            <SearchIcon className="h-3.5 w-3.5 text-primary" />
                                            <span>Reply &amp; investigate</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) =>
                                                onSubmitReply(
                                                    e as unknown as React.FormEvent,
                                                    'waiting_for_customer',
                                                )
                                            }
                                        >
                                            <Clock className="h-3.5 w-3.5 text-warning" />
                                            <span>
                                                Reply &amp; wait for customer
                                            </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) =>
                                                onSubmitReply(
                                                    e as unknown as React.FormEvent,
                                                    'done',
                                                )
                                            }
                                        >
                                            <Check className="h-3.5 w-3.5 text-success" />
                                            <span>Reply &amp; done</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )}
                </div>
            </form>

            {/* Create Snippet Modal */}
            <Dialog
                open={showCreateSnippet}
                onOpenChange={setShowCreateSnippet}
            >
                <DialogContent className="max-w-md border-border bg-background text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold">
                            Create snippet
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Snippet name
                            </label>
                            <Input
                                autoFocus
                                value={newSnippetName}
                                onChange={(e) =>
                                    setNewSnippetName(e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Snippet content
                            </label>
                            <Textarea
                                value={newSnippetBody}
                                onChange={(e) =>
                                    setNewSnippetBody(e.target.value)
                                }
                                className="min-h-24 resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                type="button"
                                size="sm"
                                disabled={
                                    !newSnippetName.trim() ||
                                    !newSnippetBody.trim()
                                }
                                onClick={handleCreateSnippet}
                            >
                                Create snippet
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCreateSnippet(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
