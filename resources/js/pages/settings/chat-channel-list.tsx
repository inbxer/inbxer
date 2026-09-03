import { Head, router } from '@inertiajs/react';
import { ChevronRight, MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

export interface ChatAppItem {
    id: string;
    name: string;
    created_at?: string;
}
interface ChatChannelListPageProps {
    apps?: ChatAppItem[];
}

export default function ChatChannelListPage({
    apps = [],
}: ChatChannelListPageProps) {
    const [chatApps, setChatApps] = useState(apps);
    const [createOpen, setCreateOpen] = useState(false);
    const [newAppName, setNewAppName] = useState('');
    const [creating, setCreating] = useState(false);
    const [deletingApp, setDeletingApp] = useState<ChatAppItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleCreateApp = (event: FormEvent) => {
        event.preventDefault();

        if (!newAppName.trim()) {
            return;
        }

        setCreating(true);
        router.post(
            `/settings/channels/chat/create`,
            { name: newAppName.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCreateOpen(false);
                    setNewAppName('');
                },
                onFinish: () => setCreating(false),
            },
        );
    };

    const handleDeleteApp = () => {
        if (!deletingApp) {
            return;
        }

        setDeleting(true);
        router.delete(`/settings/channels/chat/${deletingApp.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setChatApps((current) =>
                    current.filter((app) => app.id !== deletingApp.id),
                );
                setDeletingApp(null);
            },
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <>
            <Head title="Chat Apps — Settings" />
            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Chat
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Chat live with customers using a widget on your
                            website.
                        </p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus data-icon="inline-start" />
                        New chat app
                    </Button>
                </header>
                <Separator />
                {chatApps.length > 0 ? (
                    <div className="grid gap-3">
                        {chatApps.map((app) => (
                            <Card
                                key={app.id}
                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                role="link"
                                tabIndex={0}
                                onClick={() =>
                                    router.get(
                                        `/settings/channels/chat/${app.id}`,
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        router.get(
                                            `/settings/channels/chat/${app.id}`,
                                        );
                                    }
                                }}
                            >
                                <CardHeader className="flex-row items-center justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <MessageSquare />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="truncate">
                                                {app.name}
                                            </CardTitle>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Delete ${app.name}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setDeletingApp(app);
                                            }}
                                        >
                                            <Trash2 />
                                        </Button>
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Empty className="min-h-72 border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <MessageSquare />
                            </EmptyMedia>
                            <EmptyTitle>No chat apps yet</EmptyTitle>
                            <EmptyDescription>
                                Create a chat app to add a live support widget
                                to your website.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button onClick={() => setCreateOpen(true)}>
                                <Plus data-icon="inline-start" />
                                Create chat app
                            </Button>
                        </EmptyContent>
                    </Empty>
                )}

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <form
                            onSubmit={handleCreateApp}
                            className="flex flex-col gap-6"
                        >
                            <DialogHeader>
                                <DialogTitle>Create chat app</DialogTitle>
                                <DialogDescription>
                                    Name the website or application where the
                                    widget will be embedded.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="chat-app-name">App name</Label>
                                <Input
                                    id="chat-app-name"
                                    value={newAppName}
                                    onChange={(event) =>
                                        setNewAppName(event.target.value)
                                    }
                                    placeholder="Main website"
                                    autoFocus
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateOpen(false)}
                                    disabled={creating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creating || !newAppName.trim()}
                                >
                                    {creating && (
                                        <Spinner data-icon="inline-start" />
                                    )}
                                    {creating ? 'Creating…' : 'Create chat app'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={Boolean(deletingApp)}
                    onOpenChange={(open) => !open && setDeletingApp(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete chat app?</DialogTitle>
                            <DialogDescription>
                                This permanently removes {deletingApp?.name} and
                                its widget configuration.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeletingApp(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteApp}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <Spinner data-icon="inline-start" />
                                ) : (
                                    <Trash2 data-icon="inline-start" />
                                )}
                                {deleting ? 'Deleting…' : 'Delete app'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
