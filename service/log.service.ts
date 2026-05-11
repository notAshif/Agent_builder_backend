import { prisma } from "../prisma/db";
import type { LogLevel } from "../types";
import { NotFoundError } from "../ultil/error.utils";

export const LogService = {
    write: async (runId: string, level: LogLevel, message: string, meta?: Record<string, unknown>) => {
        return prisma.agentLogs.create({
            data: { runId, level, message, meta: (meta ?? undefined) as any },
        });
    },

    fetchLogs: async (runId: string) => {
        const run = await prisma.agentRuns.findUnique({ where: { id: runId } });
        if (!run) throw new NotFoundError("Run not found");
        return prisma.agentLogs.findMany({
            where: { runId },
            orderBy: { createdAt: "asc" },
        });
    },

    summarize: async (runId: string) => {
        const logs = await prisma.agentLogs.findMany({ where: { runId } });
        return {
            runId,
            totalLogs: logs.length,
            errorCount: logs.filter((l) => l.level === "ERROR").length,
            warnCount: logs.filter((l) => l.level === "WARN").length,
            infoCount: logs.filter((l) => l.level === "INFO").length,
            debugCount: logs.filter((l) => l.level === "DEBUG").length,
        };
    },
};
