import { prisma } from "../prisma/db.js";
import type { Prisma } from "@prisma/client";
import { NotFoundError } from "../ultil/error.utils.js";

const builtinTools: Prisma.ToolsCreateManyInput[] = [
    {
        name: "Web Search",
        description: "Search the web for current information and summarize relevant findings.",
        category: "WEB_SEARCH",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
            },
            required: ["query"],
        } as Prisma.InputJsonValue,
        config: { provider: "tavily" } as Prisma.InputJsonValue,
        isBuiltin: true,
    },
    {
        name: "Code Interpreter",
        description: "Run code snippets, inspect data, and produce structured computation results.",
        category: "CODE_EXECUTIONS",
        inputSchema: {
            type: "object",
            properties: {
                language: { type: "string" },
                code: { type: "string" },
            },
            required: ["language", "code"],
        } as Prisma.InputJsonValue,
        isBuiltin: true,
    },
    {
        name: "API Request",
        description: "Call external HTTP APIs with configurable method, headers, and body.",
        category: "API_CALLS",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string" },
                method: { type: "string" },
                body: { type: "object" },
            },
            required: ["url"],
        } as Prisma.InputJsonValue,
        isBuiltin: true,
    },
    {
        name: "File Processor",
        description: "Extract, transform, and summarize uploaded file content.",
        category: "FILE_PROCESSING",
        inputSchema: {
            type: "object",
            properties: {
                fileUrl: { type: "string" },
                task: { type: "string" },
            },
            required: ["fileUrl", "task"],
        } as Prisma.InputJsonValue,
        isBuiltin: true,
    },
    {
        name: "Email Draft",
        description: "Draft polished email responses and outbound messages.",
        category: "EMAIL",
        inputSchema: {
            type: "object",
            properties: {
                recipient: { type: "string" },
                brief: { type: "string" },
            },
            required: ["brief"],
        } as Prisma.InputJsonValue,
        isBuiltin: true,
    },
];

const ensureBuiltinTools = async () => {
    const count = await prisma.tools.count();
    if (count > 0) return;

    await prisma.tools.createMany({
        data: builtinTools,
        skipDuplicates: true,
    });
};

export const ToolService = {
    create: async (data: { name: string; description: string; category: string; inputSchema?: Record<string, unknown>; config?: Record<string, unknown> }) => {
        return prisma.tools.create({
            data: {
                name: data.name,
                description: data.description,
                category: data.category as any,
                inputSchema: (data.inputSchema ?? { type: "object", properties: {}, required: [] }) as Prisma.InputJsonValue,
                config: (data.config ?? {}) as Prisma.InputJsonValue,
                isBuiltin: false,
            },
        });
    },

    listAll: async () => {
        await ensureBuiltinTools();
        return prisma.tools.findMany({ orderBy: { name: "asc" } });
    },

    getById: async (id: string) => {
        const tool = await prisma.tools.findUnique({ where: { id } });
        if (!tool) throw new NotFoundError("Tool not found");
        return tool;
    },

    getAgentTools: async (agentId: string, userId: string) => {
        const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
        if (!agent) throw new NotFoundError("Agent not found");
        return prisma.agentTools.findMany({
            where: { agentId },
            include: { tool: true },
        });
    },

    assignTool: async (agentId: string, userId: string, toolId: string, config?: Record<string, unknown>) => {
        const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
        if (!agent) throw new NotFoundError("Agent not found");

        const tool = await prisma.tools.findUnique({ where: { id: toolId } });
        if (!tool) throw new NotFoundError("Tool not found");

        return prisma.agentTools.upsert({
            where: { agentId_toolId: { agentId, toolId } },
            create: { agentId, toolId, config: config as Prisma.InputJsonValue },
            update: { config: config as Prisma.InputJsonValue },
            include: { tool: true },
        });
    },

    removeTool: async (agentId: string, userId: string, toolId: string) => {
        const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
        if (!agent) throw new NotFoundError("Agent not found");
        await prisma.agentTools.delete({
            where: { agentId_toolId: { agentId, toolId } },
        });
    },
};
