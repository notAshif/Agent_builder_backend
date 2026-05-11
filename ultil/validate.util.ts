import { z } from "zod";
import type { Context } from "hono";
import { sendError } from "./response.util";

export const validate = <T>(
    schema: z.ZodType<T>,
    data: unknown,
    c: Context
): { success: true; data: T } | { success: false; response: Response } => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        return {
            success: false,
            response: sendError(c, "Validation Failed", 422, parsed.error.flatten().fieldErrors) as unknown as Response,
        };
    }
    return { success: true, data: parsed.data };
};
