export type ToolCategory =
    | "WEB_SEARCH"
    | "DATABASE"
    | "FILE_PROCESSING"
    | "API_CALLS"
    | "EMAIL"
    | "CALENDER"
    | "NOTIFICATION"
    | "CUSTOM"
    | "CODE_EXECUTIONS";

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    inputSchema: Record<string, unknown>;
    config?: Record<string, unknown> | null;
    isBuiltin: boolean;
    createdAt: Date;
}

export interface AssignToolRequest {
    toolId: string;
    config?: Record<string, unknown>;
}

export interface ToolExecutionResult {
    id: string;
    runId: string;
    toolId: string;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
    status: "PENDING" | "RUNNING" | "FAILED" | "SKIIPED" | "COMPLETED";
    durationMs: number | null;
    createdAt: Date;
    completedAt: Date | null;
}
