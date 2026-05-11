import { prisma } from "../prisma/db";
import OpenAI from "openai";
import { NotFoundError } from "../ultil/error.utils";
import { config } from "../config/config";

const openai = new OpenAI({ apiKey: config.ai.apiKey });

const runAgentInline = async (runId: string, agentId: string, input: string) => {
    await prisma.agentRuns.update({
        where: { id: runId },
        data: { status: "RUNNING", startedAt: new Date() },
    });

    const agent = await prisma.agent.findUniqueOrThrow({
        where: { id: agentId },
        include: { tools: { include: { tool: true } } },
    });

    await prisma.agentLogs.create({
        data: {
            runId,
            level: "INFO",
            message: "Running agent inline",
            meta: { toolCount: agent.tools.length },
        },
    });

    try {
        const agentConfig = agent.config as { model?: string; maxToken?: number; temperature?: number };
        const response = await openai.chat.completions.create({
            model: agentConfig.model ?? config.ai.model,
            max_tokens: agentConfig.maxToken ?? config.ai.maxToken,
            temperature: agentConfig.temperature ?? 0.7,
            messages: [
                { role: "system", content: agent.prompt },
                { role: "user", content: input },
            ],
        });

        const output = response.choices[0]?.message?.content ?? "";
        const completedRun = await prisma.agentRuns.update({
            where: { id: runId },
            data: {
                status: "COMPLETED",
                output,
                tokenUsed: response.usage?.total_tokens,
                completedAt: new Date(),
            },
            include: { _count: { select: { logs: true, toolExecution: true } } },
        });

        await prisma.agentLogs.create({
            data: {
                runId,
                level: "INFO",
                message: "Agent run completed inline",
                meta: { tokenUsed: response.usage?.total_tokens ?? 0 },
            },
        });

        return completedRun;
    } catch (error: any) {
        await prisma.agentLogs.create({
            data: {
                runId,
                level: "ERROR",
                message: `Inline agent run failed: ${error.message}`,
                meta: { stack: error.stack },
            },
        });

        return prisma.agentRuns.update({
            where: { id: runId },
            data: {
                status: "FAILED",
                error: error.message ?? "Agent run failed",
                completedAt: new Date(),
            },
            include: { _count: { select: { logs: true, toolExecution: true } } },
        });
    }
};

export const RunService = {
    trigger: async (agentId: string, userId: string, input: string) => {
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId, status: "ACTIVE" },
            include: { tools: true },
        });
        if (!agent) throw new NotFoundError("Agent not found or inactive");

        const run = await prisma.agentRuns.create({
            data: { agentId, status: "PENDING", input },
        });

        if (config.isDev) {
            await prisma.agentLogs.create({
                data: {
                    runId: run.id,
                    level: "INFO",
                    message: "Development mode detected; running inline",
                },
            });

            return runAgentInline(run.id, agentId, input);
        }

        try {
            const { agentRunTask } = await import("../src/trigger/agentRun");
            const triggerHandle = await agentRunTask.trigger({ runId: run.id, input, agentId });

            return prisma.agentRuns.update({
                where: { id: run.id },
                data: { triggerId: triggerHandle.id },
                include: { _count: { select: { logs: true, toolExecution: true } } },
            });
        } catch (error: any) {
            await prisma.agentLogs.create({
                data: {
                    runId: run.id,
                    level: "WARN",
                    message: "Background queue unavailable; falling back to inline run",
                    meta: { error: error.message },
                },
            });

            return runAgentInline(run.id, agentId, input);
        }
    },

    getStatus: async (runId: string) => {
        const run = await prisma.agentRuns.findUnique({
            where: { id: runId },
            include: { _count: { select: { logs: true, toolExecution: true } } },
        });
        if (!run) throw new NotFoundError("Run not found");
        return run;
    },

    getLogs: async (runId: string) => {
        const run = await prisma.agentRuns.findUnique({ where: { id: runId } });
        if (!run) throw new NotFoundError("Run not found");
        return prisma.agentLogs.findMany({
            where: { runId },
            orderBy: { createdAt: "asc" },
        });
    },

    getExecutions: async (runId: string) => {
        const run = await prisma.agentRuns.findUnique({ where: { id: runId } });
        if (!run) throw new NotFoundError("Run not found");
        return prisma.toolExecution.findMany({
            where: { runId },
            include: { tool: true },
            orderBy: { createdAt: "asc" },
        });
    },

    cancel: async (runId: string) => {
        const run = await prisma.agentRuns.findUnique({ where: { id: runId } });
        if (!run) throw new NotFoundError("Run not found");
        return prisma.agentRuns.update({
            where: { id: runId },
            data: { status: "CANCELLED" },
        });
    },
};
