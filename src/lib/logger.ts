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

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|apikey|api_key|encryptedkey|authorization|cookie|session|credential|private_key/i

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /\b(sk-[A-Za-z0-9_-]{12,})\b/g,
  /\b(ghp_[A-Za-z0-9]{16,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{16,})\b/g,
  /\b(AIza[0-9A-Za-z_-]{20,})\b/g,
  /\b(Bearer\s+[A-Za-z0-9._~+/=-]+)\b/gi,
  /\b(mv_session=[^;\s]+)/gi,
]

export function redactString(input: string): string {
  let out = input
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]")
  }
  return out
}

export function redactContext(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]"
  if (typeof value === "string") return redactString(value)
  if (Array.isArray(value)) return value.map((item) => redactContext(item, depth + 1))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]"
      } else {
        out[k] = redactContext(v, depth + 1)
      }
    }
    return out
  }
  return value
}

function currentLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase()
  return configured in LEVEL_PRIORITY ? (configured as LogLevel) : "info"
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel()]) return

  const sanitizedContext =
    context && Object.keys(context).length > 0
      ? (redactContext(context) as LogContext)
      : undefined

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactString(message),
    service: "modelvault",
    ...(sanitizedContext ? { context: sanitizedContext } : {}),
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
    return {
      name: err.name,
      message: redactString(err.message),
      ...(process.env.NODE_ENV !== "production" && err.stack ? { stack: redactString(err.stack) } : {}),
    }
  }
  return { error: redactString(String(err)) }
}
