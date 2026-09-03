import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ChevronDown, Plus, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/hooks/use-confirm';

interface ConditionRule {
    field: string;
    operator: string;
    value: string | string[];
}

interface ConditionFieldOption {
    value: string;
    label: string;
    type: 'select' | 'text';
    multiple: boolean;
}

interface AutoResponseEditProps {
    autoResponse: {
        id: string;
        name: string;
        message: string;
        channels: string[];
        conditions: { logic: 'and' | 'or'; conditions: ConditionRule[] };
        is_enabled: boolean;
        respect_business_hours: boolean;
    };
    channelOptions: Array<{ value: string; label: string }>;
    conditionFields: {
        fields: ConditionFieldOption[];
        operators: Array<{ value: string; label: string }>;
        statuses: Array<{ value: string; label: string }>;
        priorities: Array<{ value: string; label: string }>;
        tiers: Array<{ value: string; label: string }>;
        labels: Array<{ value: string; label: string }>;
    };
}

function MultiSelectValue({
    options,
    value,
    onChange,
}: {
    options: Array<{ value: string; label: string }>;
    value: string[];
    onChange: (value: string[]) => void;
}) {
    const toggle = (optionValue: string) => {
        onChange(
            value.includes(optionValue)
                ? value.filter((v) => v !== optionValue)
                : [...value, optionValue],
        );
    };

    const summary =
        value.length === 0
            ? 'Select value(s)'
            : options
                  .filter((o) => value.includes(o.value))
                  .map((o) => o.label)
                  .join(', ');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-8 flex-1 justify-between overflow-hidden text-xs font-normal"
                >
                    <span className="truncate">{summary}</span>
                    <ChevronDown className="size-3.5 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="max-h-64 overflow-y-auto"
            >
                {options.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        No options available.
                    </p>
                ) : (
                    options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={value.includes(option.value)}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={() => toggle(option.value)}
                        >
                            {option.label}
                        </DropdownMenuCheckboxItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function AutoResponseEditPage({
    autoResponse,
    channelOptions,
    conditionFields,
}: AutoResponseEditProps) {
    const confirm = useConfirm();
    const [isEnabled, setIsEnabled] = React.useState(autoResponse.is_enabled);
    const [respectBusinessHours, setRespectBusinessHours] = React.useState(
        autoResponse.respect_business_hours,
    );
    const [name, setName] = React.useState(autoResponse.name);
    const [message, setMessage] = React.useState(autoResponse.message);
    const [channels, setChannels] = React.useState<string[]>(
        autoResponse.channels,
    );
    const [conditions, setConditions] = React.useState<ConditionRule[]>(
        autoResponse.conditions.conditions ?? [],
    );
    const [logic, setLogic] = React.useState<'and' | 'or'>(
        autoResponse.conditions.logic ?? 'and',
    );
    const [saving, setSaving] = React.useState(false);

    const valueOptionsFor = React.useCallback(
        (field: string): Array<{ value: string; label: string }> => {
            switch (field) {
                case 'status':
                    return conditionFields.statuses;
                case 'priority':
                    return conditionFields.priorities;
                case 'tier':
                    return conditionFields.tiers;
                case 'label':
                    return conditionFields.labels;
                default:
                    return [];
            }
        },
        [conditionFields],
    );

    const fieldDefinition = (field: string): ConditionFieldOption | undefined =>
        conditionFields.fields.find((f) => f.value === field);

    const toggleChannel = (value: string) => {
        setChannels((prev) =>
            prev.includes(value)
                ? prev.filter((c) => c !== value)
                : [...prev, value],
        );
    };

    const addCondition = () => {
        const firstField = conditionFields.fields[0];

        setConditions((prev) => [
            ...prev,
            {
                field: firstField?.value ?? '',
                operator: 'is',
                value: firstField?.multiple ? [] : '',
            },
        ]);
    };

    const updateCondition = (idx: number, patch: Partial<ConditionRule>) => {
        setConditions((prev) =>
            prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
        );
    };

    const handleFieldChange = (idx: number, field: string) => {
        const definition = fieldDefinition(field);
        updateCondition(idx, { field, value: definition?.multiple ? [] : '' });
    };

    const removeCondition = (idx: number) => {
        setConditions((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        setSaving(true);
        router.patch(
            window.location.pathname,
            {
                name,
                message,
                channels,
                conditions: { logic, conditions } as any,
                is_enabled: isEnabled,
                respect_business_hours: respectBusinessHours,
            },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const handleDelete = async () => {
        if (
            !(await confirm({
                title: 'Delete this auto-response?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(window.location.pathname);
    };

    const goBack = () => {
        router.get(
            window.location.pathname.replace(
                new RegExp(`/${autoResponse.id}$`),
                '',
            ),
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
            <Head title={`${autoResponse.name} — Auto-response`} />

            <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                Auto-responses
            </button>

            <h1 className="text-xl font-semibold">Edit auto-response</h1>

            <div className="flex items-center gap-2">
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                <span className="text-sm">
                    This auto-response is currently{' '}
                    <strong>{isEnabled ? 'enabled' : 'disabled'}</strong>.
                </span>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Name</label>
                <p className="text-xs text-muted-foreground">
                    This name is for internal use only, it will never be shown
                    to a customer.
                </p>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Message</label>
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-32"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                    Reply to messages via
                </label>
                {channelOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        No active channels are connected yet.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {channelOptions.map((option) => (
                            <label
                                key={option.value}
                                className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={channels.includes(option.value)}
                                    onChange={() => toggleChannel(option.value)}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    checked={respectBusinessHours}
                    onCheckedChange={setRespectBusinessHours}
                />
                <span className="text-sm">Only send during business hours</span>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Conditions</label>
                {conditions.length === 0 ? (
                    <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">
                            You currently have no conditions set.
                        </p>
                        <p>
                            Every customer message will receive this
                            auto-response unless a previous auto-response has
                            been sent.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCondition}
                            className="mt-2"
                        >
                            <Plus data-icon="inline-start" />
                            Add new condition
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                        {conditions.map((rule, idx) => {
                            const definition = fieldDefinition(rule.field);
                            const isSelect = definition?.type === 'select';

                            return (
                                <React.Fragment key={idx}>
                                    {idx > 0 && (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={logic}
                                                onChange={(e) =>
                                                    setLogic(
                                                        e.target.value as
                                                            'and' | 'or',
                                                    )
                                                }
                                                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                                            >
                                                <option value="and">AND</option>
                                                <option value="or">OR</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={rule.field}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    idx,
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                                        >
                                            {conditionFields.fields.map((f) => (
                                                <option
                                                    key={f.value}
                                                    value={f.value}
                                                >
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={rule.operator}
                                            onChange={(e) =>
                                                updateCondition(idx, {
                                                    operator: e.target.value,
                                                })
                                            }
                                            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                                        >
                                            {conditionFields.operators.map(
                                                (o) => (
                                                    <option
                                                        key={o.value}
                                                        value={o.value}
                                                    >
                                                        {o.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        {isSelect ? (
                                            <MultiSelectValue
                                                options={valueOptionsFor(
                                                    rule.field,
                                                )}
                                                value={
                                                    Array.isArray(rule.value)
                                                        ? rule.value
                                                        : []
                                                }
                                                onChange={(value) =>
                                                    updateCondition(idx, {
                                                        value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            <Input
                                                value={
                                                    Array.isArray(rule.value)
                                                        ? ''
                                                        : rule.value
                                                }
                                                onChange={(e) =>
                                                    updateCondition(idx, {
                                                        value: e.target.value,
                                                    })
                                                }
                                                placeholder="Value"
                                                className="h-8 flex-1 text-xs"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeCondition(idx)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCondition}
                        >
                            <Plus data-icon="inline-start" />
                            Add new condition
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 pt-2">
                <Button disabled={saving} onClick={handleSave}>
                    Save
                </Button>
                <Button
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                >
                    Delete
                </Button>
            </div>
        </div>
    );
}
