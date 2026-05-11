import type { Context } from "hono";
import z from "zod";
import { sendError, sendSuccess } from "../ultil/response.util";
import { UserService } from "../service/user.service";

const updateProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
});

const createApiKeySchema = z.object({
    name: z.string().min(1, "Name is required"),
});

export const UserController = {
    getProfile: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const user = await UserService.getProfile(userId);
            return sendSuccess(c, { user }, "Profile fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch profile", error.statusCode ?? 500);
        }
    },

    updateProfile: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const body = await c.req.json();
            const parsed = updateProfileSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const user = await UserService.updateProfile(userId, parsed.data.name);
            return sendSuccess(c, { user }, "Profile updated", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to update profile", error.statusCode ?? 500);
        }
    },

    listApiKeys: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const apiKeys = await UserService.listApiKeys(userId);
            return sendSuccess(c, { apiKeys }, "API keys fetched", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to fetch API keys", error.statusCode ?? 500);
        }
    },

    createApiKey: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const body = await c.req.json();
            const parsed = createApiKeySchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const apiKey = await UserService.createApiKey(userId, parsed.data.name);
            return sendSuccess(c, { apiKey }, "API key created", 201);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to create API key", error.statusCode ?? 500);
        }
    },

    deleteApiKey: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const { id } = c.req.param();
            if (!id) {
                return sendError(c, "API key id is required", 422);
            }
            await UserService.deleteApiKey(userId, id);
            return sendSuccess(c, null, "API key deleted", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to delete API key", error.statusCode ?? 500);
        }
    },
};
