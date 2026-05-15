import { logger, task } from "@trigger.dev/sdk"
import { prisma } from "../../prisma/db.js";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/config.js";
import { executeToolTask } from "./toolExecutor.js";

const getAnthropicClient = () => {
    const key = config.ai.claudeApiKey;
    if (!key) {
        throw new Error("CLAUDE_API_KEY is not configured. Add it to your .env file.");
    }
    return new Anthropic({ apiKey: key });
};

export const agentRunTask = task({
    id: "agent-run",
    retry: {
        maxAttempts: 2,
        factor: 2,
        minTimeoutInMs: 1300,
    },

    run: async (payload: { agentId: string, input: string, runId: string }) => {
        const { runId, input, agentId } = payload;

        //step:1 mark run as Running
        await prisma.agentRuns.update({
            where: { id: runId },
            data: { status: "RUNNING", startedAt: new Date() },
        });
        logger.info("Agent run started", { runId, agentId })

        try {
            const anthropic = getAnthropicClient();

            //step:2 load agent + tool
            const agent = await prisma.agent.findUniqueOrThrow({
                where: { id: agentId },
                include: {
                    tools: {
                        include: { tool: true }
                    },
                },
            });

            const agentConfig = agent.config as ({
                model?: string;
                maxToken?: number;
                tempreture?: number;
                systemprompt?: string;
            });

            //step:3 build tool for claude
            const tools: Anthropic.Tool[] = agent.tools.map(({ tool }) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
            }));

            //step:4 log start
            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "INFO",
                    message: `Agent ${agent.name} started`,
                    meta: { toolCount: tools.length, input },
                },
            });

            //step:5 call claude for tool use
            const messages: Anthropic.MessageParam[] = [
                { role: "user", content: input },
            ];

            let finalOutput: any = "";
            let totalToken = 0;
            let continueLoop = true;

            const model =
                agentConfig.model ??
                config.ai.claudeModel ??
                config.ai.model ??
                "claude-sonnet-4-20250514";
            const system = agentConfig.systemprompt ?? agent.prompt;

            // agent looping
            while (continueLoop) {
                const response = await anthropic.messages.create({
                    model,
                    max_tokens: 8096,
                    system,
                    tools,
                    messages,
                });

                totalToken += (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);

                if (response.stop_reason === "end_turn") {
                    finalOutput = response.content
                        .filter((b) => b.type === "text")
                        .map((b) => (b as Anthropic.TextBlock).text)
                        .join("\n")
                    continueLoop = false
                } else if (response.stop_reason === "tool_use") {
                    const ToolUseBlock = response.content.filter(
                        (b) => b.type === "tool_use"
                    ) as Anthropic.ToolUseBlock[];

                    messages.push({ role: "assistant", content: response.content });

                    const ToolResult: Anthropic.ToolResultBlockParam[] = []

                    for (const tooluse of ToolUseBlock) {
                        logger.info("Executing Tool", { tool: tooluse.name, runId });

                        const result = await executeToolTask.triggerAndWait({
                            runId,
                            toolName: tooluse.name,
                            toolUsedId: tooluse.id,
                            input: tooluse.input as Record<string, unknown>,
                        });

                        ToolResult.push({
                            type: "tool_result",
                            tool_use_id: tooluse.id,
                            content: result.ok ? JSON.stringify(result.output.result) : `Error: ${result?.error ?? "Tool Failed!"}`,
                        });

                        messages.push({
                            role: "user",
                            content: ToolResult
                        });
                    };
                } else {
                    continueLoop = false;
                }
            }

            //step:6 react flow graph
            await buildFlowTask.trigger({ runId, agentId, messages });

            //step:7 mark as run completed
            await prisma.agentRuns.update({
                where: { id: runId },
                data: {
                    status: "COMPLETED",
                    tokenUsed: totalToken,
                    output: finalOutput,
                    completedAt: new Date(),
                },
            });

            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "INFO",
                    message: "Agent run completed sucessfully",
                    meta: { totalToken, outputLength: finalOutput.length },
                },
            });

            logger.info("Agent run Completed!!", { runId, agentId });
            return { success: true, totalToken, output: finalOutput };

        } catch (error: any) {
            //step:8 mark as run failed
            await prisma.agentRuns.update({
                where: { id: runId },
                data: {
                    status: "FAILED",
                    error: error.message,
                    completedAt: new Date()
                },
            });

            await prisma.agentLogs.create({
                data: {
                    runId,
                    level: "ERROR",
                    message: `Agent run failed ${error.message}`,
                    meta: { stack: error.stack },
                },
            });

            logger.info("Agent run Failed", { runId, error: error.message });
            throw error;
        }
    }
})

//Sub-task:: react flow graph
const buildFlowTask = task({
    id: "build-flow",

    run: async (payload: {
        runId: string,
        agentId: string,
        messages: Anthropic.MessageParam[],
    }) => {
        const { runId, agentId, messages } = payload;

        const nodes: any[] = [];
        const edges: any[] = [];
        let nodeIndex = 0;

        const addNode = (id: string, type: string, label: string, data: any) => {
            nodes.push({
                id, type,
                position: { x: 100, y: nodeIndex * 120 },
                data: { label, ...data },
            });
            nodeIndex++;
        };

        //start node 
        addNode("start", "input", "User Input", { message: messages[0]?.content })
        for (const msg of messages) {
            if (msg.role === "assistant" && Array.isArray(msg.content)) {
                for (const block of msg.content) {
                    if (block.type === "tool_use") {
                        const nodeId = `tool-${block.id}`
                        addNode(nodeId, "tool", `🔧 ${block.name}`, { input: block.input });
                        if (nodes.length > 1) {
                            edges.push({
                                id: `e-${nodes[nodes.length - 2].id}-${nodeId}`,
                                source: nodes[nodes.length - 2].id,
                                target: nodeId,
                                animated: true,
                            });
                        }
                    }
                }
            }
        }

        //end node 
        addNode("end", "output", "Agent Output", {});
        edges.push({
            id: `e-${nodes[nodes.length - 2].id}-end`,
            source: nodes[nodes.length - 2].id,
            target: "end",
            animated: true,
        });

        await prisma.agentFlows.upsert({
            where: { runId },
            update: {
                node: nodes,
                edge: edges,
            },
            create: {
                agentId,
                runId,
                node: nodes,
                edge: edges,
            },
        });
    },
});

export { buildFlowTask };