export interface ConditionRule {
    field: string;
    operator: string;
    value: string;
}

export interface ConditionConfig {
    logic: 'and' | 'or';
    conditions: ConditionRule[];
}

export type Branch = 'if' | 'else';

export interface StepNode {
    clientId: string;
    type: 'condition' | 'action';
    actionType: string;
    config: Record<string, unknown>;
    parentClientId: string | null | undefined;
    branch: Branch | null | undefined;
    position: number;
}

export interface OptionItem {
    value: string;
    label: string;
}

export interface ConditionFieldsMeta {
    fields: OptionItem[];
    operators: OptionItem[];
    statuses: OptionItem[];
    priorities: OptionItem[];
}

export interface TeamMemberOption {
    id: number;
    name: string;
    email: string;
}

export interface LabelOption {
    id: string;
    name: string;
    color?: string;
}

export interface TierOption {
    id: string;
    name: string;
}

export interface SlackWorkspaceOption {
    id: string;
    name: string;
}

/** Where a newly added block should be inserted (used by the Add Block panel). */
export interface InsertionPoint {
    parentClientId: string | null;
    branch: Branch | null;
    position: number;
}
