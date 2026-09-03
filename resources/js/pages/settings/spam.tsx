import { Head, router } from '@inertiajs/react';
import { Plus, ShieldAlert, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface SpamSettings {
    enabled: boolean;
    blocked_keywords: string[];
    blocked_domains: string[];
}

interface SpamThreadItem {
    id: string;
    title: string | null;
    tenant_name: string | null;
    tenant_email: string | null;
    created_at: string | null;
}

interface SpamSettingsPageProps {
    settings: SpamSettings;
    recentSpamCount: number;
    recentSpam: SpamThreadItem[];
}

function TagList({
    values,
    onAdd,
    onRemove,
    placeholder,
}: {
    values: string[];
    onAdd: (value: string) => void;
    onRemove: (index: number) => void;
    placeholder: string;
}) {
    const [draft, setDraft] = React.useState('');

    const handleAdd = () => {
        const trimmed = draft.trim();

        if (!trimmed || values.includes(trimmed)) {
            return;
        }

        onAdd(trimmed);
        setDraft('');
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={handleAdd}
                >
                    <Plus className="size-3.5" />
                </Button>
            </div>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {values.map((value, idx) => (
                        <span
                            key={value}
                            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
                        >
                            {value}
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SpamSettingsPage({
    settings,
    recentSpamCount,
    recentSpam,
}: SpamSettingsPageProps) {
    const [enabled, setEnabled] = React.useState(settings.enabled);
    const [blockedKeywords, setBlockedKeywords] = React.useState(
        settings.blocked_keywords,
    );
    const [blockedDomains, setBlockedDomains] = React.useState(
        settings.blocked_domains,
    );
    const [saving, setSaving] = React.useState(false);

    const handleSave = () => {
        setSaving(true);
        router.patch(
            `/settings/spam`,
            {
                enabled,
                blocked_keywords: blockedKeywords,
                blocked_domains: blockedDomains,
            },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const handleRestore = (threadId: string) => {
        router.post(
            `/settings/spam/${threadId}/restore`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Spam filtering" />

            <div>
                <h1 className="text-xl font-semibold">Spam filtering</h1>
                <p className="text-xs text-muted-foreground">
                    Automatically flag the first message of a new email or chat
                    conversation as spam when it matches a blocked keyword or
                    sender domain. Spam threads are hidden from the inbox but
                    stay reachable under the "All" tab.
                </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                    <p className="text-sm font-semibold">
                        Enable spam filtering
                    </p>
                    <p className="text-xs text-muted-foreground">
                        New conversations matching a rule below start as Spam
                        instead of Needs first response.
                    </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                    Blocked keywords
                </label>
                <p className="text-[11px] text-muted-foreground">
                    A conversation is flagged if its first message contains any
                    of these words or phrases (case-insensitive).
                </p>
                <TagList
                    values={blockedKeywords}
                    onAdd={(v) => setBlockedKeywords((prev) => [...prev, v])}
                    onRemove={(idx) =>
                        setBlockedKeywords((prev) =>
                            prev.filter((_, i) => i !== idx),
                        )
                    }
                    placeholder="e.g. crypto giveaway"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                    Blocked sender domains
                </label>
                <p className="text-[11px] text-muted-foreground">
                    A conversation is flagged if the sender's email domain
                    matches one of these exactly.
                </p>
                <TagList
                    values={blockedDomains}
                    onAdd={(v) => setBlockedDomains((prev) => [...prev, v])}
                    onRemove={(idx) =>
                        setBlockedDomains((prev) =>
                            prev.filter((_, i) => i !== idx),
                        )
                    }
                    placeholder="e.g. spammy-domain.com"
                />
            </div>

            <Button disabled={saving} onClick={handleSave}>
                Save
            </Button>

            <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Recently flagged</h2>
                    <p className="text-xs text-muted-foreground">
                        {recentSpamCount} total
                    </p>
                </div>

                {recentSpam.length === 0 ? (
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <ShieldAlert />
                            </EmptyMedia>
                            <EmptyTitle>No spam flagged yet</EmptyTitle>
                            <EmptyDescription>
                                Conversations blocked by your rules will show up
                                here.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                        {recentSpam.map((thread) => (
                            <div
                                key={thread.id}
                                className="flex items-center gap-3 px-3 py-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">
                                        {thread.title ?? 'Untitled'}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {thread.tenant_name ??
                                            thread.tenant_email ??
                                            'Unknown sender'}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 shrink-0 text-xs"
                                    onClick={() => handleRestore(thread.id)}
                                >
                                    Not spam
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
