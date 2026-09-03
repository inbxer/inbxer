import { Head, router } from '@inertiajs/react';
import {
    Background,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react';
import type {
    Connection,
    Edge,
    Node,
    NodeMouseHandler,
    OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    ArrowLeft,
    Copy,
    Download,
    Link2,
    MoreHorizontal,
    PanelRight,
    Play,
    Trash2,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AddBlockPanel,
    BLOCK_DRAG_MIME,
} from '@/components/workflows/builder/add-block-panel';
import type { DraggedBlock } from '@/components/workflows/builder/add-block-panel';
import {
    layoutWorkflow,
    START_NODE_ID,
} from '@/components/workflows/builder/layout';
import { StepConfigPanel } from '@/components/workflows/builder/step-config-panel';
import {
    ActionNode,
    AddBlockNode,
    ConditionNode,
    TriggerNode,
} from '@/components/workflows/builder/step-nodes';
import { TriggerConfigPanel } from '@/components/workflows/builder/trigger-config-panel';
import type {
    ConditionFieldsMeta,
    InsertionPoint,
    LabelOption,
    OptionItem,
    SlackWorkspaceOption,
    StepNode,
    TeamMemberOption,
    TierOption,
} from '@/components/workflows/builder/types';
import { useConfirm } from '@/hooks/use-confirm';

const nodeTypes = {
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
    addBlock: AddBlockNode,
};

interface WorkflowBuilderProps {
    workflow: {
        id: string;
        name: string;
        status: 'draft' | 'published' | 'archived';
        trigger_type: string;
        is_enabled: boolean;
    };
    steps: Array<{
        id: string;
        type: 'condition' | 'action';
        action_type: string;
        config: Record<string, unknown> | null;
        position: number;
        parent_step_id: string | null;
        branch: string | null;
    }>;
    triggerOptions: OptionItem[];
    actionOptions: OptionItem[];
    conditionFields: ConditionFieldsMeta;
    teamMembers: TeamMemberOption[];
    availableLabels: LabelOption[];
    availableTiers: TierOption[];
    slackWorkspaces: SlackWorkspaceOption[];
}

let clientIdSeq = 0;
function nextClientId(): string {
    clientIdSeq += 1;

    return `new-${Date.now()}-${clientIdSeq}`;
}

/** Steps carry their manually-dragged position under this reserved config key. */
const UI_POSITION_KEY = '_ui';

function readUiPosition(
    config: Record<string, unknown>,
): { x: number; y: number } | null {
    const ui = config[UI_POSITION_KEY] as { x: number; y: number } | undefined;

    return ui && typeof ui.x === 'number' && typeof ui.y === 'number'
        ? ui
        : null;
}

export default function WorkflowBuilderPage({
    workflow,
    steps: initialSteps,
    triggerOptions,
    actionOptions,
    conditionFields,
    teamMembers,
    availableLabels,
    availableTiers,
    slackWorkspaces,
}: WorkflowBuilderProps) {
    const confirm = useConfirm();

    const [name, setName] = React.useState(workflow.name);
    const [triggerType, setTriggerType] = React.useState(workflow.trigger_type);
    const [steps, setSteps] = React.useState<StepNode[]>(() =>
        initialSteps.map((s) => ({
            clientId: s.id,
            type: s.type,
            actionType: s.action_type,
            config: s.config ?? {},
            parentClientId: s.parent_step_id,
            branch: s.branch as StepNode['branch'],
            position: s.position,
        })),
    );
    const [selectedClientId, setSelectedClientId] = React.useState<
        string | null
    >(null);
    const [insertionPoint, setInsertionPoint] =
        React.useState<InsertionPoint | null>(() =>
            initialSteps.length === 0
                ? { parentClientId: null, branch: null, position: 0 }
                : null,
        );
    const [showTriggerConfig, setShowTriggerConfig] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
    const [showRunDialog, setShowRunDialog] = React.useState(false);
    const [runThreadId, setRunThreadId] = React.useState('');
    const [running, setRunning] = React.useState(false);

    // Snapshot of the last-saved state, used to detect unsaved changes.
    // Set once on mount and again after every successful save.
    const [savedSnapshot, setSavedSnapshot] = React.useState(() =>
        JSON.stringify({ name, triggerType, steps }),
    );
    const isDirty =
        JSON.stringify({ name, triggerType, steps }) !== savedSnapshot;

    // Warn on real tab close / refresh too, not just our own Back button.
    React.useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);

        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const triggerLabel =
        triggerOptions.find((t) => t.value === triggerType)?.label ??
        triggerType;

    const { nodes: treeNodes, edges: treeEdges } = React.useMemo(
        () => layoutWorkflow(steps, triggerLabel),
        [steps, triggerLabel],
    );

    const orphanSteps = steps.filter((s) => s.parentClientId === undefined);
    const orphanNodes: Node[] = orphanSteps.map((step, idx) => ({
        id: step.clientId,
        type: step.type,
        position: readUiPosition(step.config) ?? {
            x: 400 + idx * 40,
            y: 400 + idx * 40,
        },
        data: { step },
    }));

    const nodes = [...treeNodes, ...orphanNodes];
    const edges = treeEdges;

    const nodesWithSelection = nodes.map((node) => {
        const step = steps.find((s) => s.clientId === node.id);
        const uiPosition = step ? readUiPosition(step.config) : null;

        return {
            ...node,
            position: uiPosition ?? node.position,
            selected:
                node.id === selectedClientId ||
                (node.id === START_NODE_ID && showTriggerConfig),
            draggable: node.type === 'condition' || node.type === 'action',
        };
    });

    const closeAllPanels = () => {
        setSelectedClientId(null);
        setInsertionPoint(null);
        setShowTriggerConfig(false);
    };

    const handleNodeClick: NodeMouseHandler = (_event, node: Node) => {
        if (node.id === START_NODE_ID) {
            setShowTriggerConfig(true);
            setSelectedClientId(null);
            setInsertionPoint(null);

            return;
        }

        if (node.type === 'addBlock') {
            setInsertionPoint(node.data as unknown as InsertionPoint);
            setSelectedClientId(null);
            setShowTriggerConfig(false);

            return;
        }

        if (node.type === 'condition' || node.type === 'action') {
            setSelectedClientId(node.id);
            setInsertionPoint(null);
            setShowTriggerConfig(false);
        }
    };

    const handleNodeDragStop: OnNodeDrag = (_event, node) => {
        if (node.type !== 'condition' && node.type !== 'action') {
            return;
        }

        setSteps((prev) =>
            prev.map((s) =>
                s.clientId === node.id
                    ? {
                          ...s,
                          config: {
                              ...s.config,
                              [UI_POSITION_KEY]: node.position,
                          },
                      }
                    : s,
            ),
        );
    };

    const selectedStep =
        steps.find((s) => s.clientId === selectedClientId) ?? null;

    const insertStep = (
        point: InsertionPoint,
        step: Omit<
            StepNode,
            'clientId' | 'parentClientId' | 'branch' | 'position'
        >,
    ) => {
        const clientId = nextClientId();
        const newStep: StepNode = {
            ...step,
            clientId,
            parentClientId: point.parentClientId,
            branch: point.branch,
            position: point.position,
        };
        setSteps((prev) => [...prev, newStep]);
        setInsertionPoint(null);
        setSelectedClientId(clientId);
    };

    /** Drops a block anywhere on the canvas as an unattached node. */
    const dropStep = (
        block: DraggedBlock,
        position: { x: number; y: number },
    ) => {
        const clientId = nextClientId();
        const base =
            block.kind === 'condition'
                ? {
                      type: 'condition' as const,
                      actionType: '',
                      config: { logic: 'and', conditions: [] },
                  }
                : {
                      type: 'action' as const,
                      actionType: block.actionType,
                      config: {},
                  };

        const newStep: StepNode = {
            ...base,
            clientId,
            parentClientId: undefined,
            branch: undefined,
            position: 0,
            config: { ...base.config, [UI_POSITION_KEY]: position },
        };
        setSteps((prev) => [...prev, newStep]);
        setSelectedClientId(clientId);
        setInsertionPoint(null);
        setShowTriggerConfig(false);
    };

    const handleAddCondition = (point: InsertionPoint) => {
        insertStep(point, {
            type: 'condition',
            actionType: '',
            config: { logic: 'and', conditions: [] },
        });
    };

    const handleAddAction = (point: InsertionPoint, actionType: string) => {
        insertStep(point, { type: 'action', actionType, config: {} });
    };

    const handleConfigChange = (config: Record<string, unknown>) => {
        if (!selectedClientId) {
            return;
        }

        setSteps((prev) =>
            prev.map((s) =>
                s.clientId === selectedClientId
                    ? {
                          ...s,
                          config: {
                              ...config,
                              [UI_POSITION_KEY]: s.config[UI_POSITION_KEY],
                          },
                      }
                    : s,
            ),
        );
    };

    const handleDeleteStep = () => {
        if (!selectedClientId) {
            return;
        }

        // Remove the step and anything nested under it (its branches).
        const idsToRemove = new Set<string>([selectedClientId]);
        let changed = true;

        while (changed) {
            changed = false;

            for (const step of steps) {
                if (
                    step.parentClientId &&
                    idsToRemove.has(step.parentClientId) &&
                    !idsToRemove.has(step.clientId)
                ) {
                    idsToRemove.add(step.clientId);
                    changed = true;
                }
            }
        }

        setSteps((prev) => prev.filter((s) => !idsToRemove.has(s.clientId)));
        setSelectedClientId(null);
    };

    /** User manually drew a connection between two nodes on the canvas. */
    const handleConnect = (connection: Connection) => {
        const { source, sourceHandle, target } = connection;

        if (
            !target ||
            target.startsWith('__add__') ||
            target === START_NODE_ID
        ) {
            return;
        }

        const newParentClientId = source === START_NODE_ID ? null : source;
        const newBranch =
            sourceHandle === 'if'
                ? 'if'
                : sourceHandle === 'else'
                  ? 'else'
                  : null;

        setSteps((prev) => {
            const siblingCount = prev.filter(
                (s) =>
                    s.clientId !== target &&
                    s.parentClientId === newParentClientId &&
                    s.branch === newBranch,
            ).length;

            return prev.map((s) =>
                s.clientId === target
                    ? {
                          ...s,
                          parentClientId: newParentClientId,
                          branch: newBranch,
                          position: siblingCount,
                      }
                    : s,
            );
        });
    };

    /** Detach a step back to a free-floating orphan when its incoming edge is removed. */
    const handleEdgesDelete = (deleted: Edge[]) => {
        const targets = new Set(
            deleted
                .map((e) => e.target)
                .filter((t) => !t.startsWith('__add__') && t !== START_NODE_ID),
        );

        if (targets.size === 0) {
            return;
        }

        setSteps((prev) =>
            prev.map((s) =>
                targets.has(s.clientId)
                    ? { ...s, parentClientId: undefined, branch: undefined }
                    : s,
            ),
        );
    };

    const handleTriggerChange = (value: string) => {
        setTriggerType(value);
    };

    const handleSave = (publish?: boolean) => {
        setSaving(true);

        router.patch(
            `/workflows/${workflow.id}`,
            {
                name,
                trigger_type: triggerType,
                steps: steps
                    .filter((s) => s.parentClientId !== undefined)
                    .map((s) => ({
                        client_id: s.clientId,
                        type: s.type,
                        action_type: s.actionType,
                        config: s.config,
                        position: s.position,
                        parent_client_id: s.parentClientId,
                        branch: s.branch,
                    })),
            } as any,
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Workflow saved.');
                    setSavedSnapshot(
                        JSON.stringify({ name, triggerType, steps }),
                    );

                    if (publish) {
                        router.post(
                            `/workflows/${workflow.id}/publish`,
                            {},
                            {
                                onSuccess: () =>
                                    toast.success('Workflow published.'),
                            },
                        );
                    }
                },
                onError: () => toast.error('Could not save workflow.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    const unattachedCount = orphanSteps.length;

    const goToWorkflowList = () => {
        router.get(`/workflows`);
    };

    const handleBack = () => {
        if (isDirty) {
            setShowLeaveConfirm(true);

            return;
        }

        goToWorkflowList();
    };

    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Share link copied!');
    };

    const handleCopyWorkflowId = () => {
        navigator.clipboard.writeText(workflow.id);
        toast.success('Workflow ID copied!');
    };

    const handleExportTemplate = () => {
        const payload = {
            name,
            trigger_type: triggerType,
            steps: steps
                .filter((s) => s.parentClientId !== undefined)
                .map((s) => ({
                    client_id: s.clientId,
                    type: s.type,
                    action_type: s.actionType,
                    config: s.config,
                    position: s.position,
                    parent_client_id: s.parentClientId,
                    branch: s.branch,
                })),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Workflow exported.');
    };

    const handleRunWorkflow = () => {
        if (!runThreadId.trim()) {
            return;
        }

        setRunning(true);
        router.post(
            `/workflows/${workflow.id}/run`,
            { thread_id: runThreadId.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowRunDialog(false);
                    setRunThreadId('');
                    toast.success('Workflow run started.');
                },
                onError: () => toast.error('Could not run this workflow.'),
                onFinish: () => setRunning(false),
            },
        );
    };

    const handleDeleteWorkflow = async () => {
        if (
            !(await confirm({
                title: 'Delete this workflow?',
                description: 'This cannot be undone.',
                confirmText: 'Delete',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        router.delete(`/workflows/${workflow.id}`);
    };

    return (
        <div className="flex h-screen flex-col bg-background text-foreground">
            <Head title={`${workflow.name} — Workflow Builder`} />

            <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 w-64 border-none bg-transparent text-sm font-semibold shadow-none focus-visible:ring-1"
                    />
                    <Badge
                        variant={
                            workflow.status === 'published'
                                ? 'default'
                                : 'secondary'
                        }
                        className="capitalize"
                    >
                        {workflow.status}
                    </Badge>
                    {unattachedCount > 0 && (
                        <Badge variant="outline" className="text-warning">
                            {unattachedCount} block
                            {unattachedCount > 1 ? 's' : ''} not connected
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {triggerType === 'manual' && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => setShowRunDialog(true)}
                                        disabled={
                                            workflow.status !== 'published'
                                        }
                                    >
                                        <Play className="size-3.5 text-muted-foreground" />
                                        <span>Run on thread…</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={handleCopyShareLink}>
                                <Link2 className="size-3.5 text-muted-foreground" />
                                <span>Copy share link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyWorkflowId}>
                                <Copy className="size-3.5 text-muted-foreground" />
                                <span>Copy workflow ID</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportTemplate}>
                                <Download className="size-3.5 text-muted-foreground" />
                                <span>Export template</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDeleteWorkflow}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-3.5 text-destructive" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => handleSave(false)}
                    >
                        Save draft
                    </Button>
                    <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => handleSave(true)}
                    >
                        Publish workflow
                    </Button>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeAllPanels}
                            >
                                <PanelRight className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle side panel</TooltipContent>
                    </Tooltip>
                </div>
            </header>

            <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Unsaved changes</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        You have unsaved changes. Are you sure you want to
                        leave? Your changes will be lost.
                    </p>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowLeaveConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={goToWorkflowList}
                        >
                            Leave without saving
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Run on thread</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Enter the ID of the thread to run this workflow against.
                    </p>
                    <Input
                        value={runThreadId}
                        onChange={(e) => setRunThreadId(e.target.value)}
                        placeholder="Thread ID"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowRunDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!runThreadId.trim() || running}
                            onClick={handleRunWorkflow}
                        >
                            Run
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex min-h-0 flex-1">
                <div className="min-w-0 flex-1">
                    <ReactFlowProvider>
                        <FlowCanvas
                            nodes={nodesWithSelection}
                            edges={edges}
                            onNodeClick={handleNodeClick}
                            onNodeDragStop={handleNodeDragStop}
                            onConnect={handleConnect}
                            onEdgesDelete={handleEdgesDelete}
                            onPaneClick={closeAllPanels}
                            onDropBlock={dropStep}
                        />
                    </ReactFlowProvider>
                </div>

                {insertionPoint && (
                    <AddBlockPanel
                        insertionPoint={insertionPoint}
                        actionOptions={actionOptions}
                        onAddCondition={handleAddCondition}
                        onAddAction={handleAddAction}
                        onClose={() => setInsertionPoint(null)}
                    />
                )}

                {showTriggerConfig && (
                    <TriggerConfigPanel
                        triggerType={triggerType}
                        triggerOptions={triggerOptions}
                        onChange={handleTriggerChange}
                        onClose={() => setShowTriggerConfig(false)}
                    />
                )}

                {selectedStep && (
                    <StepConfigPanel
                        step={selectedStep}
                        conditionFields={conditionFields}
                        teamMembers={teamMembers}
                        availableLabels={availableLabels}
                        availableTiers={availableTiers}
                        slackWorkspaces={slackWorkspaces}
                        onChange={handleConfigChange}
                        onDelete={handleDeleteStep}
                        onClose={() => setSelectedClientId(null)}
                    />
                )}
            </div>
        </div>
    );
}

interface FlowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodeClick: NodeMouseHandler;
    onNodeDragStop: OnNodeDrag;
    onConnect: (connection: Connection) => void;
    onEdgesDelete: (edges: Edge[]) => void;
    onPaneClick: () => void;
    onDropBlock: (
        block: DraggedBlock,
        position: { x: number; y: number },
    ) => void;
}

/** Wraps ReactFlow so it can use `useReactFlow()` for drop-position math. */
function FlowCanvas({
    nodes,
    edges,
    onNodeClick,
    onNodeDragStop,
    onConnect,
    onEdgesDelete,
    onPaneClick,
    onDropBlock,
}: FlowCanvasProps) {
    const { screenToFlowPosition } = useReactFlow();

    const handleDragOver = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes(BLOCK_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        const raw = e.dataTransfer.getData(BLOCK_DRAG_MIME);

        if (!raw) {
            return;
        }

        e.preventDefault();
        const block = JSON.parse(raw) as DraggedBlock;
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        onDropBlock(block, position);
    };

    return (
        <div
            className="h-full w-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                onPaneClick={onPaneClick}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
