import type { Edge, Node } from '@xyflow/react';
import type { Branch, StepNode } from './types';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 76;
const V_GAP = 70;
const BRANCH_H_GAP = 300;

export const START_NODE_ID = '__start__';

interface LayoutResult {
    nodes: Node[];
    edges: Edge[];
}

/** A dangling connection point a subsequent node can attach to. */
interface Tail {
    id: string;
    handle?: string;
}

export function layoutWorkflow(
    steps: StepNode[],
    triggerLabel: string,
): LayoutResult {
    const nodes: Node[] = [
        {
            id: START_NODE_ID,
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { label: triggerLabel },
            draggable: false,
        },
    ];
    const edges: Edge[] = [];

    layoutChain(
        steps,
        null,
        null,
        0,
        NODE_HEIGHT + V_GAP,
        [{ id: START_NODE_ID }],
        nodes,
        edges,
    );

    return { nodes, edges };
}

/**
 * Lays out one chain of sibling steps (the top-level chain, or one branch of a condition) and appends its own trailing "Add block" node. Steps placed after a condition step in the same chain are rendered below both of the condition's branches, with edges converging in from each branch's tail — a visual "merge back" after the if/else split.
 */
function layoutChain(
    steps: StepNode[],
    parentClientId: string | null,
    branch: Branch | null,
    xCenter: number,
    y: number,
    incomingTails: Tail[],
    nodes: Node[],
    edges: Edge[],
): Tail[] {
    const chain = steps
        .filter(
            (s) => s.parentClientId === parentClientId && s.branch === branch,
        )
        .sort((a, b) => a.position - b.position);

    let cursorY = y;
    let tails: Tail[] = incomingTails;

    for (const step of chain) {
        nodes.push({
            id: step.clientId,
            type: step.type,
            position: { x: xCenter - NODE_WIDTH / 2, y: cursorY },
            data: { step },
        });

        for (const tail of tails) {
            edges.push({
                id: `e-${tail.id}-${step.clientId}-${tail.handle ?? ''}`,
                source: tail.id,
                sourceHandle: tail.handle,
                target: step.clientId,
            });
        }

        if (step.type === 'condition') {
            const branchY = cursorY + NODE_HEIGHT + V_GAP;
            const ifTails = layoutChain(
                steps,
                step.clientId,
                'if',
                xCenter - BRANCH_H_GAP / 2,
                branchY,
                [{ id: step.clientId, handle: 'if' }],
                nodes,
                edges,
            );
            const elseTails = layoutChain(
                steps,
                step.clientId,
                'else',
                xCenter + BRANCH_H_GAP / 2,
                branchY,
                [{ id: step.clientId, handle: 'else' }],
                nodes,
                edges,
            );

            tails = [...ifTails, ...elseTails];
            cursorY = branchY + NODE_HEIGHT + V_GAP;

            continue;
        }

        tails = [{ id: step.clientId }];
        cursorY += NODE_HEIGHT + V_GAP;
    }

    // The chain's real tail
    const realTails = tails;

    const addId = `__add__${parentClientId ?? 'root'}__${branch ?? 'root'}`;
    nodes.push({
        id: addId,
        type: 'addBlock',
        position: { x: xCenter - 20, y: cursorY },
        data: {
            parentClientId,
            branch,
            position: chain.length,
        },
        draggable: false,
    });

    for (const tail of realTails) {
        edges.push({
            id: `e-${tail.id}-${addId}-${tail.handle ?? ''}`,
            source: tail.id,
            sourceHandle: tail.handle,
            target: addId,
        });
    }

    return realTails;
}
