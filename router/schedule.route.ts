import { Hono } from "hono";
import z from "zod";
import { AuthMiddleWare } from "../middleware/auth.middleware.js";
import { prisma } from "../prisma/db.js";
import { sendError, sendSuccess } from "../ultil/response.util.js";

export const scheduleRouter = new Hono();

scheduleRouter.use("*", AuthMiddleWare);

const scheduleSchema = z.object({
    cron: z.string().min(1).nullable(),
    enabled: z.boolean(),
});

type AgentConfigWithSchedule = Record<string, unknown> & {
    schedule?: {
        scheduleCron?: string | null;
        scheduleEnabled?: boolean;
        nextScheduledRun?: string | null;
        lastScheduledRun?: string | null;
    };
};

const presetDurations: Record<string, number> = {
    hourly: 60 * 60 * 1000,
    "every 6": 6 * 60 * 60 * 1000,
    "every 12": 12 * 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
};

const getConfig = (config: unknown): AgentConfigWithSchedule => {
    if (config && typeof config === "object" && !Array.isArray(config)) {
        return config as AgentConfigWithSchedule;
    }
    return {};
};

const buildSchedule = (config: unknown) => {
    const schedule = getConfig(config).schedule ?? {};
    return {
        scheduleCron: schedule.scheduleCron ?? null,
        scheduleEnabled: schedule.scheduleEnabled ?? false,
        nextScheduledRun: schedule.nextScheduledRun ?? null,
        lastScheduledRun: schedule.lastScheduledRun ?? null,
    };
};

const calculateNextRun = (cron: string | null, enabled: boolean) => {
    if (!cron || !enabled) return null;
    const duration = presetDurations[cron];
    if (!duration) return null;
    return new Date(Date.now() + duration).toISOString();
};

scheduleRouter.get("/agents/:agentId/schedule", async (c) => {
    try {
        const userId = (c as any).get("userId") as string;
        const { agentId } = c.req.param();
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId },
            select: { config: true },
        });
        if (!agent) return sendError(c, "Agent not found", 404);

        return sendSuccess(c, { schedule: buildSchedule(agent.config) }, "Schedule fetched", 200);
    } catch (error: any) {
        return sendError(c, error.message ?? "Failed to fetch schedule", error.statusCode ?? 500);
    }
});

scheduleRouter.put("/agents/:agentId/schedule", async (c) => {
    try {
        const userId = (c as any).get("userId") as string;
        const { agentId } = c.req.param();
        const body = await c.req.json();
        const parsed = scheduleSchema.safeParse(body);
        if (!parsed.success) {
            return sendError(c, "Schedule validation failed", 422, parsed.error.flatten().fieldErrors);
        }

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId },
            select: { id: true, config: true },
        });
        if (!agent) return sendError(c, "Agent not found", 404);

        const config = getConfig(agent.config);
        const schedule = {
            scheduleCron: parsed.data.cron,
            scheduleEnabled: parsed.data.enabled,
            nextScheduledRun: calculateNextRun(parsed.data.cron, parsed.data.enabled),
            lastScheduledRun: config.schedule?.lastScheduledRun ?? null,
        };

        const updatedAgent = await prisma.agent.update({
            where: { id: agent.id },
            data: {
                config: {
                    ...config,
                    schedule,
                } as any,
            },
        });

        return sendSuccess(c, { agent: updatedAgent, schedule }, "Schedule updated", 200);
    } catch (error: any) {
        return sendError(c, error.message ?? "Failed to update schedule", error.statusCode ?? 500);
    }
});
