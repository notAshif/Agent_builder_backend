import type { OpenAIToolDefinition, OpenAIMessage } from "../types";

export const countTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
};

export const buildPrompt = (systemPrompt: string, userInput: string): OpenAIMessage[] => {
    return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
    ];
};

export const formatToolsForOpenAI = (tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}>): OpenAIToolDefinition[] => {
    return tools.map((t) => ({
        type: "function",
        function: {
            name: t.name,
            description: t.description,
            parameters: {
                type: "object",
                properties: (t.inputSchema as any)?.properties ?? {},
                required: (t.inputSchema as any)?.required ?? [],
            },
            strict: true
        },
    }));
};
