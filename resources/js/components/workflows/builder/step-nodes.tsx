import { Handle, Position } from '@xyflow/react';
import {
    Bell,
    CheckSquare,
    FileText,
    GitBranch,
    Globe,
    Lock,
    Play,
    Plus,
    Slack,
    Sparkles,
    Tag,
    Tags,
    UserMinus,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StepNode } from './types';

const ACTION_ICONS: Record<string, LucideIcon> = {
    apply_labels: Tag,
    remove_labels: Tags,
    assign_to_user: UserPlus,
    unassign_thread: UserMinus,
    set_priority: Bell,
    set_status: CheckSquare,
    set_tier: Tag,
    add_note: FileText,
    lock_thread: Lock,
    assign_to_ai: Sparkles,
    send_slack_notification: Slack,
    send_http_request: Globe,
};

export function TriggerNode({
    data,
    selected,
}: {
    data: { label: string };
    selected: boolean;
}) {
    return (
        <div
            className={`w-64 cursor-pointer rounded-lg border bg-card shadow-sm ${selected ? 'border-primary ring-1 ring-primary' : 'border-success/40'}`}
        >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex size-5 items-center justify-center rounded bg-success/20 text-success">
                    <Play className="size-3" />
                </div>
                <span className="text-xs font-semibold">Start</span>
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground">
                {data.label}
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

export function ConditionNode({
    data,
    selected,
}: {
    data: { step: StepNode };
    selected: boolean;
}) {
    const { step } = data;
    const summary = summarizeConditions(step.config as never);

    return (
        <div
            className={`w-64 rounded-lg border bg-card shadow-sm ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
        >
            <Handle type="target" position={Position.Top} />
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex size-5 items-center justify-center rounded bg-warning/20 text-warning">
                    <GitBranch className="size-3" />
                </div>
                <span className="text-xs font-semibold">If/else</span>
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground">
                {summary || 'Click to configure condition'}
            </div>
            <div className="flex items-center justify-between px-3 pb-1.5 text-[10px] font-semibold">
                <span className="text-success">If</span>
                <span className="text-muted-foreground">Else</span>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="if"
                style={{ left: '28%' }}
                className="!bg-success"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="else"
                style={{ left: '72%' }}
            />
        </div>
    );
}

export function ActionNode({
    data,
    selected,
}: {
    data: { step: StepNode };
    selected: boolean;
}) {
    const { step } = data;
    const Icon = ACTION_ICONS[step.actionType] ?? CheckSquare;

    return (
        <div
            className={`w-64 rounded-lg border bg-card shadow-sm ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
        >
            <Handle type="target" position={Position.Top} />
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex size-5 items-center justify-center rounded bg-primary/20 text-primary">
                    <Icon className="size-3" />
                </div>
                <span className="text-xs font-semibold">
                    {actionLabel(step.actionType)}
                </span>
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground">
                {actionSummary(step)}
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

export function AddBlockNode() {
    return (
        <>
            <Handle type="target" position={Position.Top} />
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                        <Plus className="size-4" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>Add block</TooltipContent>
            </Tooltip>
        </>
    );
}

function actionLabel(actionType: string): string {
    const labels: Record<string, string> = {
        apply_labels: 'Apply labels',
        remove_labels: 'Remove labels',
        assign_to_user: 'Assign to user',
        unassign_thread: 'Unassign thread',
        set_priority: 'Set priority',
        set_status: 'Set status',
        set_tier: 'Set tier',
        add_note: 'Add note',
        lock_thread: 'Lock thread',
        assign_to_ai: 'Assign to AI Agent',
        send_slack_notification: 'Send Slack notification',
        send_http_request: 'Send HTTP request',
    };

    return labels[actionType] ?? actionType;
}

function actionSummary(step: StepNode): string {
    const config = step.config as Record<string, unknown>;

    switch (step.actionType) {
        case 'set_priority':
            return `Priority → ${config.priority ?? '…'}`;
        case 'set_status':
            return `Status → ${config.status ?? '…'}`;
        case 'add_note':
            return (config.body as string) || 'Click to configure';
        case 'send_slack_notification':
            return (config.message as string) || 'Click to configure';
        default:
            return 'Click to configure';
    }
}

function summarizeConditions(
    config: {
        logic?: string;
        conditions?: Array<{ field: string; operator: string; value: string }>;
    } | null,
): string {
    if (!config?.conditions?.length) {
        return '';
    }

    const joiner = config.logic === 'or' ? ' OR ' : ' AND ';

    return config.conditions
        .map((c) => `${c.field} ${c.operator.replace('_', ' ')} ${c.value}`)
        .join(joiner);
}
