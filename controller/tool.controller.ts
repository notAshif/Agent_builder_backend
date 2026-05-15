import type { Context } from "hono";
import { z } from "zod";
import { sendError, sendSuccess } from "../ultil/response.util.js";
import { ToolService } from "../service/tool.service.js";

const createToolSchema = z.object({
    name: z.string().min(1, "Tool name is required"),
    description: z.string().min(1, "Description is required"),
    category: z.enum(["WEB_SEARCH", "DATABASE", "FILE_PROCESSING", "API_CALLS", "EMAIL", "CALENDER", "NOTIFICATION", "CUSTOM", "CODE_EXECUTIONS"]),
    inputSchema: z.object({}).passthrough().optional(),
    config: z.object({}).passthrough().optional(),
});

export const ToolController = {
    listAll: async (c: Context) => {
        try {
            const tools = await ToolService.listAll();
            return sendSuccess(c, { tools }, "Tools fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch tools", error.statusCode ?? 500);
        }
    },

    getById: async (c: Context) => {
        try {
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Tool id is required", 422);
            }
            const tool = await ToolService.getById(id);
            return sendSuccess(c, { tool }, "Tool fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch tool", error.statusCode ?? 500);
        }
    },

    create: async (c: Context) => {
        try {
            const body = await c.req.json();
            const parsed = createToolSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const tool = await ToolService.create(parsed.data);
            return sendSuccess(c, { tool }, "Custom tool created", 201);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to create tool", error.statusCode ?? 500);
        }
    },
};
