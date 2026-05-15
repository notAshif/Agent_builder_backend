import type { Context } from "hono";
import z from "zod";
import { sendError, sendSuccess } from "../ultil/response.util.js";
import { AgentService } from "../service/agent.service.js";
import { RunService } from "../service/run.service.js";
import { ToolService } from "../service/tool.service.js";
import { buildMeta, parsePagination } from "../ultil/pagination.util.js";
import type { AgentPurpose, AgentStatus } from "../types";

const CreateAgentSchema = z.object({
    toolIds: z.array(z.string()).optional().default([]),
    name: z.string().min(1, "Agent name is required!"),
    description: z.string().optional(),
    prompt: z.string(),
    purpose: z.enum(["BUSINESS", "RESEARCH", "CUSTOMER_SUPPORT", "DATA_ANALYSIS", "CONTENT_CREATION", "CODING", "GENERAL"]),
    config: z.object({
        model: z.string().optional(),
        maxToken: z.number().optional(),
        temperature: z.number().min(0).max(1).optional(),
    }).optional().default({}),
});

const updateSchema = CreateAgentSchema.partial();

const runAgentSchema = z.object({
    input: z.string().min(1, "Input is required"),
});

const assignToolSchema = z.object({
    toolId: z.string().min(1, "Tool id is required"),
    config: z.record(z.string(), z.unknown()).optional(),
});

export const AgentController = {
    create: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const body = await c.req.json();
            const parsed = CreateAgentSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Agent validation failed", 422, parsed.error.flatten().fieldErrors);
            }
            const agent = await AgentService.create(userId, parsed.data);
            return sendSuccess(c, { agent }, "Agent created successfully", 201);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to create agent", error.statusCode ?? 500);
        }
    },

    list: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const query = c.req.query();
            const { page, limit, skip } = parsePagination(query);
            const status = query.status as AgentStatus | undefined;
            const purpose = query.purpose as AgentPurpose | undefined;
            const { agents, total } = await AgentService.list(userId, { page, limit, skip, status, purpose });
            return sendSuccess(c, { agents, meta: buildMeta(total, page, limit) }, "Agent list", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch agents", error.statusCode ?? 500);
        }
    },

    getById: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const agent = await AgentService.getById(id, userId);
            return sendSuccess(c, { agent }, "Agent found", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch agent", error.statusCode ?? 500);
        }
    },

    update: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const body = await c.req.json();
            const parsed = updateSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation error", 422, parsed.error.flatten().fieldErrors);
            }
            const agent = await AgentService.update(id, userId, parsed.data);
            return sendSuccess(c, { agent }, "Agent updated successfully", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to update agent", error.statusCode ?? 500);
        }
    },

    delete: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            await AgentService.delete(id, userId);
            return sendSuccess(c, null, "Agent deleted successfully", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to delete agent", error.statusCode ?? 500);
        }
    },

    run: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const body = await c.req.json();
            const parsed = runAgentSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation error", 422, parsed.error.flatten().fieldErrors);
            }
            const run = await RunService.trigger(id, userId, parsed.data.input);
            return sendSuccess(c, { run }, "Agent run started", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to run agent", error.statusCode ?? 500);
        }
    },

    getToolById: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const tools = await ToolService.getAgentTools(id, userId);
            return sendSuccess(c, { tools }, "Agent tools fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to get agent tools", error.statusCode ?? 500);
        }
    },

    assignTool: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const body = await c.req.json();
            const parsed = assignToolSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation failed", 422, parsed.error.flatten().fieldErrors);
            }
            const agentTool = await ToolService.assignTool(id, userId, parsed.data.toolId, parsed.data.config);
            return sendSuccess(c, { agentTool }, "Tool assigned successfully", 201);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to assign tool", error.statusCode ?? 500);
        }
    },

    removeTool: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id, toolId } = c.req.param();
            if (!id || !toolId) {
                return sendError(c, "Agent id and tool id are required", 422);
            }
            await ToolService.removeTool(id, userId, toolId);
            return sendSuccess(c, null, "Tool removed successfully", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to remove tool", error.statusCode ?? 500);
        }
    },

    getRuns: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Agent id is required", 422);
            }
            const query = c.req.query();
            const { page, limit, skip } = parsePagination(query);
            const [runs, total] = await Promise.all([
                (await import("../prisma/db")).prisma.agentRuns.findMany({
                    where: { agentId: id },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                    include: { _count: { select: { logs: true, toolExecution: true } } },
                }),
                (await import("../prisma/db")).prisma.agentRuns.count({ where: { agentId: id } }),
            ]);
            return sendSuccess(c, { runs, meta: buildMeta(total, page, limit) }, "Runs fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch runs", error.statusCode ?? 500);
        }
    },
};
