type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function currentLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase()
  return configured in LEVEL_PRIORITY ? (configured as LogLevel) : "info"
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel()]) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "modelvault",
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  }

  const line = JSON.stringify(entry)
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
}

export function errorContext(err: unknown): LogContext {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { error: String(err) }
}
