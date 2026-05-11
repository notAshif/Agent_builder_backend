import { supabase } from "../lib/supabase";

export const verifyJwt = async (token: string) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
};

export const decodeJwt = (token: string): Record<string, unknown> | null => {
    try {
        const base64Payload = token.split(".")[1];
        if (!base64Payload) {
            return null;
        }
        const payload = Buffer.from(base64Payload, "base64").toString("utf-8");
        return JSON.parse(payload);
    } catch {
        return null;
    }
};
