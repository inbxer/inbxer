import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    User,
    Building2,
    MessageSquare,
    Trash2,
    Link as LinkIcon,
    AlertCircle,
    Calendar,
    CheckSquare,
    X,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AssigneeSelect } from '@/components/assignee';
import TaskRow from '@/components/task-row';
import { TaskFilterBar } from '@/components/tasks/task-filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) {
        return 'Just now';
    }

    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }

    if (diffHrs < 24) {
        return `${diffHrs}h ago`;
    }

    return `${diffDays}d ago`;
};

interface TeamMember {
    id: number;
    name: string;
    email: string;
}

interface Company {
    id: string;
    name: string;
    slug: string;
}

interface Tenant {
    id: string;
    name: string;
}

interface Thread {
    id: string;
    title: string;
}

interface SupportTask {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'done';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    assigned_to: number | null;
    company_id: string | null;
    tenant_id: string | null;
    thread_id: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    assignee?: TeamMember | null;
    company?: Company | null;
    tenant?: Tenant | null;
    thread?: Thread | null;
}

interface TasksPageProps {
    tasks: SupportTask[];
    tab: string;
    counts: {
        my_tasks: number;
        all_tasks: number;
        done: number;
    };
    teamMembers: TeamMember[];
    companies: Company[];
    tenants: Tenant[];
    threads: Thread[];
}

type TaskUpdateAttributes = Partial<
    Pick<
        SupportTask,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'assigned_to'
        | 'company_id'
        | 'tenant_id'
        | 'thread_id'
        | 'due_at'
    >
>;

