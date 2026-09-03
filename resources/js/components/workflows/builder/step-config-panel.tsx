import { Trash2, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
    ConditionConfig,
    ConditionFieldsMeta,
    ConditionRule,
    LabelOption,
    SlackWorkspaceOption,
    StepNode,
    TeamMemberOption,
    TierOption,
} from './types';

interface StepConfigPanelProps {
    step: StepNode;
    conditionFields: ConditionFieldsMeta;
    teamMembers: TeamMemberOption[];
    availableLabels: LabelOption[];
    availableTiers: TierOption[];
    slackWorkspaces: SlackWorkspaceOption[];
    onChange: (config: Record<string, unknown>) => void;
    onDelete: () => void;
    onClose: () => void;
}

export function StepConfigPanel({
    step,
    conditionFields,
    teamMembers,
    availableLabels,
    availableTiers,
    slackWorkspaces,
    onChange,
    onDelete,
    onClose,
}: StepConfigPanelProps) {
    return (
        <div className="flex h-full w-80 flex-col border-l border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-3">
                <h3 className="text-sm font-semibold">
                    {step.type === 'condition'
                        ? 'Configure if/else'
                        : 'Configure action'}
                </h3>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Delete block</TooltipContent>
                    </Tooltip>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-3">
                {step.type === 'condition' ? (
                    <ConditionConfigForm
                        config={
                            (step.config as unknown as ConditionConfig) ?? {
                                logic: 'and',
                                conditions: [],
                            }
                        }
                        fields={conditionFields}
                        onChange={onChange}
                    />
                ) : (
                    <ActionConfigForm
                        step={step}
                        teamMembers={teamMembers}
                        availableLabels={availableLabels}
                        availableTiers={availableTiers}
                        slackWorkspaces={slackWorkspaces}
                        conditionFields={conditionFields}
                        onChange={onChange}
                    />
                )}
            </div>
        </div>
    );
}

