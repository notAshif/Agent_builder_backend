import OpenAI from "openai";
import { config } from "../config/config.js";
import { formatToolsForOpenAI } from "../ultil/ai.util.js";
import type { OpenAIMessage } from "../types";

const client = new OpenAI({ apiKey: config.ai?.apiKey });

export const AiService = {
    selectTools: async (
        messages: OpenAIMessage[],
        tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>,
        model = config.ai.model || "gpt-4o",
        maxTokens = config.ai.maxToken || 4096
    ) => {
        const openAITools = formatToolsForOpenAI(tools);
        const response = await client.chat.completions.create({
            model,
            max_tokens: maxTokens,
            tools: openAITools,
            messages: messages as any,
        });
        return response;
    },

    stream: async (
        messages: OpenAIMessage[],
        model = config.ai.model || "gpt-4o",
        maxTokens = config.ai.maxToken || 4096
    ) => {
        return client.chat.completions.create({
            model,
            max_tokens: maxTokens,
            messages: messages as any,
            stream: true,
        });
    },
};
