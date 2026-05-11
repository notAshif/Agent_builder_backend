export interface OpenAIToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
        };
        strict?: boolean;
    };
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface OpenAIMessage {
    role: MessageRole;
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface OpenAIRequestOptions {
    model: string;
    max_tokens: number;
    temperature?: number;
    tools?: OpenAIToolDefinition[];
    messages: OpenAIMessage[];
}

export interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
