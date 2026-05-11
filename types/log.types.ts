export type LogLevel = "INFO" | "DEBUG" | "ERROR" | "WARN";

export interface LogEntry {
    id: string;
    runId: string;
    level: LogLevel;
    message: string;
    meta: Record<string, unknown> | null;
    createdAt: Date;
}

export interface LogSummary {
    runId: string;
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
}
