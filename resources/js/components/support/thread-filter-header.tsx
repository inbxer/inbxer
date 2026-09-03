import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Ban,
    Eye,
    EyeOff,
    Filter,
    HelpCircle,
    Inbox,
    Layers,
    LayoutGrid,
    List,
    MessageCircle,
    Monitor,
    SlidersHorizontal,
    Star,
    Tag,
    User as UserIcon,
} from 'lucide-react';
import { Assignee } from '@/components/assignee';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ThreadFilterHeaderProps {
    filter: string;
    filterTitle: string;
    statusTab: 'todo' | 'snoozed' | 'all';
    setStatusTab: (tab: 'todo' | 'snoozed' | 'all') => void;
    todoCount: number;
    snoozedCount: number;
    activeThreadsCount: number;
    isStarred: boolean;
    handleToggleStar: () => void;
    showTierSidebar: boolean;
    setShowTierSidebar: (show: boolean) => void;
    showDone: boolean;
    setShowDone: (show: boolean) => void;
    assigneesList?: {
        id: number;
        name: string;
        email?: string | null;
        avatar?: string | null;
    }[];
    currentUserId?: number | null;
    tiersList?: { id: number | string; name: string }[];
    labelsList?: { id: number | string; name: string }[];
    visibleProperties: Record<string, boolean>;
    toggleProperty: (key: string) => void;
    viewMode: 'table' | 'board';
    groupBy: string;
    sortBy: string;
    setViewMode: (mode: 'table' | 'board') => void;
    setGroupBy: (groupBy: string) => void;
    setSortBy: (sortBy: string) => void;
    canSaveView?: boolean;
    handleSaveView?: () => void;
}

const PROPERTY_TOGGLE_ITEMS = [
    ['status', 'Status'],
    ['customer', 'Customer'],
    ['company', 'Company'],
    ['tenant', 'Tenant'],
    ['ref', 'Reference Code'],
    ['previewText', 'Preview Text'],
    ['channel', 'Channel'],
    ['sla', 'SLA'],
    ['tasks', 'Tasks'],
    ['linkedIssues', 'Linked Issues'],
    ['linkedThreads', 'Linked Threads'],
    ['tier', 'Tier'],
    ['labels', 'Labels'],
    ['priority', 'Priority'],
    ['lastUpdated', 'Last Updated'],
    ['created', 'Created At'],
    ['assignee', 'Assignee'],
] as const;

function FilterIcon({
    filter,
    filterTitle,
}: Pick<ThreadFilterHeaderProps, 'filter' | 'filterTitle'>) {
    if (filter.startsWith('label:')) {
        if (filterTitle.includes('Question')) {
            return <HelpCircle />;
        }

        if (filterTitle.includes('Feedback')) {
            return <MessageCircle />;
        }

        return <Tag />;
    }

    if (filter.startsWith('tier:')) {
        return <Layers />;
    }

    if (filter === 'my_threads') {
        return <Inbox />;
    }

    if (filter === 'unassigned') {
        return <Ban />;
    }

    return <MessageCircle />;
}

