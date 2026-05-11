import type { FlowNode, FlowEdge } from "../types";

export const buildFlowGraph = (runData: {
    logs: Array<{ id: string; message: string; level: string; createdAt: Date }>;
    toolExecution: Array<{ id: string; toolId: string; status: string; input: unknown; output: unknown }>;
}): { nodes: FlowNode[]; edges: FlowEdge[] } => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    const startNode: FlowNode = {
        id: "start",
        type: "input",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
    };
    nodes.push(startNode);

    runData.toolExecution.forEach((exec, index) => {
        const node: FlowNode = {
            id: exec.id,
            type: "default",
            position: { x: 200 * (index + 1), y: 0 },
            data: {
                label: exec.toolId,
                status: exec.status,
                input: exec.input,
                output: exec.output,
            },
        };
        nodes.push(node);

        const source = index === 0 ? "start" : runData.toolExecution[index - 1].id;
        edges.push({
            id: `e-${source}-${exec.id}`,
            source,
            target: exec.id,
        });
    });

    const endNode: FlowNode = {
        id: "end",
        type: "output",
        position: { x: 200 * (runData.toolExecution.length + 1), y: 0 },
        data: { label: "End" },
    };
    nodes.push(endNode);

    const lastSource = runData.toolExecution.length > 0
        ? runData.toolExecution[runData.toolExecution.length - 1].id
        : "start";
    edges.push({ id: `e-${lastSource}-end`, source: lastSource, target: "end" });

    return { nodes, edges };
};
