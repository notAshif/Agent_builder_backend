import { prisma } from "../prisma/db.js";
import { supabase } from "../lib/supabase.js";
import { ConflictError } from "../ultil/error.utils.js";

type OAuthProvider = "google" | "github";

export const AuthService = {
    register: async (email: string, password: string, name?: string) => {
        const existsInDb = await prisma.user.findUnique({ where: { email } });
        if (existsInDb) throw new ConflictError("User already registered!");

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });

        if (authError || !authData.user) {
            throw new Error(authError?.message ?? "Registration Failed");
        }

        const user = await prisma.user.create({
            data: { id: authData.user.id, email, name: name ?? null },
        });

        return { user, session: authData.session };
    },

    login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) throw new Error("Invalid email or password");

        const user = await prisma.user.findUnique({ where: { id: data.user.id } });
        if (!user) throw new Error("User not found");

        return {
            user: { id: user.id, email: user.email, name: user.name },
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expire_at: data.session.expires_at,
        };
    },

    getOAuthUrl: async (provider: OAuthProvider, redirectTo: string) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
                scopes: provider === "github" ? "read:user user:email" : "email profile",
            },
        });

        if (error || !data.url) throw new Error(error?.message ?? "OAuth sign in failed");
        return data.url;
    },

    syncOAuthUser: async (supabaseUser: any) => {
        const email = supabaseUser.email;
        if (!email) throw new Error("OAuth provider did not return an email address");

        const metadata = supabaseUser.user_metadata ?? {};
        const name = metadata.name ?? metadata.full_name ?? metadata.user_name ?? metadata.preferred_username ?? null;

        return prisma.user.upsert({
            where: { id: supabaseUser.id },
            update: { email, name },
            create: { id: supabaseUser.id, email, name },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
    },

    logout: async (token: string) => {
        await supabase.auth.admin.signOut(token);
    },

    me: async (userId: string) => {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                _count: { select: { agent: true, apikeys: true } },
            },
        });
    },

    forgetPassword: async (email: string, redirectTo: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw new Error(error.message);
    },

    resetPassword: async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
    },

    refresh: async (refresh_token: string) => {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error || !data.session) throw new Error("Invalid or expired refresh token");
        return {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expire_at: data.session.expires_at,
        };
    },
};
