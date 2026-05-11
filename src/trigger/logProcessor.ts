import { logger, task } from "@trigger.dev/sdk";
import { prisma } from "../../prisma/db";

export const cleanLogTask = task({
    id: "clean-logs",

    run: async (payload: { olderThenDays?: number }) => {
        const { olderThenDays } = payload;
        const days = await olderThenDays ?? 30;
        const cuttoff = new Date;
        cuttoff.setDate(cuttoff.getDate() - days);

        const deleted = await prisma.agentLogs.deleteMany({
            where: {
                createdAt: { lt: cuttoff },
            }
        });

        logger.info("Old log deleted successfully", {
            deletedCount: deleted.count, cutoffDays: days
        })
        return { deletedCount: deleted.count };
    },
})

export const summarizeRunLogTask = task({
    id: "summerise-task",

    run: async (payload: { runId: string }) => {
        const { runId } = payload;

        const [run, logs, toolExecutions] = await Promise.all([
            prisma.agentRuns.findUniqueOrThrow({ where: { id: runId } }),
            prisma.agentLogs.findMany({ where: { runId }, orderBy: { createdAt: "asc" } }),
            prisma.toolExecution.findMany({ where: { runId }, include: { tool: true } }),
        ]);

        const summery = {
            runId,
            status: run.status,
            duration: run.completedAt && run.startedAt ? run.completedAt.getTime() - run.startedAt.getTime() : null,
            tokenUsed: run.tokenUsed,
            totalLogs: logs.length,
            errorCount: logs.filter((l) => l.level === "ERROR").length,
            warnCount: logs.filter((l) => l.level === "WARN").length,
            toolExecutions: toolExecutions.map((e) => ({
                toolName: e.tool.name,
                status: e.status,
                duration: e.durationMs,
            })),
            errors: logs.filter((l) => l.level === "ERROR")
                .map((l) => ({
                    message: l.message, meta: l.meta, at: l.createdAt
                }))
        }

        // Summary is returned to caller; do not overwrite actual agent output
        logger.info("Run Summary generated", { runId });
        return summery
    }
})

export const runFailureHandleTask = task({
    id: "run-failure.handler",

    run: async (payload: { runId: string, agentId: string, error: string }) => {
        const { runId, agentId, error } = payload;
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                user: true,
                tools: {
                    include: {
                        tool: true
                    }
                }
            },
        });

        await prisma.agentLogs.create({
            data: {
                runId,
                level: "ERROR",
                message: "Run Fail Handler Trigger!!",
                meta: { error, agentName: agent?.name }
            }
        });

        await summarizeRunLogTask.triggerAndWait({ runId });

        // send failure notification to the agent.user.email
        if (agent?.user.email) {
            const res = await fetch(
                "https://api.resend.com/emails",
                {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json", 
                        "Authorization": `Bearer ${process.env.RENDER_EMAIL_API_KEY}` 
                    },
                    body: JSON.stringify({
                        from: "onboarding@resend.dev",
                        subject: `Agent run failed ${agent.name}`,
                        to: agent.user.email,
                        html: `
                            <h2>Agent Execution Failed</h2>

                            <p>Your agent <strong>${agent.name}</strong> encountered an error.</p>

                            <p><strong>Run ID:</strong> ${runId}</p>

                            <p><strong>Error:</strong></p>

                            <pre>${error}</pre>

                            <p>Please review your agent configuration or logs.</p>
                        `,
                    })
                }
            )
        }

        logger.info("Run Failure Handled", { runId, agentId, error });
        return {
            handle: true
        }
    }
})