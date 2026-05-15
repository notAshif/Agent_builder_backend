import type { Context } from "hono";
import { sendError, sendSuccess } from "../ultil/response.util.js";
import { RunService } from "../service/run.service.js";

export const RunController = {
    getStatus: async (c: Context) => {
        try {
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Run id is required", 422);
            }
            const run = await RunService.getStatus(id);
            return sendSuccess(c, { run }, "Run status fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch run status", error.statusCode ?? 500);
        }
    },

    getLogs: async (c: Context) => {
        try {
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Run id is required", 422);
            }
            const logs = await RunService.getLogs(id);
            return sendSuccess(c, { logs }, "Run logs fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch run logs", error.statusCode ?? 500);
        }
    },

    getExecutions: async (c: Context) => {
        try {
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Run id is required", 422);
            }
            const executions = await RunService.getExecutions(id);
            return sendSuccess(c, { executions }, "Run executions fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch run executions", error.statusCode ?? 500);
        }
    },

    cancel: async (c: Context) => {
        try {
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "Run id is required", 422);
            }
            await RunService.cancel(id);
            return sendSuccess(c, null, "Run cancelled", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to cancel run", error.statusCode ?? 500);
        }
    },
};
