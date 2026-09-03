import { Head, router } from '@inertiajs/react';
import { ChevronLeft, Plus, Trash2, Users2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';

interface CustomerGroupItem {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    tenants_count?: number;
}

interface ManageGroupsProps {
    groups: CustomerGroupItem[];
}

const SWATCHES = [
    '#60a5fa',
    '#a855f7',
    '#f43f5e',
    '#f59e0b',
    '#34d399',
    '#10b981',
    '#6366f1',
    '#ec4899',
];

export default function ManageGroupsPage({
    groups: initialGroups = [],
}: ManageGroupsProps) {
    const confirm = useConfirm();

    const groupsList = initialGroups;
    const [view, setView] = React.useState<'list' | 'create' | 'edit'>('list');
    const [selectedGroup, setSelectedGroup] =
        React.useState<CustomerGroupItem | null>(null);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [color, setColor] = React.useState(SWATCHES[0]);

    const resetForm = () => {
        setName('');
        setDescription('');
        setColor(SWATCHES[0]);
    };

    const handleOpenCreate = () => {
        resetForm();
        setView('create');
    };

    const handleOpenEdit = (group: CustomerGroupItem) => {
        setSelectedGroup(group);
        setName(group.name);
        setDescription(group.description ?? '');
        setColor(group.color ?? SWATCHES[0]);
        setView('edit');
    };

    const handleCreate = (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!name.trim()) {
            return;
        }

        router.post(
            `/settings/groups`,
            {
                name: name.trim(),
                description: description.trim() || null,
                color,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    resetForm();
                    setView('list');
                },
            },
        );
    };

    const handleUpdate = (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!selectedGroup || !name.trim()) {
            return;
        }

        router.patch(
            `/settings/groups/${selectedGroup.id}`,
            {
                name: name.trim(),
                description: description.trim() || null,
                color,
            },
            {
                preserveState: true,
                onSuccess: () => {
                    setView('list');
                    setSelectedGroup(null);
                },
            },
        );
    };

    const handleDelete = async (groupId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();

        if (
            !(await confirm({
                title: 'Delete this group?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/settings/groups/${groupId}`, {
            preserveState: true,
            onSuccess: () => {
                if (view === 'edit') {
                    setView('list');
                    setSelectedGroup(null);
                }
            },
        });
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Customer groups" />

            {view === 'create' || (view === 'edit' && selectedGroup) ? (
                <div className="space-y-6">
                    <button
                        onClick={() => {
                            setView('list');
                            setSelectedGroup(null);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="size-3.5" />
                        <span>Customer groups</span>
                    </button>

                    <h1 className="text-xl font-semibold">
                        {view === 'create'
                            ? 'Create customer group'
                            : 'Edit customer group'}
                    </h1>

                    <form
                        onSubmit={
                            view === 'create' ? handleCreate : handleUpdate
                        }
                        className="space-y-4 rounded-xl border border-border bg-card p-6"
                    >
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Name
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. VIP customers"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Description
                            </label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this group for? (optional)"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Color
                            </label>
                            <div className="flex items-center gap-2">
                                {SWATCHES.map((swatch) => (
                                    <button
                                        key={swatch}
                                        type="button"
                                        onClick={() => setColor(swatch)}
                                        className={`size-6 rounded-full border-2 transition-transform ${
                                            color === swatch
                                                ? 'scale-110 border-foreground'
                                                : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: swatch }}
                                        aria-label={`Choose color ${swatch}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4">
                            {view === 'edit' && selectedGroup && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() =>
                                        handleDelete(selectedGroup.id)
                                    }
                                >
                                    Delete group
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={!name.trim()}
                                className="ml-auto"
                            >
                                {view === 'create'
                                    ? 'Create group'
                                    : 'Save changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            Customer groups
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Organize customers into groups for easier targeting,
                            reporting, and escalation. Assign a customer to one
                            or more groups from their company profile.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleOpenCreate} className="gap-1.5">
                            <Plus className="size-3.5" />
                            Add group
                        </Button>
                    </div>

                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {groupsList.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => handleOpenEdit(group)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                            >
                                <span
                                    className="size-3 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor:
                                            group.color ?? '#60a5fa',
                                    }}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {group.name}
                                    </p>
                                    {group.description && (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {group.description}
                                        </p>
                                    )}
                                </div>
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                    {group.tenants_count ?? 0} customers
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleDelete(group.id, e)
                                            }
                                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete group
                                    </TooltipContent>
                                </Tooltip>
                            </button>
                        ))}

                        {groupsList.length === 0 && (
                            <div className="flex flex-col items-center gap-2 p-8 text-center text-xs text-muted-foreground">
                                <Users2 className="size-6" />
                                No customer groups yet. Click "Add group" to
                                create one.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
