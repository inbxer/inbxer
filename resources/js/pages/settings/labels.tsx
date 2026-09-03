import { router, Head } from '@inertiajs/react';
import {
    Tag,
    Plus,
    HelpCircle,
    MessageCircle,
    Code2,
    CreditCard,
    Bug,
    ChevronLeft,
    Users,
    Copy,
    Check,
} from 'lucide-react';
import React, { useState } from 'react';
import { LabelManagementGrid } from '@/components/settings/label-management-grid';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface LabelItem {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    is_team?: boolean;
    ai_description?: string;
    threads_count?: number;
}

interface ManageLabelsProps {
    labels: LabelItem[];
}

export default function ManageLabelsPage({
    labels: initialLabels = [],
}: ManageLabelsProps) {
    const confirm = useConfirm();

    const [labelsList, setLabelsList] = useState<LabelItem[]>(initialLabels);
    const [tabFilter, setTabFilter] = useState<'active' | 'all'>('active');
    const [view, setView] = useState<
        'list' | 'create_label' | 'create_team' | 'edit'
    >('list');

    // Drag & Drop State
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    // Form & Selected Item State
    const [selectedLabel, setSelectedLabel] = useState<LabelItem | null>(null);
    const [selectedIcon, setSelectedIcon] = useState('tag');
    const [labelName, setLabelName] = useState('');
    const [teamLabelName, setTeamLabelName] = useState('');
    const [aiDescription, setAiDescription] = useState('');
    const [canBeAppliedByAi, setCanBeAppliedByAi] = useState(true);
    const [idCopied, setIdCopied] = useState(false);

    const availableIcons = [
        { id: 'help-circle', icon: HelpCircle, label: 'Question' },
        { id: 'message-circle', icon: MessageCircle, label: 'Feedback' },
        { id: 'code-2', icon: Code2, label: 'Account' },
        { id: 'credit-card', icon: CreditCard, label: 'Billing' },
        { id: 'bug', icon: Bug, label: 'Bug' },
        { id: 'tag', icon: Tag, label: 'Tag' },
        { id: 'users', icon: Users, label: 'Team' },
    ];

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();

        if (draggedIdx === null || draggedIdx === index) {
            return;
        }

        setDragOverIdx(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIdx === null || draggedIdx === dropIndex) {
            return;
        }

        const updated = [...labelsList];
        const [movedItem] = updated.splice(draggedIdx, 1);
        updated.splice(dropIndex, 0, movedItem);

        setLabelsList(updated);
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    // Open Edit Mode
    const handleOpenEdit = (lbl: LabelItem) => {
        setSelectedLabel(lbl);
        setLabelName(lbl.name);
        setSelectedIcon(lbl.icon || 'tag');
        setAiDescription(lbl.ai_description || '');
        setView('edit');
    };

    // Save Label Changes
    const handleUpdateLabel = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!selectedLabel || !labelName.trim()) {
            return;
        }

        router.patch(
            `/settings/labels/${selectedLabel.id}`,
            {
                name: labelName.trim(),
                icon: selectedIcon,
                ai_description: aiDescription.trim() || null,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setView('list');
                    setSelectedLabel(null);
                },
            },
        );
    };

    // Create Standard Label
    const handleCreateLabel = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!labelName.trim()) {
            return;
        }

        router.post(
            `/settings/labels`,
            {
                name: labelName.trim(),
                icon: selectedIcon,
                ai_description: aiDescription.trim() || null,
                color:
                    selectedIcon === 'bug'
                        ? '#f43f5e'
                        : selectedIcon === 'credit-card'
                          ? '#f59e0b'
                          : selectedIcon === 'code-2'
                            ? '#34d399'
                            : '#60a5fa',
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setLabelName('');
                    setAiDescription('');
                    setView('list');
                },
            },
        );
    };

    // Create Team Label
    const handleCreateTeamLabel = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!teamLabelName.trim()) {
            return;
        }

        router.post(
            `/settings/labels`,
            {
                name: teamLabelName.trim(),
                icon: 'users',
                is_team: true,
                ai_description: aiDescription.trim() || null,
                color: '#a855f7',
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setTeamLabelName('');
                    setAiDescription('');
                    setView('list');
                },
            },
        );
    };

    const handleDeleteLabel = async (labelId: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }

        if (
            await confirm({
                title: 'Delete this label?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            })
        ) {
            router.delete(`/settings/labels/${labelId}`, {
                preserveState: true,
                onSuccess: () => {
                    if (view === 'edit') {
                        setView('list');
                        setSelectedLabel(null);
                    }
                },
            });
        }
    };

    const handleCopyLabelId = () => {
        if (!selectedLabel) {
            return;
        }

        navigator.clipboard.writeText(`lt_${selectedLabel.id}`);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
    };

    const displayedLabels =
        tabFilter === 'active'
            ? labelsList.filter((l) => (l.threads_count ?? 0) >= 0)
            : labelsList;

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Labels" />

            {view === 'edit' && selectedLabel ? (
                /* EDIT LABEL VIEW (Matching User's Uploaded Screenshot Exactly) */
                <div className="space-y-6">
                    <div
                        onClick={() => {
                            setView('list');
                            setSelectedLabel(null);
                        }}
                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Labels</span>
                    </div>

                    <h1 className="text-xl font-semibold">Edit label</h1>

                    <form
                        onSubmit={handleUpdateLabel}
                        className="max-w-3xl space-y-6"
                    >
                        {/* Card 1: Basic details */}
                        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                            <h3 className="text-xs font-bold text-foreground">
                                Basic details
                            </h3>

                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-ring">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="cursor-pointer rounded-md border border-border bg-muted p-1.5 text-foreground transition-colors hover:bg-muted/70"
                                        >
                                            {selectedIcon === 'help-circle' ? (
                                                <HelpCircle className="h-4 w-4 text-primary" />
                                            ) : selectedIcon ===
                                              'message-circle' ? (
                                                <MessageCircle className="h-4 w-4 text-primary" />
                                            ) : selectedIcon === 'code-2' ? (
                                                <Code2 className="h-4 w-4 text-success" />
                                            ) : selectedIcon ===
                                              'credit-card' ? (
                                                <CreditCard className="h-4 w-4 text-warning" />
                                            ) : selectedIcon === 'bug' ? (
                                                <Bug className="h-4 w-4 text-destructive" />
                                            ) : selectedIcon === 'users' ? (
                                                <Users className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Tag className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="grid w-48 grid-cols-3 gap-1 border-border bg-card p-2 text-foreground">
                                        {availableIcons.map((ic) => {
                                            const IconComp = ic.icon;

                                            return (
                                                <DropdownMenuItem
                                                    key={ic.id}
                                                    onClick={() =>
                                                        setSelectedIcon(ic.id)
                                                    }
                                                    className="flex cursor-pointer items-center justify-center rounded p-2 hover:bg-muted"
                                                >
                                                    <IconComp className="h-4 w-4 text-muted-foreground" />
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <input
                                    type="text"
                                    value={labelName}
                                    onChange={(e) =>
                                        setLabelName(e.target.value)
                                    }
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Card 2: Label ID */}
                        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
                            <h3 className="text-xs font-bold text-foreground">
                                Label ID
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                The identifier for this label when referencing
                                it in the API
                            </p>
                            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                                <span>lt_{selectedLabel.id}</span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={handleCopyLabelId}
                                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                                        >
                                            {idCopied ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Copy Label ID
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Card 3: Plain AI settings & Description */}
                        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-bold text-foreground">
                                        Plain AI settings
                                    </h3>
                                </div>
                                <Switch
                                    checked={canBeAppliedByAi}
                                    onCheckedChange={setCanBeAppliedByAi}
                                />
                            </div>

                            <div className="space-y-1.5 border-t border-border pt-4">
                                <label className="text-xs font-semibold text-foreground">
                                    AI description
                                </label>
                                <p className="text-[11px] text-muted-foreground">
                                    This description is used to teach Plain's AI
                                    when this label should match a support
                                    request. Keep your description short and to
                                    the point.
                                </p>
                                <textarea
                                    value={aiDescription}
                                    onChange={(e) =>
                                        setAiDescription(e.target.value)
                                    }
                                    placeholder="Used for support requests about..."
                                    className="h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={!labelName.trim()}
                                    className="h-9 rounded-lg border border-border bg-muted px-4 text-xs text-foreground hover:bg-muted/70"
                                >
                                    Save changes
                                </Button>
                            </div>
                        </div>

                        {/* Card 4: Archive label */}
                        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
                            <h3 className="text-xs font-bold text-foreground">
                                Archive label
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Archive this label to hide it from new threads
                                while keeping it on existing threads.
                            </p>
                            <div className="flex items-center justify-end pt-2">
                                <Button
                                    type="button"
                                    onClick={() =>
                                        handleDeleteLabel(selectedLabel.id)
                                    }
                                    className="h-9 cursor-pointer rounded-lg bg-destructive px-4 text-xs font-semibold text-foreground hover:bg-destructive/90"
                                >
                                    Archive label
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : view === 'create_team' ? (
                /* CREATE NEW TEAM LABEL FORM */
                <div className="space-y-6">
                    <div
                        onClick={() => setView('list')}
                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Labels</span>
                    </div>

                    <h1 className="text-xl font-semibold">
                        Create new team label
                    </h1>

                    <form
                        onSubmit={handleCreateTeamLabel}
                        className="max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6"
                    >
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
                                Details
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2 focus-within:border-ring">
                                <div className="flex items-center justify-center rounded-md border border-border bg-muted p-1.5 text-primary">
                                    <Users className="h-4 w-4" />
                                </div>

                                <input
                                    type="text"
                                    value={teamLabelName}
                                    onChange={(e) =>
                                        setTeamLabelName(e.target.value)
                                    }
                                    placeholder="Enter team label name"
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <span className="text-xs font-medium text-muted-foreground">
                                Can be applied by Plain AI
                            </span>
                            <Switch
                                checked={canBeAppliedByAi}
                                onCheckedChange={setCanBeAppliedByAi}
                            />
                        </div>

                        <div className="space-y-1.5 border-t border-border pt-4">
                            <label className="text-xs font-semibold text-foreground">
                                AI description
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                                This description is used to teach Plain's AI
                                when this label should match a support request.
                                Keep your description short and to the point.
                            </p>
                            <textarea
                                value={aiDescription}
                                onChange={(e) =>
                                    setAiDescription(e.target.value)
                                }
                                placeholder="Used for support requests about..."
                                className="h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={!teamLabelName.trim()}
                                className="h-9 rounded-lg border border-border bg-muted px-4 text-xs text-foreground hover:bg-muted/70"
                            >
                                Create new team label
                            </Button>
                        </div>
                    </form>
                </div>
            ) : view === 'create_label' ? (
                /* CREATE NEW STANDARD LABEL FORM */
                <div className="space-y-6">
                    <div
                        onClick={() => setView('list')}
                        className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Labels</span>
                    </div>

                    <h1 className="text-xl font-semibold">Create new label</h1>

                    <form
                        onSubmit={handleCreateLabel}
                        className="max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6"
                    >
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
                                Details
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-ring">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="cursor-pointer rounded-md border border-border bg-muted p-1.5 text-foreground transition-colors hover:bg-muted/70"
                                        >
                                            {selectedIcon === 'help-circle' ? (
                                                <HelpCircle className="h-4 w-4 text-primary" />
                                            ) : selectedIcon ===
                                              'message-circle' ? (
                                                <MessageCircle className="h-4 w-4 text-primary" />
                                            ) : selectedIcon === 'code-2' ? (
                                                <Code2 className="h-4 w-4 text-success" />
                                            ) : selectedIcon ===
                                              'credit-card' ? (
                                                <CreditCard className="h-4 w-4 text-warning" />
                                            ) : selectedIcon === 'bug' ? (
                                                <Bug className="h-4 w-4 text-destructive" />
                                            ) : selectedIcon === 'users' ? (
                                                <Users className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Tag className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="grid w-48 grid-cols-3 gap-1 border-border bg-card p-2 text-foreground">
                                        {availableIcons.map((ic) => {
                                            const IconComp = ic.icon;

                                            return (
                                                <DropdownMenuItem
                                                    key={ic.id}
                                                    onClick={() =>
                                                        setSelectedIcon(ic.id)
                                                    }
                                                    className="flex cursor-pointer items-center justify-center rounded p-2 hover:bg-muted"
                                                >
                                                    <IconComp className="h-4 w-4 text-muted-foreground" />
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <input
                                    type="text"
                                    value={labelName}
                                    onChange={(e) =>
                                        setLabelName(e.target.value)
                                    }
                                    placeholder="Enter label name"
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <span className="text-xs font-medium text-muted-foreground">
                                Can be applied by Plain AI
                            </span>
                            <Switch
                                checked={canBeAppliedByAi}
                                onCheckedChange={setCanBeAppliedByAi}
                            />
                        </div>

                        <div className="space-y-1.5 border-t border-border pt-4">
                            <label className="text-xs font-semibold text-foreground">
                                AI description
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                                This description is used to teach Plain's AI
                                when this label should match a support request.
                                Keep your description short and to the point.
                            </p>
                            <textarea
                                value={aiDescription}
                                onChange={(e) =>
                                    setAiDescription(e.target.value)
                                }
                                placeholder="Used for support requests about..."
                                className="h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={!labelName.trim()}
                                className="h-9 rounded-lg border border-border bg-muted px-4 text-xs text-foreground hover:bg-muted/70"
                            >
                                Create new label
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                /* LABELS MANAGEMENT LIST VIEW */
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Labels</h1>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Labels help your team organize support threads for
                            easier routing, prioritization, and reporting. Use
                            nested labels to group related topics. Define team
                            labels to show ownership. Apply labels manually,
                            through workflows, or programmatically to automate
                            your process.
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
                            <button
                                onClick={() => setTabFilter('active')}
                                className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
                                    tabFilter === 'active'
                                        ? 'bg-muted font-semibold text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Active labels
                            </button>
                            <button
                                onClick={() => setTabFilter('all')}
                                className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
                                    tabFilter === 'all'
                                        ? 'bg-muted font-semibold text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                All labels
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setView('create_label')}
                                className="flex h-8 cursor-pointer items-center gap-1.5 border border-border bg-card px-3 text-xs text-foreground hover:bg-muted"
                            >
                                <Plus className="h-3.5 w-3.5 text-success" />
                                <span>Add label</span>
                            </Button>

                            <Button
                                onClick={() => setView('create_team')}
                                className="flex h-8 cursor-pointer items-center gap-1.5 border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Plus className="h-3.5 w-3.5 text-primary" />
                                <span>Add team</span>
                            </Button>
                        </div>
                    </div>

                    {/* Labels Re-orderable List via HTML5 Drag and Drop */}
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {displayedLabels.map((lbl, idx) => (
                            <LabelManagementGrid
                                key={lbl.id}
                                lbl={lbl}
                                idx={idx}
                                isBeingDragged={draggedIdx === idx}
                                isDragOver={dragOverIdx === idx}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                onEdit={handleOpenEdit}
                                onDelete={handleDeleteLabel}
                            />
                        ))}

                        {displayedLabels.length === 0 && (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No labels found in {tabFilter} labels. Click
                                "Add label" or "Add team" to create one.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