export default function TasksPage({
    tasks,
    tab,
    counts,
    teamMembers,
    companies,
    tenants,
    threads,
}: TasksPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam;
    const authUser = props.auth.user;

    // Selection state for opening detail sidebar
    const [selectedTask, setSelectedTask] = useState<SupportTask | null>(null);
    const [isInlineCreating, setIsInlineCreating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
        'idle',
    );

    // Local state for sidebar details input editing to prevent typing locking
    const [prevTaskId, setPrevTaskId] = useState<string | null>(null);
    const [localTitle, setLocalTitle] = useState('');
    const [localDescription, setLocalDescription] = useState('');

    const currentSelectedTaskId = selectedTask?.id ?? null;

    if (currentSelectedTaskId !== prevTaskId) {
        setPrevTaskId(currentSelectedTaskId);
        setLocalTitle(selectedTask?.title ?? '');
        setLocalDescription(selectedTask?.description ?? '');
    }

    // Auto-select task from query parameters on load (deep linking)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const taskId = searchParams.get('task');

        if (taskId) {
            const found = tasks.find((t) => t.id === taskId);

            if (found) {
                setTimeout(() => setSelectedTask(found), 0);
            }
        }
    }, [tasks]);

    // Toggle inline task creation on pressing key "T"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInput =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.getAttribute('contenteditable') === 'true');

            if (e.key.toLowerCase() === 't' && !isInput) {
                e.preventDefault();
                setIsInlineCreating(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Form for inline task creation
    const { data, setData, post, processing, reset } = useForm({
        title: '',
        description: '',
        assigned_to: (authUser?.id ?? '') as string | number,
        company_id: '',
        tenant_id: '',
        thread_id: '',
        due_at: '',
        priority: 'normal',
    });

    // Keyboard listener for inline form
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isInlineCreating) {
                setIsInlineCreating(false);
                reset();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInlineCreating, reset]);

    const handleTabChange = (newTab: string) => {
        router.get(
            window.location.pathname,
            { tab: newTab },
            { preserveState: true },
        );
    };

    const handleCreateTaskInline = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (!data.title.trim()) {
            return;
        }

        post(currentTeam ? `/tasks` : '/tasks', {
            preserveState: true,
            onSuccess: () => {
                setIsInlineCreating(false);
                reset();
                toast.success('Task created successfully.');
            },
        });
    };

    // Auto-save patch update for selected task attributes
    const handleUpdateTaskAttribute = (
        task: SupportTask,
        attributes: TaskUpdateAttributes,
    ) => {
        setSaveStatus('saving');
        router.patch(
            currentTeam ? `/tasks/${task.id}` : `/tasks/${task.id}`,
            attributes,
            {
                preserveState: true,
                onSuccess: (page) => {
                    setSaveStatus('saved');
                    const timer = setTimeout(() => setSaveStatus('idle'), 3000);

                    const updatedTasks = page.props.tasks as SupportTask[];
                    const fresh = updatedTasks.find((t) => t.id === task.id);

                    if (fresh) {
                        setSelectedTask(fresh);
                    }

                    return () => clearTimeout(timer);
                },
                onError: () => {
                    setSaveStatus('idle');
                    toast.error('Failed to update task attribute.');
                },
            },
        );
    };

    // Copy Task Deep Link URL
    const handleCopyTaskLink = (task: SupportTask) => {
        if (!currentTeam) {
            return;
        }

        const taskUrl = `${window.location.origin}//tasks?task=${task.id}`;
        navigator.clipboard.writeText(taskUrl);
        toast.success('Task link copied to clipboard!');
    };

    // Delete Task
    const handleDeleteTask = (task: SupportTask) => {
        router.delete(currentTeam ? `/tasks/${task.id}` : `/tasks/${task.id}`, {
            preserveState: true,
            onSuccess: () => {
                setSelectedTask(null);
                toast.success('Task deleted successfully.');
            },
        });
    };

    // Toggle Task Status (To do <-> Done)
    const handleToggleStatus = (e: React.MouseEvent, task: SupportTask) => {
        e.stopPropagation();
        const newStatus = task.status === 'open' ? 'done' : 'open';
        handleUpdateTaskAttribute(task, { status: newStatus });
    };

    // Format task display ID
    const getTaskDisplayId = (task: SupportTask) => {
        return `TASK-${task.id.slice(0, 4).toUpperCase()}`;
    };

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
            <Head title="Tasks" />

            {/* Left Content Column */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
                <div className="flex flex-col gap-6">
                    <TaskFilterBar
                        tab={tab}
                        counts={counts}
                        onTabChange={handleTabChange}
                        isInlineCreating={isInlineCreating}
                        onStartInlineCreate={() => setIsInlineCreating(true)}
                    />

                    {/* Task workspace cards list */}
                    <Card className="overflow-hidden py-0">
                        <CardContent className="p-0">
                            {/* Inline Task Creator Card */}
                            {isInlineCreating && (
                                <div className="flex flex-col gap-4 border-b bg-card p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckSquare className="mt-2 size-4 shrink-0 text-muted-foreground" />
                                        <div className="flex flex-1 flex-col gap-2">
                                            <Input
                                                type="text"
                                                placeholder="Task title"
                                                value={data.title}
                                                onChange={(e) =>
                                                    setData(
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        e.ctrlKey
                                                    ) {
                                                        handleCreateTaskInline();
                                                    }
                                                }}
                                                className="border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                                                autoFocus
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Add optional description"
                                                value={data.description}
                                                onChange={(e) =>
                                                    setData(
                                                        'description',
                                                        e.target.value,
                                                    )
                                                }
                                                className="border-0 px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Selectors Row with Dropdowns */}
                                    <div className="flex flex-col justify-between gap-3 border-t pt-3 text-xs xl:flex-row xl:items-center">
                                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                                            {/* Assigned to: list dropdown matching user request */}
                                            <AssigneeSelect
                                                assignees={teamMembers}
                                                value={
                                                    data.assigned_to
                                                        ? Number(
                                                              data.assigned_to,
                                                          )
                                                        : null
                                                }
                                                onValueChange={(val) =>
                                                    setData(
                                                        'assigned_to',
                                                        val === null
                                                            ? ''
                                                            : String(val),
                                                    )
                                                }
                                                currentUserId={authUser.id}
                                                placeholder="Assignee"
                                                triggerClassName="w-48 text-xs"
                                            />

                                            {/* Company or Tenant selector */}
                                            <Select
                                                value={
                                                    data.company_id ||
                                                    data.tenant_id
                                                        ? data.company_id
                                                            ? `company:${data.company_id}`
                                                            : `tenant:${data.tenant_id}`
                                                        : 'none'
                                                }
                                                onValueChange={(val) => {
                                                    if (val === 'none') {
                                                        setData((d) => ({
                                                            ...d,
                                                            company_id: '',
                                                            tenant_id: '',
                                                        }));
                                                    } else if (
                                                        val.startsWith(
                                                            'company:',
                                                        )
                                                    ) {
                                                        setData((d) => ({
                                                            ...d,
                                                            company_id:
                                                                val.substring(
                                                                    8,
                                                                ),
                                                            tenant_id: '',
                                                        }));
                                                    } else {
                                                        setData((d) => ({
                                                            ...d,
                                                            company_id: '',
                                                            tenant_id:
                                                                val.substring(
                                                                    7,
                                                                ),
                                                        }));
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-44">
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 className="size-4 text-muted-foreground" />
                                                        <span className="truncate">
                                                            Company or Tenant
                                                        </span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="none">
                                                            None
                                                        </SelectItem>
                                                        <SelectLabel>
                                                            Companies
                                                        </SelectLabel>
                                                        {companies.map((c) => (
                                                            <SelectItem
                                                                key={c.id}
                                                                value={`company:${c.id}`}
                                                            >
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                    <SelectGroup>
                                                        <SelectLabel>
                                                            Tenants
                                                        </SelectLabel>
                                                        {tenants.map((t) => (
                                                            <SelectItem
                                                                key={t.id}
                                                                value={`tenant:${t.id}`}
                                                            >
                                                                {t.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>

                                            {/* Thread selector */}
                                            <Select
                                                value={data.thread_id || 'none'}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'thread_id',
                                                        val === 'none'
                                                            ? ''
                                                            : val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-36">
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageSquare className="size-4 text-muted-foreground" />
                                                        <span className="truncate">
                                                            Threads
                                                        </span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="none">
                                                            None
                                                        </SelectItem>
                                                        {threads.map((t) => (
                                                            <SelectItem
                                                                key={t.id}
                                                                value={t.id}
                                                            >
                                                                {t.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Action Submissions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setIsInlineCreating(false);
                                                    reset();
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    handleCreateTaskInline()
                                                }
                                                disabled={
                                                    processing ||
                                                    !data.title.trim()
                                                }
                                            >
                                                {processing && (
                                                    <Spinner data-icon="inline-start" />
                                                )}
                                                Create
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTask?.id === task.id}
                                    onClick={() => setSelectedTask(task)}
                                    onToggleStatus={handleToggleStatus}
                                    onCopyLink={handleCopyTaskLink}
                                    onDelete={handleDeleteTask}
                                />
                            ))}
                            {tasks.length === 0 && !isInlineCreating && (
                                <Empty className="min-h-72 border">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <CheckSquare />
                                        </EmptyMedia>
                                        <EmptyTitle>No tasks found</EmptyTitle>
                                        <EmptyDescription>
                                            Press T or use Add task to create
                                            your first task.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right details sidebar column (only shown when task is selected) */}
            {selectedTask && (
                <aside className="flex w-full flex-col justify-between gap-6 overflow-y-auto border-t bg-background p-4 lg:w-80 lg:border-t-0 lg:border-l">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <span className="font-mono text-xs font-bold text-muted-foreground">
                                {getTaskDisplayId(selectedTask)}
                            </span>
                            <div className="flex items-center gap-2.5">
                                {/* Save indicator */}
                                {saveStatus === 'saving' && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Spinner />
                                        Saving…
                                    </span>
                                )}
                                {saveStatus === 'saved' && (
                                    <span className="text-xs font-medium">
                                        Saved
                                    </span>
                                )}

                                {/* Copy Task Link */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        handleCopyTaskLink(selectedTask)
                                    }
                                    aria-label="Copy task link"
                                >
                                    <LinkIcon />
                                </Button>

                                {/* Delete button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        handleDeleteTask(selectedTask)
                                    }
                                    aria-label="Delete task"
                                >
                                    <Trash2 />
                                </Button>

                                {/* Close button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedTask(null)}
                                    aria-label="Close task details"
                                >
                                    <X />
                                </Button>
                            </div>
                        </div>

                        {/* Interactive fields editor */}
                        <div className="flex flex-col gap-4">
                            <Input
                                type="text"
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                onBlur={() => {
                                    if (
                                        localTitle.trim() &&
                                        localTitle !== selectedTask.title
                                    ) {
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            { title: localTitle },
                                        );
                                    }
                                }}
                                placeholder="Task title"
                            />

                            <Textarea
                                value={localDescription}
                                onChange={(e) =>
                                    setLocalDescription(e.target.value)
                                }
                                onBlur={() => {
                                    if (
                                        localDescription !==
                                        (selectedTask.description || '')
                                    ) {
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            {
                                                description:
                                                    localDescription || null,
                                            },
                                        );
                                    }
                                }}
                                className="min-h-24 resize-none"
                                placeholder="Add description..."
                            />
                        </div>

                        <Separator />

                        {/* Task Metadata Fields */}
                        <div className="flex flex-col gap-4 text-xs">
                            {/* Created at metadata */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Created</span>
                                </span>
                                <span className="text-right font-mono text-[11px] font-medium text-muted-foreground">
                                    {formatRelativeTime(
                                        selectedTask.created_at,
                                    )}{' '}
                                    <span className="text-muted-foreground/80">
                                        by you
                                    </span>
                                </span>
                            </div>

                            {/* Updated at metadata */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Updated</span>
                                </span>
                                <span className="text-right font-mono text-[11px] font-medium text-muted-foreground">
                                    {formatRelativeTime(
                                        selectedTask.updated_at,
                                    )}{' '}
                                    <span className="text-muted-foreground/80">
                                        by you
                                    </span>
                                </span>
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Assignee</span>
                                </span>
                                <AssigneeSelect
                                    assignees={teamMembers}
                                    value={selectedTask.assigned_to ?? null}
                                    onValueChange={(val) =>
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            {
                                                assigned_to: val,
                                            },
                                        )
                                    }
                                    currentUserId={authUser.id}
                                    triggerClassName="w-36 border-border bg-card/50 text-foreground"
                                />
                            </div>

                            {/* Company / Client */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span>Company</span>
                                </span>
                                <Select
                                    value={selectedTask.company_id ?? 'none'}
                                    onValueChange={(val) =>
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            {
                                                company_id:
                                                    val === 'none' ? null : val,
                                            },
                                        )
                                    }
                                >
                                    <SelectTrigger className="h-7 w-36 border-border bg-card/50 text-xs font-medium text-foreground">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-background text-foreground">
                                        <SelectItem value="none">
                                            None
                                        </SelectItem>
                                        {companies.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Priority */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>Priority</span>
                                </span>
                                <Select
                                    value={selectedTask.priority}
                                    onValueChange={(val) =>
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            { priority: val as any },
                                        )
                                    }
                                >
                                    <SelectTrigger className="h-7 w-36 border-border bg-card/50 text-xs font-medium text-foreground">
                                        <SelectValue placeholder="Normal" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-background text-foreground">
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">
                                            Normal
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High
                                        </SelectItem>
                                        <SelectItem value="urgent">
                                            Urgent
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Due Date */}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Due date</span>
                                </span>
                                <Input
                                    type="date"
                                    value={
                                        selectedTask.due_at
                                            ? selectedTask.due_at.substring(
                                                  0,
                                                  10,
                                              )
                                            : ''
                                    }
                                    onChange={(e) =>
                                        handleUpdateTaskAttribute(
                                            selectedTask,
                                            { due_at: e.target.value || null },
                                        )
                                    }
                                    className="w-36"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                        <span className="text-[10px] text-muted-foreground">
                            Saved automatically
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTask(null)}
                        >
                            Close panel
                        </Button>
                    </div>
                </aside>
            )}
        </div>
    );
}
