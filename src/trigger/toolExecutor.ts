import { logger, query, task } from "@trigger.dev/sdk";
import { prisma } from "../../prisma/db";
import { Sandbox } from "@e2b/code-interpreter"
import type { Prisma } from "../../src/generated/client";

type ToolInput = Record<string, unknown>; 

export const executeToolTask = task({
    id: "execute-tool",

    retry: {
        maxAttempts: 2,
        factor: 2,
        minTimeoutInMs: 500,
    },

    run: async (payload: { runId: string, toolName: string, toolUsedId: string, input: any }) => {
        const { runId, toolName, toolUsedId, input } = payload;

        // step:1 find tool in database by name (toolUsedId is the Anthropic block ID, not DB ID)
        const tool = await prisma.tools.findFirstOrThrow({
            where: {
                name: toolName,
            }
        });

        // step:2 create tool execution
        const executor = await prisma.toolExecution.create({
            data: {
                runId,
                toolId: tool.id,
                status: "RUNNING",
                input,
            },
        });
        const startTime = Date.now();
        logger.info("Tool Execution Started", { toolName, executionId: executor.id });

        try {
            // step:3 route to the right executor
            const result = await routeToolExecution(toolName, input)
            
            const durationMs = Date.now() - startTime;

            await prisma.toolExecution.update({
                where: { id: executor.id },
                data: {
                    status: "COMPLETED",
                    output: result,
                    durationMs,
                    completedAt: new Date(),
                },
            });

            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "INFO",
                    message: `Tool ${toolName} is completed in ${durationMs}ms`,
                    meta: { toolName, durationMs, executionId: executor.id },
                },
            });

            logger.info("Tool execution completed", { toolName, executionId: executor.id });
            return { success: true, result };

        } catch (error: any) {
            const durationMs = Date.now() - startTime;

            await prisma.toolExecution.update({
                where: { id: executor.id },
                data: {
                    status: "FAILED",
                    error: error.message,
                    durationMs,
                    completedAt: new Date(),
                },
            });

            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "ERROR",
                    message: `Tool ${toolName} Failed: ${error.message}`,
                    meta: { toolName, error: error.message, executionId: executor.id },
                },
            });

            logger.info("Tool execution Failed", { toolName, executionId: executor.id, error: error.message });
            throw error;
        }
    },
});


const normalizeToolName = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, "_");
};

export const routeToolExecution = async (toolName: string, input: ToolInput): Promise<Prisma.InputJsonValue> => {
    const key = normalizeToolName(toolName);
    switch (key) {
        case "web_search":
            return webSearchTool(input as { query: string });
        
        case "send_email":
            return SendEmailTool(input as { to: string, subject: string, body: string });
        
        case "read_file":
            return ReadFileTool(input as { path: string });
        
        case "api_call":
            return ApiCallTool(input as { url: string, method: string, body?: unknown });
        
        case "code_execution":
        case "code_interpreter":
            return codeExecutionTool(input as { code: string, language: string });
    
        default:
            throw new Error(`Unknown Tool: ${toolName}`);
    }
}

const webSearchTool = async (input: { query: string }): Promise<Prisma.InputJsonValue> => {
    const res = await fetch(
        `https://api.tavily.com/search`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apikey: process.env.TAVILY_API_KEY, query: input.query }),
        },
    )
    return await res.json() as Promise<Prisma.InputJsonValue>;
}

const SendEmailTool = async (input: { to: string, subject: string, body?: string }): Promise<Prisma.InputJsonValue> => {
    const res = await fetch(
        "https://api.resend.com/emails",
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${process.env.RENDER_EMAIL_API_KEY}` 
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev", // Resend default for testing
                to: input.to,
                subject: input.subject,
                html: input.body
            }),
        },
    );
    return await res.json() as Promise<Prisma.InputJsonValue>;
}

const ReadFileTool = async (input: { path: string }): Promise<Prisma.InputJsonValue> => { 
    const fs = await import("fs/promises")
    return fs.readFile(input.path, "utf-8");
}

const ApiCallTool = async (input: { url: string, method: string, body?: unknown }): Promise<Prisma.InputJsonValue> =>{
    const res = await fetch(
        input.url,
        {
            method: input.method,
            headers: { "Content-type": "application/json" },
            body: input.body ? JSON.stringify(input.body) : "undefined"
        },
    )
    return await res.json() as Promise<Prisma.InputJsonValue>;
}

const codeExecutionTool = async (input: { code: string, language: string }): Promise<Prisma.InputJsonValue> => {
    try {
        const sandBox = await Sandbox.create()
        const execution = await sandBox.runCode(
            input.code
        )

        return {
            success: true,
            output: execution.logs.stdout.join("\n"),
        };
    } catch(error: any) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "something went wrong",
        };
    }
}