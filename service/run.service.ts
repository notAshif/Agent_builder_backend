import { prisma } from "../prisma/db.js";
import OpenAI from "openai";
import { NotFoundError } from "../ultil/error.utils.js";
import { config } from "../config/config.js";
import { isOpenRouterModel, resolveOpenAIModel, resolveOpenRouterModel } from "../ultil/model.util.js";
import { UserService } from "./user.service.js";

const getOpenAIClient = (apiKey?: string) => {
    const key = apiKey ?? config.ai.apiKey;
    if (!key) {
        throw new Error("OPENAI_API_KEY is not configured. Select an OpenRouter model or add an OpenAI key.");
    }
    return new OpenAI({ apiKey: key });
};

const runOpenRouterCompletion = async (
    agent: { prompt: string; config: unknown },
    input: string,
    apiKey?: string | null,
) => {
    const key = apiKey ?? config.ai.openRouterApiKey;
    if (!key) {
        throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const agentConfig = agent.config as { model?: string; maxToken?: number; temperature?: number };
    const { model, replacedFrom } = resolveOpenRouterModel(agentConfig.model, config.ai.openRouterModel);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": config.server.frontendUrl,
            "X-OpenRouter-Title": "AI Agent Builder",
        },
        body: JSON.stringify({
            model,
            max_tokens: agentConfig.maxToken ?? config.ai.maxToken,
            temperature: agentConfig.temperature ?? 0.7,
            messages: [
                { role: "system", content: agent.prompt },
                { role: "user", content: input },
            ],
        }),
    });

    const body = await response.json() as any;
    if (!response.ok) {
        throw new Error(body?.error?.message ?? `OpenRouter request failed with status ${response.status}`);
    }

    return {
        output: body.choices?.[0]?.message?.content ?? "",
        tokenUsed: body.usage?.total_tokens,
        model,
        replacedFrom,
    };
};

const runOpenAICompletion = async (
    agent: { prompt: string; config: unknown },
    input: string,
    apiKey?: string | null,
) => {
    const agentConfig = agent.config as { model?: string; maxToken?: number; temperature?: number };
    const { model, replacedFrom } = resolveOpenAIModel(agentConfig.model, config.ai.model);
    const response = await getOpenAIClient(apiKey ?? undefined).chat.completions.create({
        model,
        max_tokens: agentConfig.maxToken ?? config.ai.maxToken,
        temperature: agentConfig.temperature ?? 0.7,
        messages: [
            { role: "system", content: agent.prompt },
            { role: "user", content: input },
        ],
    });

    return {
        output: response.choices[0]?.message?.content ?? "",
        tokenUsed: response.usage?.total_tokens,
        model,
        replacedFrom,
    };
};

const runAgentInline = async (runId: string, agentId: string, input: string, userId: string) => {
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
        const provider = isOpenRouterModel(agentConfig.model) ? "openrouter" : "openai";
        const userProviderKey = await UserService.getProviderKey(userId, provider);
        const result = provider === "openrouter"
            ? await runOpenRouterCompletion(agent, input, userProviderKey)
            : await runOpenAICompletion(agent, input, userProviderKey);
        const { model, replacedFrom } = result;
        if (replacedFrom) {
            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "WARN",
                    message: `Model ${replacedFrom} was normalized to ${model}`,
                    meta: { requestedModel: replacedFrom, fallbackModel: model },
                },
            });
        }

        const completedRun = await prisma.agentRuns.update({
            where: { id: runId },
            data: {
                status: "COMPLETED",
                output: result.output,
                tokenUsed: result.tokenUsed,
                completedAt: new Date(),
            },
            include: { _count: { select: { logs: true, toolExecution: true } } },
        });

        await prisma.agentLogs.create({
            data: {
                    runId,
                    level: "INFO",
                    message: "Agent run completed inline",
                    meta: { tokenUsed: result.tokenUsed ?? 0, model },
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

        const agentConfig = agent.config as { model?: string };
        if (isOpenRouterModel(agentConfig.model)) {
            await prisma.agentLogs.create({
                data: {
                    runId: run.id,
                    level: "INFO",
                    message: "OpenRouter model selected; running inline with OpenRouter",
                    meta: { model: agentConfig.model },
                },
            });

            return runAgentInline(run.id, agentId, input, userId);
        }

        if (config.isDev) {
            await prisma.agentLogs.create({
                data: {
                    runId: run.id,
                    level: "INFO",
                    message: "Development mode detected; running inline",
                },
            });

            return runAgentInline(run.id, agentId, input, userId);
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

            return runAgentInline(run.id, agentId, input, userId);
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
