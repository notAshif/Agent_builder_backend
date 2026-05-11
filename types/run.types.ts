export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TriggerRunRequest {
    input: string;
}

export interface RunResponse {
    id: string;
    agentId: string;
    status: RunStatus;
    input: string;
    output: string | null;
    error: string | null;
    triggerId: string | null;
    tokenUsed: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}

export interface RunStatusResponse {
    runId: string;
    status: RunStatus;
    triggerId: string | null;
}
