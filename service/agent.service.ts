import { prisma } from "../prisma/db";
import type { AgentConfig, AgentPurpose, AgentStatus } from "../types";
import { NotFoundError } from "../ultil/error.utils";

export const AgentService = {
    create: async (userId: string, data: {
        name: string;
        description?: string;
        prompt: string;
        purpose: AgentPurpose;
        config: AgentConfig;
        toolIds: string[];
    }) => {
        return prisma.$transaction(async (tx) => {
            const agent = await tx.agent.create({
                data: {
                    name: data.name,
                    description: data.description,
                    prompt: data.prompt,
                    purpose: data.purpose,
                    config: data.config as any,
                    userId,
                },
            });
            if (data.toolIds.length > 0) {
                await tx.agentTools.createMany({
                    data: data.toolIds.map((toolId) => ({ agentId: agent.id, toolId })),
                });
            }
            return tx.agent.findUniqueOrThrow({
                where: { id: agent.id },
                include: { tools: { include: { tool: true } }, _count: { select: { runs: true, tools: true } } },
            });
        });
    },

    list: async (userId: string, params: { page: number; limit: number; skip: number; status?: AgentStatus; purpose?: AgentPurpose }) => {
        const where = {
            userId,
            ...(params.status && { status: params.status }),
            ...(params.purpose && { purpose: params.purpose }),
        };
        const [agents, total] = await Promise.all([
            prisma.agent.findMany({
                where,
                skip: params.skip,
                take: params.limit,
                include: { tools: { include: { tool: true } }, _count: { select: { runs: true, tools: true } } },
                orderBy: { createdAt: "desc" },
            }),
            prisma.agent.count({ where }),
        ]);
        return { agents, total };
    },

    getById: async (id: string, userId: string) => {
        const agent = await prisma.agent.findFirst({
            where: { id, userId },
            include: { tools: { include: { tool: true } }, _count: { select: { runs: true, tools: true } } },
        });
        if (!agent) throw new NotFoundError("Agent not found");
        return agent;
    },

    update: async (id: string, userId: string, data: Partial<{
        name: string;
        description: string;
        prompt: string;
        purpose: AgentPurpose;
        config: AgentConfig;
        toolIds: string[];
    }>) => {
        const existing = await prisma.agent.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundError("Agent not found");

        const { toolIds, ...agentData } = data;
        return prisma.$transaction(async (tx) => {
            await tx.agent.update({ where: { id }, data: agentData as any });
            if (toolIds !== undefined) {
                await tx.agentTools.deleteMany({ where: { agentId: id } });
                if (toolIds.length > 0) {
                    await tx.agentTools.createMany({
                        data: toolIds.map((toolId) => ({ agentId: id, toolId })),
                    });
                }
            }
            return tx.agent.findUniqueOrThrow({
                where: { id },
                include: { tools: { include: { tool: true } }, _count: { select: { runs: true, tools: true } } },
            });
        });
    },

    delete: async (id: string, userId: string) => {
        const existing = await prisma.agent.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundError("Agent not found");
        await prisma.agent.delete({ where: { id } });
    },
};
