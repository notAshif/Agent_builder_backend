import { prisma } from "../prisma/db.js";
import { buildFlowGraph } from "../ultil/flow.util.js";
import { NotFoundError } from "../ultil/error.utils.js";

export const FlowService = {
    getFlow: async (runId: string) => {
        const existing = await prisma.agentFlows.findUnique({ where: { runId } });
        if (existing) return existing;

        const run = await prisma.agentRuns.findUnique({
            where: { id: runId },
            include: {
                logs: true,
                toolExecution: true,
            },
        });
        if (!run) throw new NotFoundError("Run not found");

        const { nodes, edges } = buildFlowGraph({
            logs: run.logs,
            toolExecution: run.toolExecution,
        });

        return prisma.agentFlows.create({
            data: {
                agentId: run.agentId,
                runId,
                node: nodes as any,
                edge: edges as any,
            },
        });
    },
};
