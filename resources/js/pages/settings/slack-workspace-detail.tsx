import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Search, ExternalLink, X } from 'lucide-react';
import React, { useState } from 'react';
import {
    bulkJoinChannels as bulkJoinSlackChannels,
    syncChannels as syncSlackChannels,
} from '@/actions/App/Domain/Channel/Controllers/SlackWorkspaceController';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';

interface SlackChannelItem {
    id: string;
    name: string;
    type: string;
    ingestion_mode: string;
}

interface SlackWorkspaceDetailProps {
    workspace: {
        id: string;
        name: string;
        settings: {
            connected_by?: string;
            connected_at?: string;
            ingestion_mode?: string;
            enable_reactions?: boolean;
            enable_discussions?: boolean;
            auto_join_rules?: Array<{ type: string; value: string }>;
            connected_channels?: SlackChannelItem[];
        };
    };
    replyingAs: { name: string; avatar: string | null } | null;
}

export default function SlackWorkspaceDetailPage({
    workspace,
    replyingAs,
}: SlackWorkspaceDetailProps) {
    const confirm = useConfirm();

    const [ingestionMode, setIngestionMode] = useState<string>(
        workspace.settings?.ingestion_mode &&
            workspace.settings.ingestion_mode !== 'smart_ai'
            ? workspace.settings.ingestion_mode
            : 'time_based',
    );
    const [enableReactions, setEnableReactions] = useState<boolean>(
        workspace.settings?.enable_reactions ?? true,
    );
    const [enableDiscussions, setEnableDiscussions] = useState<boolean>(
        workspace.settings?.enable_discussions ?? true,
    );

    const [ruleType, setRuleType] = useState<'prefix' | 'suffix'>('prefix');
    const [rulePrefix, setRulePrefix] = useState<string>('support-');
    const [searchChannelQuery, setSearchChannelQuery] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [modeFilter, setModeFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [prevChannels, setPrevChannels] = useState<
        SlackChannelItem[] | undefined
    >(workspace.settings?.connected_channels);
    const [connectedChannels, setConnectedChannels] = useState<
        SlackChannelItem[]
    >(workspace.settings?.connected_channels || []);

    if (workspace.settings?.connected_channels !== prevChannels) {
        setPrevChannels(workspace.settings?.connected_channels);
        setConnectedChannels(workspace.settings?.connected_channels || []);
    }

    const autoJoinRules = workspace.settings?.auto_join_rules || [];

    const ingestionModeLabels: Record<string, string> = {
        team_default: 'Team default (Time-based)',
        time_based: 'Time-based',
        one_to_one: 'One-to-one',
        manual_emoji: 'Manual emoji',
    };

    const filteredChannels = connectedChannels.filter((c) => {
        const matchesSearch = c.name
            .toLowerCase()
            .includes(searchChannelQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || c.type === typeFilter;
        const matchesMode =
            modeFilter === 'all' ||
            (c.ingestion_mode || 'team_default') === modeFilter;

        return matchesSearch && matchesType && matchesMode;
    });

    const persistChannels = (updated: SlackChannelItem[]) => {
        setConnectedChannels(updated);
        router.post(
            `/settings/channels/slack/${workspace.id}`,
            {
                ingestion_mode: ingestionMode,
                enable_reactions: enableReactions,
                enable_discussions: enableDiscussions,
                connected_channels: updated as unknown as Record<
                    string,
                    string
                >[],
            },
            { preserveState: true },
        );
    };

    const updateChannel = (id: string, patch: Partial<SlackChannelItem>) => {
        persistChannels(
            connectedChannels.map((c) =>
                c.id === id ? { ...c, ...patch } : c,
            ),
        );
    };

    const removeChannel = (id: string) => {
        persistChannels(connectedChannels.filter((c) => c.id !== id));
        setSelectedIds((ids) => ids.filter((i) => i !== id));
        setOpenMenuId(null);
    };

    const toggleSelected = (id: string) => {
        setSelectedIds((ids) =>
            ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds((ids) =>
            ids.length === filteredChannels.length
                ? []
                : filteredChannels.map((c) => c.id),
        );
    };

    const bulkApply = (patch: Partial<SlackChannelItem>) => {
        persistChannels(
            connectedChannels.map((c) =>
                selectedIds.includes(c.id) ? { ...c, ...patch } : c,
            ),
        );
    };

    const handleSaveBehavior = (
        newMode: string,
        newReactions: boolean,
        newDiscussions: boolean,
    ) => {
        router.post(
            `/settings/channels/slack/${workspace.id}`,
            {
                ingestion_mode: newMode,
                enable_reactions: newReactions,
                enable_discussions: newDiscussions,
            },
            { preserveState: true },
        );
    };

    const handleDisconnect = async () => {
        if (
            await confirm({
                title: `Disconnect workspace '${workspace.name}'?`,
                description: 'This cannot be undone.',
                confirmText: 'Disconnect',
                variant: 'destructive',
            })
        ) {
            router.delete(`/settings/channels/slack/${workspace.id}`);
        }
    };

    const handleAddRule = (e: React.FormEvent) => {
        e.preventDefault();

        if (!rulePrefix.trim()) {
            return;
        }

        router.post(
            `/settings/channels/slack/${workspace.id}/auto-join`,
            { type: ruleType, value: rulePrefix.trim() },
            {
                preserveState: true,
                onSuccess: () => setRulePrefix(''),
            },
        );
    };

    const handleRemoveRule = (index: number) => {
        router.delete(
            `/settings/channels/slack/${workspace.id}/auto-join/${index}`,
            {
                preserveState: true,
            },
        );
    };

    const handleSyncChannels = () => {
        router.post(syncSlackChannels.url({ channel: workspace.id }));
    };

    const handleBulkJoin = () => {
        router.post(bulkJoinSlackChannels.url({ channel: workspace.id }));
    };

    return (
        <>
            <Head title={`Edit ${workspace.name} — Slack Settings`} />

            <div className="mx-auto max-w-4xl space-y-8 p-8 text-foreground select-none">
                {/* Header Back & Info */}
                <div className="space-y-3">
                    <Link
                        href={`/settings/channels/slack`}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Slack</span>
                    </Link>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Edit connected Slack workspace
                        </h1>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            Connected by{' '}
                            {workspace.settings?.connected_by || 'You'} on{' '}
                            {workspace.settings?.connected_at ||
                                'August 17, 2026'}
                        </p>
                    </div>
                </div>

                {/* Top Workspace Identity Card */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-sm font-bold text-primary">
                            {workspace.name[0] || 'S'}
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-foreground">
                                {workspace.name}
                            </h2>
                            <p className="font-mono text-[11px] text-muted-foreground">
                                Connected by{' '}
                                {workspace.settings?.connected_by || 'You'} on{' '}
                                {workspace.settings?.connected_at ||
                                    'August 17, 2026'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleDisconnect}
                        className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                        Disconnect
                    </button>
                </div>

                {/* Replying As Card */}
                <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">
                            Replying as
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Authorise replies from your Slack profile to have
                            messages sent via Inbxer appear as you in Slack.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                            {replyingAs?.avatar ? (
                                <img
                                    src={replyingAs.avatar}
                                    alt={replyingAs.name}
                                    className="h-8 w-8 rounded-full border border-border object-cover"
                                />
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-foreground uppercase">
                                    {(replyingAs?.name ?? 'U').charAt(0)}
                                </div>
                            )}
                            <span className="text-xs font-bold text-foreground">
                                {replyingAs?.name ?? 'Connect your profile'}
                            </span>
                        </div>

                        {replyingAs ? (
                            <button
                                onClick={() =>
                                    router.delete(
                                        `/settings/channels/slack/${workspace.id}/unlink-replies`,
                                    )
                                }
                                className="cursor-pointer rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-muted"
                            >
                                Unlink
                            </button>
                        ) : (
                            <button
                                onClick={() =>
                                    router.get(
                                        `/settings/channels/slack/${workspace.id}/authorize-replies`,
                                    )
                                }
                                className="cursor-pointer rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-muted"
                            >
                                Authorize replies
                            </button>
                        )}
                    </div>
                </div>

                {/* Channel Behavior Section */}
                <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">
                            Channel behavior
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Default settings for every Slack channel connected
                            to this workspace. Individual channel overrides can
                            be set below.
                        </p>
                    </div>

                    {/* Ingestion Mode Radio Options */}
                    <div className="space-y-3 pt-2">
                        <span className="block text-xs font-bold text-foreground">
                            Ingestion mode
                        </span>

                        <div className="space-y-2">
                            {/* Time-based Ingestion */}
                            <label
                                onClick={() => {
                                    setIngestionMode('time_based');
                                    handleSaveBehavior(
                                        'time_based',
                                        enableReactions,
                                        enableDiscussions,
                                    );
                                }}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                    ingestionMode === 'time_based'
                                        ? 'border-primary bg-primary/5 text-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="ingestion_mode"
                                    checked={ingestionMode === 'time_based'}
                                    onChange={() => {}}
                                    className="mt-0.5 text-primary focus:ring-primary"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-foreground">
                                        Time-based ingestion
                                    </span>
                                    <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">
                                        Decide whether to create a new thread
                                        based on the author and timestamp of the
                                        message.
                                    </p>
                                </div>
                            </label>

                            {/* One-to-one Ingestion */}
                            <label
                                onClick={() => {
                                    setIngestionMode('one_to_one');
                                    handleSaveBehavior(
                                        'one_to_one',
                                        enableReactions,
                                        enableDiscussions,
                                    );
                                }}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                    ingestionMode === 'one_to_one'
                                        ? 'border-primary bg-primary/5 text-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="ingestion_mode"
                                    checked={ingestionMode === 'one_to_one'}
                                    onChange={() => {}}
                                    className="mt-0.5 text-primary focus:ring-primary"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-foreground">
                                        One-to-one ingestion
                                    </span>
                                    <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">
                                        Make a new thread for every top-level
                                        Slack message regardless of timing,
                                        author or content.
                                    </p>
                                </div>
                            </label>

                            {/* Manual Emoji Reaction Ingestion */}
                            <label
                                onClick={() => {
                                    setIngestionMode('manual_emoji');
                                    handleSaveBehavior(
                                        'manual_emoji',
                                        enableReactions,
                                        enableDiscussions,
                                    );
                                }}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                    ingestionMode === 'manual_emoji'
                                        ? 'border-primary bg-primary/5 text-foreground'
                                        : 'border-border bg-card text-muted-foreground hover:border-border/80'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="ingestion_mode"
                                    checked={ingestionMode === 'manual_emoji'}
                                    onChange={() => {}}
                                    className="mt-0.5 text-primary focus:ring-primary"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-foreground">
                                        Manual emoji reaction ingestion
                                    </span>
                                    <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">
                                        Only create a thread when a specific
                                        emoji is added as a reaction.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Reactions Switch */}
                    <div className="space-y-2 border-t border-border pt-4">
                        <span className="block text-xs font-bold text-foreground">
                            Reactions
                        </span>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3">
                            <div>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <span>Enable emoji reactions</span>
                                </span>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    When enabled, adding a{' '}
                                    <span className="text-success">✅</span>{' '}
                                    reaction to a thread's first message will
                                    mark thread as 'Done'. Adding{' '}
                                    <span className="text-primary">👀</span>{' '}
                                    will change its status to 'Investigating'.
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={enableReactions}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    setEnableReactions(val);
                                    handleSaveBehavior(
                                        ingestionMode,
                                        val,
                                        enableDiscussions,
                                    );
                                }}
                                className="h-4 w-4 cursor-pointer rounded text-primary focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Discussions Switch */}
                    <div className="space-y-2 border-t border-border pt-2">
                        <span className="block text-xs font-bold text-foreground">
                            Discussions
                        </span>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3">
                            <div>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <span>Enable thread discussions</span>
                                </span>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    When enabled, any thread URL shared in your
                                    Slack workspace will be unfurled and start a
                                    discussion.
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={enableDiscussions}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    setEnableDiscussions(val);
                                    handleSaveBehavior(
                                        ingestionMode,
                                        enableReactions,
                                        val,
                                    );
                                }}
                                className="h-4 w-4 cursor-pointer rounded text-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Auto-join Rules Section */}
                <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">
                            Auto-join rules
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Define which Slack channels the bot should
                            automatically join, and run a one-off bulk join for
                            channels that already exist.
                        </p>
                    </div>

                    <form
                        onSubmit={handleAddRule}
                        className="flex items-center gap-2 pt-1"
                    >
                        <select
                            value={ruleType}
                            onChange={(e) =>
                                setRuleType(
                                    e.target.value as 'prefix' | 'suffix',
                                )
                            }
                            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        >
                            <option value="prefix">Channels with prefix</option>
                            <option value="suffix">Channels with suffix</option>
                        </select>
                        <input
                            type="text"
                            value={rulePrefix}
                            onChange={(e) => setRulePrefix(e.target.value)}
                            placeholder={
                                ruleType === 'prefix'
                                    ? 'e.g. support-...'
                                    : 'e.g. ...-support'
                            }
                            className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                        />
                        <Button
                            type="submit"
                            className="h-8 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-90"
                        >
                            + Add
                        </Button>
                    </form>

                    {/* Rules Badges */}
                    {autoJoinRules.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {autoJoinRules.map((rule, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 font-mono text-xs text-foreground"
                                >
                                    <span>
                                        {rule.type}: {rule.value}
                                    </span>
                                    <X
                                        onClick={() => handleRemoveRule(idx)}
                                        className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="pt-1 text-xs text-muted-foreground italic">
                            No auto-join rules added yet.
                        </p>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3">
                        <p className="text-[11px] text-muted-foreground">
                            Automatically join newly created channels matching
                            rules.
                        </p>
                        <button
                            type="button"
                            onClick={handleBulkJoin}
                            className="cursor-pointer rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-muted"
                        >
                            Bulk join channels
                        </button>
                    </div>
                </div>

                {/* Connected Channels Table Section */}
                <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">
                            Connected channels
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Messages in Customer channels are ingested as
                            support threads. Discussion channels let you start
                            threads with your team in Slack.
                        </p>
                    </div>

                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSyncChannels}
                        >
                            Sync channels
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="relative max-w-xs flex-1">
                            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchChannelQuery}
                                onChange={(e) =>
                                    setSearchChannelQuery(e.target.value)
                                }
                                placeholder="Search channels..."
                                className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-8 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                Type:
                                <select
                                    value={typeFilter}
                                    onChange={(e) =>
                                        setTypeFilter(e.target.value)
                                    }
                                    className="cursor-pointer rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-bold text-foreground focus:outline-none"
                                >
                                    <option value="all">All types</option>
                                    <option value="Customer">Customer</option>
                                    <option value="Discussion">
                                        Discussion
                                    </option>
                                    <option value="Disabled">Disabled</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                Ingestion mode:
                                <select
                                    value={modeFilter}
                                    onChange={(e) =>
                                        setModeFilter(e.target.value)
                                    }
                                    className="cursor-pointer rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-bold text-foreground focus:outline-none"
                                >
                                    <option value="all">All modes</option>
                                    {Object.entries(ingestionModeLabels).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                {filteredChannels.length} of{' '}
                                {connectedChannels.length}
                            </span>
                        </div>
                    </div>

                    {/* Bulk Edit Toolbar */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                            <span className="text-[11px] font-semibold text-foreground">
                                {selectedIds.length} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <select
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            bulkApply({ type: e.target.value });
                                        }

                                        e.target.value = '';
                                    }}
                                    className="cursor-pointer rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none"
                                >
                                    <option value="" disabled>
                                        Set type…
                                    </option>
                                    <option value="Customer">Customer</option>
                                    <option value="Discussion">
                                        Discussion
                                    </option>
                                    <option value="Disabled">Disabled</option>
                                </select>
                                <select
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            bulkApply({
                                                ingestion_mode: e.target.value,
                                            });
                                        }

                                        e.target.value = '';
                                    }}
                                    className="cursor-pointer rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none"
                                >
                                    <option value="" disabled>
                                        Set ingestion mode…
                                    </option>
                                    {Object.entries(ingestionModeLabels).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Channels Table */}
                    <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                    <th className="w-8 p-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedIds.length > 0 &&
                                                selectedIds.length ===
                                                    filteredChannels.length
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-border text-primary"
                                        />
                                    </th>
                                    <th className="p-3">Channel</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Ingestion mode</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-xs">
                                {filteredChannels.map((ch) => (
                                    <tr
                                        key={ch.id}
                                        className="transition-colors hover:bg-muted/20"
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(
                                                    ch.id,
                                                )}
                                                onChange={() =>
                                                    toggleSelected(ch.id)
                                                }
                                                className="rounded border-border text-primary"
                                            />
                                        </td>
                                        <td className="flex items-center gap-1.5 p-3 font-mono font-semibold text-foreground">
                                            <span>{ch.name}</span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={ch.type}
                                                onChange={(e) =>
                                                    updateChannel(ch.id, {
                                                        type: e.target.value,
                                                    })
                                                }
                                                className={`cursor-pointer rounded border px-2 py-0.5 text-[10px] font-semibold focus:outline-none ${
                                                    ch.type === 'Disabled'
                                                        ? 'border-border bg-muted text-muted-foreground'
                                                        : 'border-success/20 bg-success/10 text-success'
                                                }`}
                                            >
                                                <option value="Customer">
                                                    Customer
                                                </option>
                                                <option value="Discussion">
                                                    Discussion
                                                </option>
                                                <option value="Disabled">
                                                    Disabled
                                                </option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={
                                                    ch.ingestion_mode ||
                                                    'team_default'
                                                }
                                                onChange={(e) =>
                                                    updateChannel(ch.id, {
                                                        ingestion_mode:
                                                            e.target.value,
                                                    })
                                                }
                                                className="cursor-pointer bg-transparent text-xs text-muted-foreground focus:outline-none"
                                            >
                                                {Object.entries(
                                                    ingestionModeLabels,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="relative p-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenMenuId(
                                                        openMenuId === ch.id
                                                            ? null
                                                            : ch.id,
                                                    )
                                                }
                                                className="cursor-pointer px-1 font-bold text-muted-foreground hover:text-foreground"
                                            >
                                                •••
                                            </button>
                                            {openMenuId === ch.id && (
                                                <div className="absolute top-8 right-3 z-10 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                                                    <button
                                                        onClick={() =>
                                                            removeChannel(ch.id)
                                                        }
                                                        className="w-full cursor-pointer px-3 py-1.5 text-left text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                                                    >
                                                        Remove channel
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {filteredChannels.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-8 text-center text-xs text-muted-foreground"
                                        >
                                            No Slack channels connected yet. The
                                            bot will automatically join channels
                                            matching your auto-join rules.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
