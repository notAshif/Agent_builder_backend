import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config/config";
import { apiRouter } from "./router/index";

export const app = new Hono();

const allowedOrigins = [
    config.server.frontendUrl,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use("*", cors({
    origin: (origin) => {
        if (!origin) return config.server.frontendUrl ?? "";
        if (allowedOrigins.includes(origin)) return origin;
        if (config.isDev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
        return config.server.frontendUrl ?? "";
    },
}));

app.route("/api/v1", apiRouter);

app.get("/health", (c) => c.json({ status: "ok" }));

export default {
    port: config.server.port,
    fetch: app.fetch,
};
