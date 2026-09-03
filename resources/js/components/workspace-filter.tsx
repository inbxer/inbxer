import {
    SlidersHorizontal,
    User,
    Users,
    Tag,
    CircleDot,
    Building2,
    Award,
    AlertCircle,
    MessageSquare,
    Link as LinkIcon,
    Calendar,
    Smile,
    FolderPlus,
    ChevronRight,
    Search,
    CheckSquare,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

export interface FilterOption {
    id: string | number;
    name: string;
    avatarUrl?: string | null;
    color?: string | null;
}

export interface FilterCategory {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    options: FilterOption[];
}

interface WorkspaceFilterProps {
    teamMembers?: { id: number; name: string }[];
    tiers?: { id: string; name: string; color: string | null }[];
    companies?: { id: string; name: string }[];
    onFilterChange?: (filters: Record<string, string[]>) => void;
}

export default function WorkspaceFilter({
    teamMembers = [],
    tiers = [],
    companies = [],
    onFilterChange,
}: WorkspaceFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('assignee');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<
        Record<string, string[]>
    >({});
    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic Filter Categories list matching flyout structure
    const categories: FilterCategory[] = [
        {
            id: 'assignee',
            name: 'Assignee',
            icon: User,
            options: [
                { id: 'unassigned', name: 'Unassigned' },
                ...teamMembers.map((m) => ({
                    id: m.id.toString(),
                    name: m.name,
                })),
            ],
        },
        {
            id: 'participant',
            name: 'Participant',
            icon: Users,
            options: teamMembers.map((m) => ({
                id: m.id.toString(),
                name: m.name,
            })),
        },
        {
            id: 'label',
            name: 'Label',
            icon: Tag,
            options: [
                { id: 'question', name: 'Question' },
                { id: 'bug', name: 'Bug' },
                { id: 'feature', name: 'Feature' },
            ],
        },
        {
            id: 'status',
            name: 'Status',
            icon: CircleDot,
            options: [
                { id: 'open', name: 'Open' },
                { id: 'snoozed', name: 'Snoozed' },
                { id: 'closed', name: 'Closed' },
            ],
        },
        {
            id: 'company',
            name: 'Company',
            icon: Building2,
            options: companies.map((c) => ({ id: c.id, name: c.name })),
        },
        {
            id: 'tier',
            name: 'Tier',
            icon: Award,
            options: tiers.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
            })),
        },
        {
            id: 'priority',
            name: 'Priority',
            icon: AlertCircle,
            options: [
                { id: 'low', name: 'Low' },
                { id: 'normal', name: 'Normal' },
                { id: 'high', name: 'High' },
                { id: 'urgent', name: 'Urgent' },
            ],
        },
        {
            id: 'channel',
            name: 'Channel',
            icon: MessageSquare,
            options: [
                { id: 'email', name: 'Email' },
                { id: 'slack', name: 'Slack' },
                { id: 'api', name: 'API' },
            ],
        },
        {
            id: 'linked_issue',
            name: 'Linked issue',
            icon: LinkIcon,
            options: [
                { id: 'has_issue', name: 'Has linked issue' },
                { id: 'no_issue', name: 'No linked issue' },
            ],
        },
        {
            id: 'created_at',
            name: 'Created at',
            icon: Calendar,
            options: [
                { id: 'today', name: 'Today' },
                { id: 'yesterday', name: 'Yesterday' },
                { id: 'this_week', name: 'This week' },
                { id: 'this_month', name: 'This month' },
            ],
        },
        {
            id: 'csat',
            name: 'CSAT Sentiment',
            icon: Smile,
            options: [
                { id: 'positive', name: 'Positive' },
                { id: 'neutral', name: 'Neutral' },
                { id: 'negative', name: 'Negative' },
            ],
        },
    ];

    // Toggle filter panel on pressing key "F"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInput =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.getAttribute('contenteditable') === 'true');

            if (e.key.toLowerCase() === 'f' && !isInput) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close popover when clicking outside
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        }

        return () =>
            document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const activeCatData = categories.find((c) => c.id === activeCategory);
    const filteredOptions = activeCatData
        ? activeCatData.options.filter((opt) =>
              opt.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : [];

    const handleToggleOption = (catId: string, optId: string) => {
        const currentSelected = selectedFilters[catId] || [];
        const isSelected = currentSelected.includes(optId);

        let updated: string[];

        if (isSelected) {
            updated = currentSelected.filter((id) => id !== optId);
        } else {
            updated = [...currentSelected, optId];
        }

        const newFilters = {
            ...selectedFilters,
            [catId]: updated,
        };

        // Clean empty arrays
        if (updated.length === 0) {
            delete newFilters[catId];
        }

        setSelectedFilters(newFilters);

        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const activeFilterCount = Object.values(selectedFilters).reduce(
        (acc, curr) => acc + curr.length,
        0,
    );

    const handleClearAll = () => {
        setSelectedFilters({});

        if (onFilterChange) {
            onFilterChange({});
        }
    };

    return (
        <div className="relative inline-block" ref={containerRef}>
            {/* Filters Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:text-foreground ${
                    activeFilterCount > 0
                        ? 'border-primary/50 bg-card text-foreground'
                        : ''
                }`}
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 ? (
                    <span className="py-0.2 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
                        {activeFilterCount}
                    </span>
                ) : (
                    <span className="py-0.2 rounded bg-border px-1 font-mono text-[9px] font-bold text-muted-foreground">
                        F
                    </span>
                )}
            </button>

            {/* Flyout Dropdown Content Panel */}
            {isOpen && (
                <div className="absolute left-0 z-50 mt-1.5 flex min-h-[380px] overflow-hidden rounded-xl border border-border bg-background text-xs text-foreground shadow-2xl select-none">
                    {/* Left Pane (Categories list) */}
                    <div className="max-h-[420px] w-[180px] space-y-0.5 overflow-y-auto border-r border-border p-1.5">
                        {activeFilterCount > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="w-full px-2.5 py-1 text-left text-[11px] font-semibold text-destructive hover:underline"
                            >
                                Clear all filters ({activeFilterCount})
                            </button>
                        )}
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = activeCategory === cat.id;
                            const hasActiveFilters =
                                (selectedFilters[cat.id] || []).length > 0;

                            return (
                                <button
                                    key={cat.id}
                                    onMouseEnter={() => {
                                        setActiveCategory(cat.id);
                                        setSearchQuery('');
                                    }}
                                    onClick={() => {
                                        setActiveCategory(cat.id);
                                        setSearchQuery('');
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all ${
                                        isSelected
                                            ? 'bg-card text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-3.5 w-3.5" />
                                        <span className="font-medium">
                                            {cat.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {hasActiveFilters && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        )}
                                        <ChevronRight className="h-3 w-3 opacity-60" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Flyout Pane (Options selection sub-menu) */}
                    {activeCatData && (
                        <div className="flex max-h-[420px] w-[220px] flex-col space-y-3 overflow-y-auto bg-background p-3">
                            {/* Header Category Title */}
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-[10px] font-bold tracking-wider uppercase">
                                    {activeCatData.name}
                                </span>
                                <button className="flex items-center gap-0.5 text-[10px] font-medium hover:text-foreground">
                                    <FolderPlus className="h-3 w-3" />
                                    <span>Add filter</span>
                                </button>
                            </div>

                            {/* Search box */}
                            <div className="relative">
                                <Search className="top-2.2 absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Filter"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-card py-1.5 pr-2.5 pl-7 text-[11px] text-foreground placeholder-muted-foreground focus:border-border focus:outline-none"
                                />
                            </div>

                            {/* Options List */}
                            <div className="max-h-[300px] space-y-1 overflow-y-auto">
                                {filteredOptions.map((opt) => {
                                    const isSelected = (
                                        selectedFilters[activeCategory] || []
                                    ).includes(opt.id.toString());

                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() =>
                                                handleToggleOption(
                                                    activeCategory,
                                                    opt.id.toString(),
                                                )
                                            }
                                            className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-all hover:bg-card/50 ${
                                                isSelected ? 'bg-card/30' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-all ${
                                                        isSelected
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-border'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <CheckSquare className="h-3 w-3 font-bold text-primary-foreground" />
                                                    )}
                                                </div>
                                                {activeCategory === 'tier' && (
                                                    <span
                                                        className="h-1.5 w-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                opt.color ||
                                                                '#a78bfa',
                                                        }}
                                                    />
                                                )}
                                                <span className="text-[11px] font-medium text-foreground">
                                                    {opt.name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredOptions.length === 0 && (
                                    <div className="py-6 text-center text-[10px] text-muted-foreground">
                                        No options found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
