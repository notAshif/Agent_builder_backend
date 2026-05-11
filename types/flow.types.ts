export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export interface FlowGraph {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

export interface AgentFlowResponse {
    id: string;
    agentId: string;
    runId: string;
    node: FlowNode[];
    edge: FlowEdge[];
    createdAt: Date;
    updatedAt: Date;
}
