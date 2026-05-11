import type { Context } from "hono";

export const sendSuccess = <T>(
    c: Context,
    data: T,
    message = "Success",
    statusCode: number = 200
) => {
    return c.json({ success: true, message, data }, statusCode as any);
};

export const sendError = (
    c: Context,
    message = "Something went wrong",
    statusCode: number = 500,
    errors?: unknown
) => {
    return c.json({ success: false, message, errors }, statusCode as any);
};