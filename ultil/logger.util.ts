type LogLevel = "info" | "warn" | "error" | "debug";

const formatLog = (level: LogLevel, message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (meta !== undefined) {
        return `${base} ${JSON.stringify(meta)}`;
    }
    return base;
};

export const logger = {
    info: (message: string, meta?: unknown) => console.log(formatLog("info", message, meta)),
    warn: (message: string, meta?: unknown) => console.warn(formatLog("warn", message, meta)),
    error: (message: string, meta?: unknown) => console.error(formatLog("error", message, meta)),
    debug: (message: string, meta?: unknown) => console.debug(formatLog("debug", message, meta)),
};
