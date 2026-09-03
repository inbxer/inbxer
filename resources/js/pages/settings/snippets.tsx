import { Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2, Zap } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface SnippetItem {
    id: string;
    name: string;
    shortcut: string | null;
    body: string;
    created_by: number;
    creator?: { id: number; name: string };
}

interface SnippetsPageProps {
    snippets: SnippetItem[];
}

export default function SnippetsPage({ snippets = [] }: SnippetsPageProps) {
    const confirm = useConfirm();
    const [showModal, setShowModal] = React.useState(false);
    const [editing, setEditing] = React.useState<SnippetItem | null>(null);
    const [name, setName] = React.useState('');
    const [shortcut, setShortcut] = React.useState('');
    const [body, setBody] = React.useState('');

    const openCreate = () => {
        setEditing(null);
        setName('');
        setShortcut('');
        setBody('');
        setShowModal(true);
    };

    const openEdit = (snippet: SnippetItem) => {
        setEditing(snippet);
        setName(snippet.name);
        setShortcut(snippet.shortcut ?? '');
        setBody(snippet.body);
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !body.trim()) {
            return;
        }

        const payload = {
            name: name.trim(),
            shortcut: shortcut.trim() || null,
            body,
        };

        if (editing) {
            router.patch(`${window.location.pathname}/${editing.id}`, payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
            });
        } else {
            router.post(window.location.pathname, payload, {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
            });
        }
    };

    const handleDelete = async (snippet: SnippetItem) => {
        if (
            !(await confirm({
                title: `Delete snippet "${snippet.name}"?`,
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`${window.location.pathname}/${snippet.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Snippets — Inbxer Settings" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Snippets</h1>
                    <p className="text-sm text-muted-foreground">
                        Canned responses your team can insert into replies
                        instantly.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus data-icon="inline-start" />
                    New snippet
                </Button>
            </div>

            {snippets.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Zap />
                        </EmptyMedia>
                        <EmptyTitle>No snippets yet</EmptyTitle>
                        <EmptyDescription>
                            Create reusable responses to speed up replies.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {snippets.map((snippet) => (
                        <div
                            key={snippet.id}
                            className="flex items-start justify-between gap-3 p-3"
                        >
                            <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {snippet.name}
                                    </span>
                                    {snippet.shortcut && (
                                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                            /{snippet.shortcut}
                                        </span>
                                    )}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                    {snippet.body}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEdit(snippet)}
                                        >
                                            <Pencil className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Edit snippet
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleDelete(snippet)
                                            }
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete snippet
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Edit snippet' : 'New snippet'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Name
                            </label>
                            <Input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Shortcut (optional)
                            </label>
                            <Input
                                value={shortcut}
                                onChange={(e) => setShortcut(e.target.value)}
                                placeholder="thanks"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Content
                            </label>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="min-h-28"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!name.trim() || !body.trim()}
                            >
                                {editing ? 'Save' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
