import type { Context, Next } from "hono";
import { sendError } from "../ultil/response.util.js";
import { supabaseAdmin } from "../lib/supabase.js";

export const AuthMiddleWare = async (c: Context, next: Next) => {
    const authheader = c.req.header("Authorization")

    if (!authheader || !authheader.startsWith("Bearer ")) {
        return sendError(c, "Missing or required authorization header", 401)
    }

    const token = authheader?.split(" ")[1];

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
        return sendError(c, "Invalid or Expire Token", 401)
    }

    c.set("supabaseUser", data.user)
    c.set("userId", data.user.id)
    await next()
}