function ConditionConfigForm({
    config,
    fields,
    onChange,
}: {
    config: ConditionConfig;
    fields: ConditionFieldsMeta;
    onChange: (config: Record<string, unknown>) => void;
}) {
    const conditions = config.conditions ?? [];

    const updateRule = (idx: number, patch: Partial<ConditionRule>) => {
        const next = conditions.map((c, i) =>
            i === idx ? { ...c, ...patch } : c,
        );
        onChange({ ...config, conditions: next });
    };

    const removeRule = (idx: number) => {
        onChange({
            ...config,
            conditions: conditions.filter((_, i) => i !== idx),
        });
    };

    const addRule = () => {
        onChange({
            ...config,
            conditions: [
                ...conditions,
                {
                    field: fields.fields[0]?.value ?? '',
                    operator: 'is',
                    value: '',
                },
            ],
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground">
                    Match
                </label>
                <select
                    value={config.logic}
                    onChange={(e) =>
                        onChange({ ...config, logic: e.target.value })
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                    <option value="and">All conditions (AND)</option>
                    <option value="or">Any condition (OR)</option>
                </select>
            </div>

            <div className="space-y-2">
                {conditions.map((rule, idx) => (
                    <div
                        key={idx}
                        className="space-y-2 rounded-md border border-border p-2.5"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                Condition {idx + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeRule(idx)}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                        <select
                            value={rule.field}
                            onChange={(e) =>
                                updateRule(idx, { field: e.target.value })
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        >
                            {fields.fields.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={rule.operator}
                            onChange={(e) =>
                                updateRule(idx, { operator: e.target.value })
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        >
                            {fields.operators.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        {rule.field === 'status' ? (
                            <select
                                value={rule.value}
                                onChange={(e) =>
                                    updateRule(idx, { value: e.target.value })
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                            >
                                <option value="">Select status...</option>
                                {fields.statuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        ) : rule.field === 'priority' ? (
                            <select
                                value={rule.value}
                                onChange={(e) =>
                                    updateRule(idx, { value: e.target.value })
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                            >
                                <option value="">Select priority...</option>
                                {fields.priorities.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                value={rule.value}
                                onChange={(e) =>
                                    updateRule(idx, { value: e.target.value })
                                }
                                placeholder="Value"
                                className="h-8 text-xs"
                            />
                        )}
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                className="w-full"
            >
                Add condition
            </Button>
        </div>
    );
}

function ActionConfigForm({
    step,
    teamMembers,
    availableLabels,
    availableTiers,
    slackWorkspaces,
    onChange,
}: {
    step: StepNode;
    teamMembers: TeamMemberOption[];
    availableLabels: LabelOption[];
    availableTiers: TierOption[];
    slackWorkspaces: SlackWorkspaceOption[];
    conditionFields: ConditionFieldsMeta;
    onChange: (config: Record<string, unknown>) => void;
}) {
    const config = step.config as Record<string, unknown>;

    switch (step.actionType) {
        case 'apply_labels':
        case 'remove_labels': {
            const selected = (config.label_ids as string[]) ?? [];

            return (
                <LabelPicker
                    labels={availableLabels}
                    selected={selected}
                    onChange={(label_ids) => onChange({ label_ids })}
                />
            );
        }

        case 'assign_to_user':
            return (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Assign to
                    </label>
                    <select
                        value={(config.user_id as string) ?? ''}
                        onChange={(e) =>
                            onChange({ user_id: e.target.value || null })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                        <option value="">Select a user...</option>
                        {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'set_priority':
            return (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Priority
                    </label>
                    <select
                        value={(config.priority as string) ?? ''}
                        onChange={(e) => onChange({ priority: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                        <option value="">Select priority...</option>
                        {['urgent', 'high', 'normal', 'low'].map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'set_status':
            return (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Status
                    </label>
                    <select
                        value={(config.status as string) ?? ''}
                        onChange={(e) => onChange({ status: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                        <option value="">Select status...</option>
                        {[
                            'needs_first_response',
                            'needs_next_response',
                            'investigating',
                            'close_the_loop',
                            'waiting_for_customer',
                            'paused_for_later',
                            'ignored',
                            'done',
                        ].map((s) => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'set_tier':
            return (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Tier
                    </label>
                    <select
                        value={(config.tier_id as string) ?? ''}
                        onChange={(e) =>
                            onChange({ tier_id: e.target.value || null })
                        }
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                        <option value="">No tier</option>
                        {availableTiers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'add_note':
            return (
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Note body
                    </label>
                    <Textarea
                        value={(config.body as string) ?? ''}
                        onChange={(e) => onChange({ body: e.target.value })}
                        className="min-h-24 text-xs"
                        placeholder="Investigate before replying..."
                    />
                </div>
            );

        case 'lock_thread':
            return (
                <p className="text-xs text-muted-foreground">
                    This action has no additional configuration — it locks the
                    thread when reached.
                </p>
            );

        case 'assign_to_ai':
            return (
                <p className="text-xs text-muted-foreground">
                    Hands this thread to the AI Agent, following its current
                    Preferences (Live/Shadow mode).
                </p>
            );

        case 'send_slack_notification':
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Slack workspace
                        </label>
                        <select
                            value={(config.channel_id as string) ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...config,
                                    channel_id: e.target.value,
                                })
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        >
                            <option value="">Select workspace...</option>
                            {slackWorkspaces.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Slack channel ID
                        </label>
                        <Input
                            value={(config.slack_channel_id as string) ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...config,
                                    slack_channel_id: e.target.value,
                                })
                            }
                            placeholder="C0123456789"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Message
                        </label>
                        <Textarea
                            value={(config.message as string) ?? ''}
                            onChange={(e) =>
                                onChange({ ...config, message: e.target.value })
                            }
                            className="min-h-20 text-xs"
                            placeholder="New thread {{thread.reference}}: {{thread.title}}"
                        />
                    </div>
                </div>
            );

        case 'send_http_request':
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            URL
                        </label>
                        <Input
                            value={(config.url as string) ?? ''}
                            onChange={(e) =>
                                onChange({ ...config, url: e.target.value })
                            }
                            placeholder="https://example.com/webhook"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Method
                        </label>
                        <select
                            value={(config.method as string) ?? 'post'}
                            onChange={(e) =>
                                onChange({ ...config, method: e.target.value })
                            }
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        >
                            <option value="post">POST</option>
                            <option value="put">PUT</option>
                            <option value="patch">PATCH</option>
                        </select>
                    </div>
                </div>
            );

        default:
            return (
                <p className="text-xs text-muted-foreground">
                    This action has no additional configuration.
                </p>
            );
    }
}

function LabelPicker({
    labels,
    selected,
    onChange,
}: {
    labels: LabelOption[];
    selected: string[];
    onChange: (ids: string[]) => void;
}) {
    const toggle = (id: string) => {
        onChange(
            selected.includes(id)
                ? selected.filter((s) => s !== id)
                : [...selected, id],
        );
    };

    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
                Labels
            </label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1.5">
                {labels.map((label) => (
                    <label
                        key={label.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs hover:bg-muted"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(label.id)}
                            onChange={() => toggle(label.id)}
                        />
                        <span
                            className="size-1.5 rounded-full"
                            style={{
                                backgroundColor: label.color || undefined,
                            }}
                        />
                        {label.name}
                    </label>
                ))}
                {labels.length === 0 && (
                    <p className="p-2 text-center text-[11px] text-muted-foreground">
                        No labels yet
                    </p>
                )}
            </div>
        </div>
    );
}
