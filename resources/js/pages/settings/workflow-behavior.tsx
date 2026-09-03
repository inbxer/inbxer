import { Head, router } from '@inertiajs/react';
import { CircleUserRound, UserRoundCheck } from 'lucide-react';
import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface WorkflowSettings {
    sticky_assignment: { on_snooze: string; on_done: string };
    auto_assignment: { assign_on_reply_from_slack_teams: boolean };
    away_mode: { unassign_on_away: string; outside_hours_mode: string };
    status: { after_reply_outside: string; move_waiting_to_done_after: string };
    saved_views: { manage_permission: string };
}

interface WorkflowBehaviorPageProps {
    settings: WorkflowSettings;
    statusOptions: Array<{ value: string; label: string }>;
}

function Row({
    icon: Icon,
    title,
    description,
    control,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    control: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-border p-3 last:border-b-0">
            <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">{title}</p>
                    {description && (
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}

function StickySelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="stay_assigned">Stay assigned</SelectItem>
                <SelectItem value="unassign">Unassign</SelectItem>
            </SelectContent>
        </Select>
    );
}

export default function WorkflowBehaviorPage({
    settings,
    statusOptions,
}: WorkflowBehaviorPageProps) {
    const [form, setForm] = React.useState<WorkflowSettings>(settings);
    const [saving, setSaving] = React.useState(false);

    const save = (next: WorkflowSettings) => {
        setForm(next);
        setSaving(true);
        router.patch(window.location.pathname, next as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
            <Head title="Workflow" />

            <div>
                <h1 className="text-xl font-semibold">Workflow</h1>
                {saving && (
                    <p className="text-xs text-muted-foreground">Saving…</p>
                )}
            </div>

            <section className="space-y-2">
                <div>
                    <h2 className="text-sm font-semibold">Sticky assignment</h2>
                    <p className="text-xs text-muted-foreground">
                        By default, when you assign yourself to a thread you
                        stay assigned. Toggle this behaviour if you want to
                        automatically be unassigned when snoozing or marking a
                        thread as done.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                    <Row
                        icon={CircleUserRound}
                        title="When a thread is snoozed..."
                        control={
                            <StickySelect
                                value={form.sticky_assignment.on_snooze}
                                onChange={(v) =>
                                    save({
                                        ...form,
                                        sticky_assignment: {
                                            ...form.sticky_assignment,
                                            on_snooze: v,
                                        },
                                    })
                                }
                            />
                        }
                    />
                    <Row
                        icon={UserRoundCheck}
                        title="When a thread is moved to done..."
                        control={
                            <StickySelect
                                value={form.sticky_assignment.on_done}
                                onChange={(v) =>
                                    save({
                                        ...form,
                                        sticky_assignment: {
                                            ...form.sticky_assignment,
                                            on_done: v,
                                        },
                                    })
                                }
                            />
                        }
                    />
                </div>
            </section>

            <section className="space-y-2">
                <div>
                    <h2 className="text-sm font-semibold">
                        Automatic assignment
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Control when Inbxer automatically assigns your users to
                        threads.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                    <Row
                        icon={CircleUserRound}
                        title="Automatically assign users to threads they reply from Slack or MS Teams"
                        control={
                            <Switch
                                checked={
                                    form.auto_assignment
                                        .assign_on_reply_from_slack_teams
                                }
                                onCheckedChange={(checked) =>
                                    save({
                                        ...form,
                                        auto_assignment: {
                                            assign_on_reply_from_slack_teams:
                                                checked,
                                        },
                                    })
                                }
                            />
                        }
                    />
                </div>
            </section>

            <section className="space-y-2">
                <div>
                    <h2 className="text-sm font-semibold">Away mode</h2>
                    <p className="text-xs text-muted-foreground">
                        Control how threads are unassigned when a user is away.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                    <Row
                        icon={CircleUserRound}
                        title="Unassign all currently assigned threads as soon as the user goes away."
                        control={
                            <Select
                                value={form.away_mode.unassign_on_away}
                                onValueChange={(v) =>
                                    save({
                                        ...form,
                                        away_mode: {
                                            ...form.away_mode,
                                            unassign_on_away: v,
                                        },
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 w-48 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediately">
                                        Unassign immediately
                                    </SelectItem>
                                    <SelectItem value="never">Never</SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />
                    <Row
                        icon={CircleUserRound}
                        title="When users are outside working hours, set them to..."
                        description="When set to away mode, threads will be unassigned based on your away mode configuration above."
                        control={
                            <Select
                                value={form.away_mode.outside_hours_mode}
                                onValueChange={(v) =>
                                    save({
                                        ...form,
                                        away_mode: {
                                            ...form.away_mode,
                                            outside_hours_mode: v,
                                        },
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 w-40 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="offline_mode">
                                        Offline mode
                                    </SelectItem>
                                    <SelectItem value="away_mode">
                                        Away mode
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />
                </div>
            </section>

            <section className="space-y-2">
                <div>
                    <h2 className="text-sm font-semibold">Status</h2>
                    <p className="text-xs text-muted-foreground">
                        Set-up how and when threads move between statuses
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                    <Row
                        icon={CircleUserRound}
                        title="After replying to a thread outside of Inbxer, move threads to..."
                        description="This applies when replying via Slack, MS Teams, or an external email client"
                        control={
                            <Select
                                value={form.status.after_reply_outside}
                                onValueChange={(v) =>
                                    save({
                                        ...form,
                                        status: {
                                            ...form.status,
                                            after_reply_outside: v,
                                        },
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 w-48 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    />
                    <Row
                        icon={UserRoundCheck}
                        title="Move waiting for customer threads to done after..."
                        control={
                            <Select
                                value={form.status.move_waiting_to_done_after}
                                onValueChange={(v) =>
                                    save({
                                        ...form,
                                        status: {
                                            ...form.status,
                                            move_waiting_to_done_after: v,
                                        },
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="never">Never</SelectItem>
                                    <SelectItem value="1h">1 hour</SelectItem>
                                    <SelectItem value="4h">4 hours</SelectItem>
                                    <SelectItem value="24h">
                                        24 hours
                                    </SelectItem>
                                    <SelectItem value="3d">3 days</SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />
                </div>
            </section>

            <section className="space-y-2">
                <div>
                    <h2 className="text-sm font-semibold">Saved views</h2>
                    <p className="text-xs text-muted-foreground">
                        Control which users can create, update, and delete saved
                        views in your workspace.
                    </p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                    <Row
                        icon={CircleUserRound}
                        title="Who can manage saved views"
                        control={
                            <Select
                                value={form.saved_views.manage_permission}
                                onValueChange={(v) =>
                                    save({
                                        ...form,
                                        saved_views: { manage_permission: v },
                                    })
                                }
                            >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="everyone">
                                        Everyone
                                    </SelectItem>
                                    <SelectItem value="admins">
                                        Admins
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        }
                    />
                </div>
            </section>
        </div>
    );
}