export function ThreadFilterHeader({
    filter,
    filterTitle,
    statusTab,
    setStatusTab,
    todoCount,
    snoozedCount,
    activeThreadsCount,
    isStarred,
    handleToggleStar,
    showTierSidebar,
    setShowTierSidebar,
    showDone,
    setShowDone,
    assigneesList = [],
    currentUserId = null,
    tiersList = [],
    labelsList = [],
    visibleProperties,
    toggleProperty,
    viewMode,
    groupBy,
    sortBy,
    setViewMode,
    setGroupBy,
    setSortBy,
    canSaveView = false,
    handleSaveView,
}: ThreadFilterHeaderProps) {
    const teamUrl = '';

    return (
        <header className="flex flex-col gap-4 border-b bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
                {filter.startsWith('tier:') && (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto w-fit p-0"
                        asChild
                    >
                        <Link href={`${teamUrl}/settings/tiers`} prefetch>
                            <ArrowLeft data-icon="inline-start" />
                            Tiers
                        </Link>
                    </Button>
                )}
                <div className="flex items-center gap-2 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
                    <FilterIcon filter={filter} filterTitle={filterTitle} />
                    <h1 className="truncate text-base font-semibold">
                        {filterTitle}
                    </h1>
                </div>
                {!filter.startsWith('tier:') && (
                    <Tabs
                        value={statusTab}
                        onValueChange={(value) =>
                            setStatusTab(value as 'todo' | 'snoozed' | 'all')
                        }
                    >
                        <TabsList variant="line" className="h-8">
                            <TabsTrigger value="todo">
                                Todo{' '}
                                <span className="text-muted-foreground">
                                    {todoCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="snoozed">
                                Snoozed{' '}
                                <span className="text-muted-foreground">
                                    {snoozedCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="all">
                                All{' '}
                                <span className="text-muted-foreground">
                                    {activeThreadsCount}
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleStar}
                            aria-pressed={isStarred}
                        >
                            <Star
                                className={cn(
                                    isStarred && 'fill-current text-primary',
                                )}
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isStarred
                            ? 'Remove from Favorites'
                            : 'Add to Favorites'}
                    </TooltipContent>
                </Tooltip>
                {canSaveView && handleSaveView && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveView}
                    >
                        <LayoutGrid data-icon="inline-start" />
                        Save view
                    </Button>
                )}
                {filter.startsWith('tier:') && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={
                                        showTierSidebar
                                            ? 'secondary'
                                            : 'outline'
                                    }
                                    size="icon"
                                    onClick={() =>
                                        setShowTierSidebar(!showTierSidebar)
                                    }
                                    aria-pressed={showTierSidebar}
                                >
                                    <SlidersHorizontal />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle tier details</TooltipContent>
                        </Tooltip>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                router.get(`${teamUrl}/settings/tiers`)
                            }
                        >
                            <Award data-icon="inline-start" />
                            Manage tiers
                        </Button>
                    </>
                )}
                {filter.startsWith('label:') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.get(`${teamUrl}/settings/labels`)}
                    >
                        Manage labels
                    </Button>
                )}

                <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs text-muted-foreground">
                    <Checkbox
                        checked={showDone}
                        onCheckedChange={(checked) =>
                            setShowDone(checked === true)
                        }
                    />
                    Show done
                </label>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter data-icon="inline-start" />
                            Filters
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-2">
                                    <UserIcon />
                                    Assignee
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuGroup>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.get(
                                                    `${teamUrl}/threads/unassigned`,
                                                )
                                            }
                                        >
                                            Unassigned
                                        </DropdownMenuItem>
                                        {assigneesList.map((user) => (
                                            <DropdownMenuItem
                                                key={user.id}
                                                onClick={() =>
                                                    router.get(
                                                        `${teamUrl}/threads`,
                                                        {
                                                            filter: `user:${user.id}`,
                                                        },
                                                    )
                                                }
                                            >
                                                <Assignee
                                                    assignee={user}
                                                    currentUserId={
                                                        currentUserId
                                                    }
                                                />
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-2">
                                    <Tag />
                                    Label
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuGroup>
                                        {labelsList.map((label) => (
                                            <DropdownMenuItem
                                                key={label.id}
                                                onClick={() =>
                                                    router.get(
                                                        `${teamUrl}/threads/labels/${encodeURIComponent(label.name)}`,
                                                    )
                                                }
                                            >
                                                {label.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="gap-2">
                                    <Layers />
                                    Tier
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuGroup>
                                        {tiersList.map((tier) => (
                                            <DropdownMenuItem
                                                key={tier.id}
                                                onClick={() =>
                                                    router.get(
                                                        `${teamUrl}/threads/tiers/${encodeURIComponent(tier.name)}`,
                                                    )
                                                }
                                            >
                                                {tier.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Monitor data-icon="inline-start" />
                            Display
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuLabel>View layout</DropdownMenuLabel>
                        <ToggleGroup
                            type="single"
                            value={viewMode}
                            onValueChange={(value) =>
                                value && setViewMode(value as 'table' | 'board')
                            }
                            variant="outline"
                            size="sm"
                            className="mx-2 mb-2 grid grid-cols-2"
                        >
                            <ToggleGroupItem value="table">
                                <List />
                                Table
                            </ToggleGroupItem>
                            <ToggleGroupItem value="board">
                                <LayoutGrid />
                                Board
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Group by</DropdownMenuLabel>
                        <ToggleGroup
                            type="single"
                            value={groupBy}
                            onValueChange={(value) =>
                                value && setGroupBy(value)
                            }
                            variant="outline"
                            size="sm"
                            className="mx-2 mb-2 grid grid-cols-3"
                        >
                            {['none', 'company', 'status'].map((value) => (
                                <ToggleGroupItem
                                    key={value}
                                    value={value}
                                    className="capitalize"
                                >
                                    {value}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <ToggleGroup
                            type="single"
                            value={sortBy}
                            onValueChange={(value) => value && setSortBy(value)}
                            variant="outline"
                            size="sm"
                            className="mx-2 mb-2 grid grid-cols-2"
                        >
                            {['newest', 'oldest'].map((value) => (
                                <ToggleGroupItem
                                    key={value}
                                    value={value}
                                    className="capitalize"
                                >
                                    {value}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Properties</DropdownMenuLabel>
                        <DropdownMenuGroup className="max-h-52 overflow-y-auto">
                            {PROPERTY_TOGGLE_ITEMS.map(([key, label]) => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={visibleProperties[key]}
                                    onSelect={(event) => event.preventDefault()}
                                    onCheckedChange={() => toggleProperty(key)}
                                >
                                    {visibleProperties[key] ? (
                                        <Eye />
                                    ) : (
                                        <EyeOff />
                                    )}
                                    {label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
