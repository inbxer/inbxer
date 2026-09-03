import {
    Ban,
    CheckCircle2,
    Clock,
    Pause,
    Reply,
    RotateCcw,
    Search,
    ShieldAlert,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ThreadStatusOption {
    value: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

// Mirrors app/Domain/Thread/Enums/ThreadStatus.php exactly (label/value/color).
export const THREAD_STATUS_OPTIONS: ThreadStatusOption[] = [
    {
        value: 'needs_first_response',
        label: 'Needs first response',
        icon: Sparkles,
        color: 'text-primary',
    },
    {
        value: 'needs_next_response',
        label: 'Needs next response',
        icon: Reply,
        color: 'text-primary',
    },
    {
        value: 'investigating',
        label: 'Investigating',
        icon: Search,
        color: 'text-primary',
    },
    {
        value: 'close_the_loop',
        label: 'Close the loop',
        icon: RotateCcw,
        color: 'text-primary',
    },
    {
        value: 'waiting_for_customer',
        label: 'Waiting for customer',
        icon: Clock,
        color: 'text-warning',
    },
    {
        value: 'paused_for_later',
        label: 'Paused for later',
        icon: Pause,
        color: 'text-warning',
    },
    {
        value: 'ignored',
        label: 'Ignored',
        icon: Ban,
        color: 'text-muted-foreground',
    },
    { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-success' },
    {
        value: 'spam',
        label: 'Spam',
        icon: ShieldAlert,
        color: 'text-destructive',
    },
];

const STATUS_ALIASES: Record<string, string> = {
    open: 'needs_first_response',
    snoozed: 'waiting_for_customer',
};

export function getThreadStatusOption(
    status?: string | null,
): ThreadStatusOption {
    const normalized =
        STATUS_ALIASES[status || ''] || status || 'needs_first_response';

    return (
        THREAD_STATUS_OPTIONS.find((o) => o.value === normalized) ||
        THREAD_STATUS_OPTIONS[0]
    );
}
