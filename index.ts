import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config/config.js";
import { apiRouter } from "./router/index.js";


export const app = new Hono();

const allowedOrigins = [
    config.server.frontendUrl,
    "https://agent-builder-frontend-two.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
].filter(Boolean) as string[];

const isAllowedOrigin = (origin: string) => {
    if (allowedOrigins.includes(origin)) return true;
    return config.isDev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

app.use("*", cors({
    origin: (origin) => {
        if (!origin) return allowedOrigins[0] ?? "";
        return isAllowedOrigin(origin) ? origin : "";
    },
}));

app.route("/api/v1", apiRouter);

app.get("/", (c) => c.json({
    name: "AI Agent Builder API",
    status: "ok",
    health: "/health",
    apiBase: "/api/v1",
}));

app.get("/health", (c) => c.json({ status: "ok" }));

if (import.meta.main) {
    Bun.serve({
        port: config.server.port,
        fetch: app.fetch,
    });
}

export default app;
