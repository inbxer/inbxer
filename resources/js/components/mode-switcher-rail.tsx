import { Link } from '@inertiajs/react';
import {
    BarChart3,
    Bot,
    Inbox,
    SlidersHorizontal,
    Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

type Mode = 'support' | 'workflows' | 'ai' | 'insights' | 'settings';

interface ModeSwitcherRailProps {
    mode: Mode;
}

const MODES: Array<{
    id: Mode;
    title: string;
    icon: LucideIcon;
    href: string;
}> = [
    { id: 'support', title: 'Support', icon: Inbox, href: '/threads' },
    { id: 'workflows', title: 'Workflows', icon: Workflow, href: '/workflows' },
    { id: 'ai', title: 'AI Agent', icon: Bot, href: '/ai' },
    { id: 'insights', title: 'Insights', icon: BarChart3, href: '/insights' },
    {
        id: 'settings',
        title: 'Settings',
        icon: SlidersHorizontal,
        href: '/settings',
    },
];

export function ModeSwitcherRail({ mode }: ModeSwitcherRailProps) {
    return (
        <div className="sticky top-0 hidden h-svh w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 md:flex">
            {MODES.map((item) => {
                const active = item.id === mode;

                return (
                    <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                            <Link
                                href={item.href}
                                aria-label={item.title}
                                aria-current={active ? 'page' : undefined}
                                className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                                    active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                                }`}
                            >
                                <item.icon className="size-5" />
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {item.title}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}
