import type { Context } from "hono";
import z from "zod";
import { sendError, sendSuccess } from "../ultil/response.util";
import { AuthService } from "../service/auth.service";
import { config } from "../config/config";

const loginSchema = z.object({
    email: z.string().email("Invalid email address!"),
    password: z.string().min(1, "Password is required!"),
});

const registerSchema = z.object({
    email: z.string().email("Invalid email address!"),
    password: z.string().min(8, "Password must be at least 8 characters!"),
    name: z.string().min(1, "Name is Required!").optional(),
});

const forgetPassSchema = z.object({
    email: z.string().email("Invalid email address!"),
});

const resetPassSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters!"),
});

const oauthProviderSchema = z.enum(["google", "github"]);
type OAuthProvider = z.infer<typeof oauthProviderSchema>;

const createOAuthUrlResponse = async (c: Context, provider: OAuthProvider) => {
    const origin = c.req.header("Origin") ?? config.server.frontendUrl;
    const redirectTo = `${origin}/auth/callback`;
    const url = await AuthService.getOAuthUrl(provider, redirectTo);

    return sendSuccess(c, { url }, "OAuth URL generated", 200);
};

export const AuthController = {
    register: async (c: Context) => {
        try {
            const body = await c.req.json();
            const parsed = registerSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const { email, password, name } = parsed.data;
            const result = await AuthService.register(email, password, name);
            return sendSuccess(c, {
                user: { id: result.user.id, email: result.user.email, name: result.user.name },
                session: result.session,
            }, "Registration Successful", 201);
        } catch (error: any) {
            return sendError(c, error.message ?? "Registration Failed", error.statusCode ?? 500);
        }
    },

    login: async (c: Context) => {
        try {
            const body = await c.req.json();
            const parsed = loginSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const { email, password } = parsed.data;
            const result = await AuthService.login(email, password);
            return sendSuccess(c, result, "Login successful", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Login failed", error.statusCode ?? 500);
        }
    },

    getGoogleOAuthUrl: async (c: Context) => {
        try {
            return createOAuthUrlResponse(c, "google");
        } catch (error: any) {
            return sendError(c, error.message ?? "OAuth sign in failed", error.statusCode ?? 500);
        }
    },

    getGithubOAuthUrl: async (c: Context) => {
        try {
            return createOAuthUrlResponse(c, "github");
        } catch (error: any) {
            return sendError(c, error.message ?? "OAuth sign in failed", error.statusCode ?? 500);
        }
    },

    syncOAuthUser: async (c: Context) => {
        try {
            const supabaseUser = c.get("supabaseUser");
            const user = await AuthService.syncOAuthUser(supabaseUser);
            return sendSuccess(c, { user }, "OAuth user synced", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "OAuth sync failed", error.statusCode ?? 500);
        }
    },

    logout: async (c: Context) => {
        try {
            const authHeader = c.req.header("Authorization");
            const token = authHeader?.split(" ")[1];
            if (token) await AuthService.logout(token);
            return sendSuccess(c, null, "Logged out successfully", 200);
        } catch (error: any) {
            return sendError(c, "Logout failed", 500);
        }
    },

    me: async (c: Context) => {
        try {
            const userId = c.get("userId");
            const user = await AuthService.me(userId);
            if (!user) return sendError(c, "User not found", 404);
            return sendSuccess(c, { user }, "User found", 200);
        } catch (error: any) {
            return sendError(c, "User not found", 404);
        }
    },

    forgetPassword: async (c: Context) => {
        try {
            const body = await c.req.json();
            const parsed = forgetPassSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            const { email } = parsed.data;
            const redirectTo = `${c.req.header("Origin")}/reset-password`;
            await AuthService.forgetPassword(email, redirectTo);
            return sendSuccess(c, null, "If this email exists, a reset link has been sent", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Failed to send reset email", error.statusCode ?? 500);
        }
    },

    resetPassword: async (c: Context) => {
        try {
            const body = await c.req.json();
            const parsed = resetPassSchema.safeParse(body);
            if (!parsed.success) {
                return sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors);
            }
            await AuthService.resetPassword(parsed.data.password);
            return sendSuccess(c, null, "Password reset successful", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Password reset failed", error.statusCode ?? 500);
        }
    },

    refresh: async (c: Context) => {
        try {
            const body = await c.req.json();
            const { refresh_token } = body;
            if (!refresh_token) return sendError(c, "Refresh token is required", 400);
            const result = await AuthService.refresh(refresh_token);
            return sendSuccess(c, result, "Token refreshed", 200);
        } catch (error: any) {
            return sendError(c, error.message ?? "Something went wrong", error.statusCode ?? 500);
        }
    },
};
