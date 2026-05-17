import { Hono } from "hono";
import { prisma } from "../prisma/db.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { sendError } from "../ultil/response.util.js";

export const eventsRouter = new Hono();

const streamHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
};

const terminalRunStatuses = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const encodeEvent = (event: string, data: unknown) => {
    return `data: ${JSON.stringify({ event, data })}\n\n`;
};

const authenticateToken = async (token?: string) => {
    if (!token) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
};

eventsRouter.get("/stream", async (c) => {
    const userId = await authenticateToken(c.req.query("token"));
    if (!userId) return sendError(c, "Invalid or expired token", 401);

    const encoder = new TextEncoder();
    const signal = c.req.raw.signal;

    return new Response(new ReadableStream({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(encodeEvent(event, data)));
            };

            send("connected", { scope: "dashboard" });
            let lastRunId: string | null = null;

            while (!signal.aborted) {
                const run = await prisma.agentRuns.findFirst({
                    where: { agent: { userId } },
                    orderBy: { createdAt: "desc" },
                    include: { agent: { select: { name: true } } },
                });

                if (run && run.id !== lastRunId) {
                    lastRunId = run.id;
                    send("run:created", run);
                    if (run.status === "COMPLETED") send("run:completed", run);
                    if (run.status === "FAILED") send("run:failed", run);
                }

                send("heartbeat", { at: new Date().toISOString() });
                await delay(5000);
            }
        },
        cancel() {
            // The browser closed the EventSource connection.
        },
    }), { headers: streamHeaders });
});

eventsRouter.get("/runs/:runId/stream", async (c) => {
    const userId = await authenticateToken(c.req.query("token"));
    if (!userId) return sendError(c, "Invalid or expired token", 401);

    const { runId } = c.req.param();
    const runExists = await prisma.agentRuns.findFirst({
        where: { id: runId, agent: { userId } },
        select: { id: true },
    });
    if (!runExists) return sendError(c, "Run not found", 404);

    const encoder = new TextEncoder();
    const signal = c.req.raw.signal;

    return new Response(new ReadableStream({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(encodeEvent(event, data)));
            };

            send("connected", { scope: "run", runId });
            let lastRunStatus: string | null = null;
            let lastLogId: string | null = null;
            let lastExecutionState = "";

            while (!signal.aborted) {
                const [run, logs, executions] = await Promise.all([
                    prisma.agentRuns.findFirst({
                        where: { id: runId, agent: { userId } },
                        include: { _count: { select: { logs: true, toolExecution: true } } },
                    }),
                    prisma.agentLogs.findMany({
                        where: { runId },
                        orderBy: { createdAt: "asc" },
                    }),
                    prisma.toolExecution.findMany({
                        where: { runId },
                        include: { tool: true },
                        orderBy: { createdAt: "asc" },
                    }),
                ]);

                if (!run) {
                    send("run:failed", { id: runId, error: "Run not found" });
                    break;
                }

                if (run.status !== lastRunStatus) {
                    lastRunStatus = run.status;
                    send("run:updated", run);
                    if (run.status === "COMPLETED") send("run:completed", run);
                    if (run.status === "FAILED") send("run:failed", run);
                    if (run.status === "CANCELLED") send("run:cancelled", run);
                }

                const newLogs = lastLogId
                    ? logs.slice(logs.findIndex((log) => log.id === lastLogId) + 1)
                    : logs;
                for (const log of newLogs) send("log:created", log);
                const latestLog = logs.at(-1);
                if (latestLog) lastLogId = latestLog.id;

                const executionState = executions.map((execution) => `${execution.id}:${execution.status}:${execution.completedAt?.toISOString() ?? ""}`).join("|");
                if (executionState !== lastExecutionState) {
                    lastExecutionState = executionState;
                    for (const execution of executions) {
                        send(execution.completedAt ? "execution:completed" : "execution:created", execution);
                    }
                }

                send("heartbeat", { at: new Date().toISOString() });
                await delay(2000);
            }
        },
        cancel() {
            // The browser closed the EventSource connection.
        },
    }), { headers: streamHeaders });
});
