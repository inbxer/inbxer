import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    BarChart3,
    BookOpen,
    Building2,
    CheckSquare2,
    ChevronDown,
    CircleUserRound,
    Clock,
    Contact,
    FileText,
    Flag,
    Hash,
    Inbox,
    KeyRound,
    Layers3,
    LayoutGrid,
    MessageCircle,
    MessageSquareText,
    Palette,
    PlayCircle,
    Reply,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    Tags,
    UsersRound,
    Users,
    Users2,
    Webhook as WebhookIcon,
    Workflow,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';
import type { SidebarStats } from '@/types';

type PlatformSidebarProps = {
    mode: 'support' | 'settings' | 'workflows' | 'ai' | 'insights';
};

type SidebarLinkProps = {
    title: string;
    href: string;
    icon: ComponentType;
    count?: number;
    active: boolean;
};

function SidebarLink({
    title,
    href,
    icon: Icon,
    count,
    active,
}: SidebarLinkProps) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={active} tooltip={title}>
                <Link href={href} prefetch>
                    <Icon />
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
            {count !== undefined && (
                <SidebarMenuBadge>{count}</SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    );
}

function PersistentSidebarSection({
    id,
    title,
    storageScope,
    children,
}: {
    id: string;
    title: string;
    storageScope: string;
    children: ReactNode;
}) {
    const storageKey = `inbxer:sidebar:${storageScope}:${id}`;
    const [open, setOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.localStorage.getItem(storageKey) !== 'closed';
    });

    const changeOpen = (nextOpen: boolean) => {
        setOpen(nextOpen);
        window.localStorage.setItem(storageKey, nextOpen ? 'open' : 'closed');
    };

    return (
        <Collapsible
            open={open}
            onOpenChange={changeOpen}
            className="group/section"
        >
            <SidebarGroup>
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="w-full cursor-pointer">
                        <span>{title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/section:-rotate-90" />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                    <SidebarGroupContent>
                        <SidebarMenu>{children}</SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

function SidebarNestedItems({
    id,
    title,
    icon: Icon,
    storageScope,
    children,
}: {
    id: string;
    title: string;
    icon: ComponentType;
    storageScope: string;
    children: ReactNode;
}) {
    const storageKey = `inbxer:sidebar:${storageScope}:nested:${id}`;
    const [open, setOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.localStorage.getItem(storageKey) !== 'closed';
    });

    const changeOpen = (nextOpen: boolean) => {
        setOpen(nextOpen);
        window.localStorage.setItem(storageKey, nextOpen ? 'open' : 'closed');
    };

    return (
        <Collapsible
            open={open}
            onOpenChange={changeOpen}
            className="group/nested"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="cursor-pointer text-muted-foreground">
                        <Icon />
                        <span>{title}</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=closed]/nested:-rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>{children}</SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

function SidebarNestedLink({
    title,
    href,
    count,
    active,
}: {
    title: string;
    href: string;
    count: number;
    active: boolean;
}) {
    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={active}>
                <Link href={href} prefetch>
                    <span>{title}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {count}
                    </span>
                </Link>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}

export function PlatformSidebar({ mode }: PlatformSidebarProps) {
    const { props, url } = usePage();
    const team = props.currentTeam as { name: string; slug: string } | null;
    const stats = props.sidebarStats as SidebarStats | null;
    const confirm = useConfirm();
    const base = '';
    const storageScope = team?.slug ?? 'default';
    const isActive = (href: string, exact = false) =>
        url === href ||
        url.startsWith(`${href}?`) ||
        (!exact && url.startsWith(`${href}/`));

    const settingsGroups = [
        {
            label: 'Account',
            items: [
                { title: 'Profile', href: '/settings/profile', icon: Users },
                {
                    title: 'Security',
                    href: '/settings/security',
                    icon: ShieldCheck,
                },
                {
                    title: 'Appearance',
                    href: '/settings/appearance',
                    icon: Palette,
                },
            ],
        },
        {
            label: 'Workspace',
            items: [
                {
                    title: 'General',
                    href: `${base}/settings/general`,
                    icon: SlidersHorizontal,
                },
                {
                    title: 'Members',
                    href: `${base}/settings/members`,
                    icon: UsersRound,
                },
                {
                    title: 'Roles',
                    href: `${base}/settings/roles`,
                    icon: ShieldCheck,
                },
                {
                    title: 'Channels',
                    href: `${base}/settings/channels`,
                    icon: MessageCircle,
                },
                {
                    title: 'Labels',
                    href: `${base}/settings/labels`,
                    icon: Tags,
                },
                {
                    title: 'Tiers & SLAs',
                    href: `${base}/settings/tiers`,
                    icon: Layers3,
                },
                {
                    title: 'Customer Groups',
                    href: `${base}/settings/groups`,
                    icon: Users2,
                },
            ],
        },
        {
            label: 'Workflow',
            items: [
                {
                    title: 'Workflow',
                    href: `${base}/settings/workflow`,
                    icon: Workflow,
                },
                {
                    title: 'Snippets',
                    href: `${base}/settings/snippets`,
                    icon: FileText,
                },
                {
                    title: 'Business hours',
                    href: `${base}/settings/business-hours`,
                    icon: Clock,
                },
                {
                    title: 'Auto-responses',
                    href: `${base}/settings/autoresponses`,
                    icon: Reply,
                },
                {
                    title: 'CSAT',
                    href: `${base}/settings/csat`,
                    icon: Star,
                },
                {
                    title: 'Spam filtering',
                    href: `${base}/settings/spam`,
                    icon: ShieldAlert,
                },
            ],
        },
        {
            label: 'Integrations',
            items: [
                {
                    title: 'Help Center',
                    href: `${base}/settings/integrations/mintlify`,
                    icon: BookOpen,
                },
            ],
        },
        {
            label: 'Developers',
            items: [
                {
                    title: 'API Keys',
                    href: `${base}/settings/api-keys`,
                    icon: KeyRound,
                },
                {
                    title: 'Webhooks',
                    href: `${base}/settings/webhooks`,
                    icon: WebhookIcon,
                },
            ],
        },
    ];

    const workflowsGroups = [
        {
            label: 'Automation',
            items: [
                {
                    title: 'Workflows',
                    href: `${base}/workflows`,
                    icon: Workflow,
                    exact: true,
                },
                {
                    title: 'Templates',
                    href: `${base}/workflows/templates`,
                    icon: LayoutGrid,
                },
                {
                    title: 'Runs',
                    href: `${base}/workflows/runs`,
                    icon: BarChart3,
                },
            ],
        },
    ];

    const aiGroups = [
        {
            label: 'AI Agent',
            items: [
                {
                    title: 'Overview',
                    href: `${base}/ai`,
                    icon: Sparkles,
                    exact: true,
                },
                {
                    title: 'Activity',
                    href: `${base}/ai/activity`,
                    icon: Activity,
                },
                {
                    title: 'Preferences',
                    href: `${base}/ai/preferences`,
                    icon: SlidersHorizontal,
                },
                {
                    title: 'Playground',
                    href: `${base}/ai/playground`,
                    icon: PlayCircle,
                },
            ],
        },
        {
            label: 'Knowledge',
            items: [
                {
                    title: 'Sources',
                    href: `${base}/ai/knowledge-sources`,
                    icon: BookOpen,
                },
            ],
        },
        {
            label: 'AI features',
            items: [
                {
                    title: 'Suggested responses',
                    href: `${base}/ai/suggested-responses`,
                    icon: Reply,
                },
                {
                    title: 'Automations',
                    href: `${base}/ai/automations`,
                    icon: Workflow,
                },
                {
                    title: 'Tone',
                    href: `${base}/ai/configuration/tone`,
                    icon: Palette,
                },
            ],
        },
    ];

    const insightsGroups = [
        {
            label: 'Insights',
            items: [
                {
                    title: 'Reporting',
                    href: `${base}/insights`,
                    icon: BarChart3,
                    exact: true,
                },
            ],
        },
        {
            label: 'Reporting',
            items: [
                {
                    title: 'Team',
                    href: `${base}/insights/team`,
                    icon: UsersRound,
                },
                {
                    title: 'Companies',
                    href: `${base}/insights/companies`,
                    icon: Building2,
                },
                {
                    title: 'Tenants',
                    href: `${base}/insights/tenants`,
                    icon: Contact,
                },
                {
                    title: 'Tiers',
                    href: `${base}/insights/tiers`,
                    icon: Layers3,
                },
                {
                    title: 'Labels',
                    href: `${base}/insights/labels`,
                    icon: Hash,
                },
                {
                    title: 'Groups',
                    href: `${base}/insights/groups`,
                    icon: Users,
                },
                {
                    title: 'Channels',
                    href: `${base}/insights/channels`,
                    icon: MessageCircle,
                },
                {
                    title: 'Priorities',
                    href: `${base}/insights/priorities`,
                    icon: Flag,
                },
            ],
        },
        {
            label: 'Analysis',
            items: [
                {
                    title: 'Top issues',
                    href: `${base}/insights/top-issues`,
                    icon: AlertCircle,
                },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset" className="left-14">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={
                                    mode === 'support'
                                        ? `${base}/threads`
                                        : mode === 'workflows'
                                          ? `${base}/workflows`
                                          : mode === 'ai'
                                            ? `${base}/ai`
                                            : mode === 'insights'
                                              ? `${base}/insights`
                                              : `${base}/settings`
                                }
                            >
                                <AppLogoIcon className="size-8 shrink-0" />
                                <div className="grid flex-1 text-left text-base leading-tight">
                                    <span className="truncate font-semibold">
                                        Inbxer
                                    </span>
                                </div>
                                <Badge variant="secondary">
                                    {mode === 'support'
                                        ? 'Support'
                                        : mode === 'workflows'
                                          ? 'Workflows'
                                          : mode === 'ai'
                                            ? 'AI Agent'
                                            : mode === 'insights'
                                              ? 'Insights'
                                              : 'Admin'}
                                </Badge>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {mode === 'support' ? (
                    <>
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarLink
                                        title="My threads"
                                        href={`${base}/threads/yours`}
                                        icon={Inbox}
                                        count={stats?.my_threads_count}
                                        active={isActive(
                                            `${base}/threads/yours`,
                                        )}
                                    />
                                    <SidebarLink
                                        title="Tasks"
                                        href={`${base}/tasks`}
                                        icon={CheckSquare2}
                                        count={stats?.tasks_count}
                                        active={isActive(`${base}/tasks`)}
                                    />
                                    <SidebarLink
                                        title="All threads"
                                        href={`${base}/threads/all`}
                                        icon={MessageSquareText}
                                        count={stats?.all_threads_count}
                                        active={isActive(`${base}/threads/all`)}
                                    />
                                    <SidebarLink
                                        title="Not assigned"
                                        href={`${base}/threads/unassigned`}
                                        icon={CircleUserRound}
                                        count={stats?.not_assigned_count}
                                        active={isActive(
                                            `${base}/threads/unassigned`,
                                        )}
                                    />
                                    <SidebarLink
                                        title="Views"
                                        href={`${base}/threads/views`}
                                        icon={LayoutGrid}
                                        active={isActive(
                                            `${base}/threads/views`,
                                        )}
                                    />
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <PersistentSidebarSection
                            id="favorites"
                            title="Favorites"
                            storageScope={storageScope}
                        >
                            {(stats?.favorites ?? []).map((favorite) => (
                                <SidebarLink
                                    key={favorite.id}
                                    title={favorite.title}
                                    href={favorite.url}
                                    icon={Star}
                                    active={isActive(favorite.url)}
                                />
                            ))}
                        </PersistentSidebarSection>

                        <PersistentSidebarSection
                            id="browse"
                            title="Browse"
                            storageScope={storageScope}
                        >
                            <SidebarLink
                                title="Companies"
                                href={`${base}/companies`}
                                icon={Building2}
                                active={isActive(`${base}/companies`)}
                            />
                            <SidebarLink
                                title="Tenants"
                                href={`${base}/tenants`}
                                icon={Users}
                                active={isActive(`${base}/tenants`)}
                            />

                            <SidebarNestedItems
                                id="labels"
                                title="Labels"
                                icon={Hash}
                                storageScope={storageScope}
                            >
                                {(stats?.labels ?? []).map((label) => {
                                    const href = `${base}/threads/labels/${label.id}`;

                                    return (
                                        <SidebarNestedLink
                                            key={label.id}
                                            title={label.name}
                                            href={href}
                                            count={label.threads_count}
                                            active={isActive(href)}
                                        />
                                    );
                                })}
                            </SidebarNestedItems>

                            <SidebarNestedItems
                                id="tiers"
                                title="Tiers"
                                icon={Layers3}
                                storageScope={storageScope}
                            >
                                {(stats?.tiers ?? []).map((tier) => {
                                    const href = `${base}/threads/tiers/${tier.id}`;

                                    return (
                                        <SidebarNestedLink
                                            key={tier.id}
                                            title={tier.name}
                                            href={href}
                                            count={tier.threads_count}
                                            active={isActive(href)}
                                        />
                                    );
                                })}
                            </SidebarNestedItems>

                            <SidebarNestedItems
                                id="channels"
                                title="Channels"
                                icon={MessageCircle}
                                storageScope={storageScope}
                            >
                                {(stats?.channels ?? []).map((channel) => {
                                    const href = `${base}/threads/channels/${channel.id}`;

                                    return (
                                        <SidebarNestedLink
                                            key={channel.id}
                                            title={channel.name}
                                            href={href}
                                            count={channel.threads_count}
                                            active={isActive(href)}
                                        />
                                    );
                                })}
                            </SidebarNestedItems>
                        </PersistentSidebarSection>

                        {(stats?.savedViews ?? []).length > 0 && (
                            <PersistentSidebarSection
                                id="saved-views"
                                title="Views"
                                storageScope={storageScope}
                            >
                                {(stats?.savedViews ?? []).map((view) => {
                                    const filterValue = view.filters?.filter;
                                    const href = filterValue
                                        ? `${base}/threads?filter=${encodeURIComponent(filterValue)}`
                                        : `${base}/threads/views`;

                                    return (
                                        <SidebarMenuItem key={view.id}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive(href)}
                                                tooltip={view.name}
                                            >
                                                <Link href={href} prefetch>
                                                    <LayoutGrid />
                                                    <span>{view.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                            {stats?.canManageSavedViews && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="absolute top-1/2 right-1 flex size-5 -translate-y-1/2 items-center justify-center rounded text-sidebar-foreground/50 opacity-0 group-hover/menu-item:opacity-100 hover:bg-sidebar-accent hover:text-destructive"
                                                            onClick={async (
                                                                e,
                                                            ) => {
                                                                e.preventDefault();

                                                                if (
                                                                    await confirm(
                                                                        {
                                                                            title: `Delete view "${view.name}"?`,
                                                                            description:
                                                                                'This cannot be undone.',
                                                                            confirmText:
                                                                                'Delete',
                                                                            variant:
                                                                                'destructive',
                                                                        },
                                                                    )
                                                                ) {
                                                                    router.delete(
                                                                        `${base}/saved-views/${view.id}`,
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <X className="size-3" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        Delete view
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </SidebarMenuItem>
                                    );
                                })}
                            </PersistentSidebarSection>
                        )}
                    </>
                ) : (
                    (mode === 'workflows'
                        ? workflowsGroups
                        : mode === 'insights'
                          ? insightsGroups
                          : mode === 'ai'
                            ? aiGroups
                            : settingsGroups
                    ).map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => {
                                        const { exact, ...linkProps } =
                                            item as typeof item & {
                                                exact?: boolean;
                                            };

                                        return (
                                            <SidebarLink
                                                key={item.title}
                                                {...linkProps}
                                                active={isActive(
                                                    item.href,
                                                    exact,
                                                )}
                                            />
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
