import { Monitor, ChevronRight, Settings } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface WorkspaceDisplayProps {
    onViewChange?: (view: 'table' | 'board') => void;
    onGroupByChange?: (field: string) => void;
    onSortByChange?: (field: string) => void;
}

export default function WorkspaceDisplay({
    onViewChange,
    onGroupByChange,
    onSortByChange,
}: WorkspaceDisplayProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
    const [groupBy, setGroupBy] = useState('none');
    const [sortBy, setSortBy] = useState('status_oldest');
    const containerRef = useRef<HTMLDivElement>(null);

    // Toggle popover on pressing key "V"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInput =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.getAttribute('contenteditable') === 'true');

            if (e.key.toLowerCase() === 'v' && !isInput) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close when clicking outside
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

    const handleViewToggle = (mode: 'table' | 'board') => {
        setViewMode(mode);

        if (onViewChange) {
            onViewChange(mode);
        }
    };

    const handleGroupBy = (value: string) => {
        setGroupBy(value);

        if (onGroupByChange) {
            onGroupByChange(value);
        }
    };

    const handleSortBy = (value: string) => {
        setSortBy(value);

        if (onSortByChange) {
            onSortByChange(value);
        }
    };

    return (
        <div className="relative inline-block" ref={containerRef}>
            {/* Display Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:text-foreground ${
                    isOpen ? 'border-primary/40 text-foreground' : ''
                }`}
            >
                <Monitor className="h-3.5 w-3.5" />
                <span>Display</span>
                <span className="py-0.2 rounded bg-muted px-1 font-mono text-[9px] font-bold text-muted-foreground">
                    V
                </span>
            </button>

            {/* Display Popover Content Card */}
            {isOpen && (
                <div className="absolute right-0 z-[100] mt-1.5 w-[260px] space-y-4 rounded-xl border border-border bg-background p-3.5 text-xs text-foreground shadow-2xl select-none">
                    {/* View Switcher Tabs (Table / Board) */}
                    <div className="flex rounded-lg border border-border bg-card p-0.5">
                        <button
                            onClick={() => handleViewToggle('table')}
                            className={`flex-1 rounded-md py-1 text-center font-semibold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => handleViewToggle('board')}
                            className={`flex-1 rounded-md py-1 text-center font-semibold transition-all ${
                                viewMode === 'board'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Board
                        </button>
                    </div>

                    {/* Group By Options */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                            Group by
                        </span>
                        <Select value={groupBy} onValueChange={handleGroupBy}>
                            <SelectTrigger className="h-8 w-full border-border bg-card text-xs text-foreground">
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="priority">
                                    Priority
                                </SelectItem>
                                <SelectItem value="assignee">
                                    Assignee
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort By Options */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                            Sort by
                        </span>
                        <Select value={sortBy} onValueChange={handleSortBy}>
                            <SelectTrigger className="h-8 w-full border-border bg-card text-xs text-foreground">
                                <SelectValue placeholder="Status changed at, oldest first" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background text-foreground">
                                <SelectItem value="status_oldest">
                                    Status changed at, oldest first
                                </SelectItem>
                                <SelectItem value="created_newest">
                                    Created at, newest first
                                </SelectItem>
                                <SelectItem value="priority_highest">
                                    Priority, highest first
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Properties list */}
                    <div className="flex cursor-pointer items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                        <div className="flex items-center gap-2">
                            <Settings className="h-3.5 w-3.5" />
                            <span className="font-semibold">Properties</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px]">15</span>
                            <ChevronRight className="h-3 w-3" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
