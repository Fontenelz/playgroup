export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

function resolveMinLevel(): LogLevel {
  const raw = typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined
  return raw && raw in LEVEL_ORDER ? (raw as LogLevel) : 'info'
}

export function createLogger(scope: string): Logger {
  const minLevel = resolveMinLevel()

  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return
    const prefix = `[${new Date().toISOString()}] [${scope}] ${message}`
    const consoleMethod = level === 'debug' ? 'log' : level
    if (meta) {
      console[consoleMethod](prefix, meta)
    } else {
      console[consoleMethod](prefix)
    }
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  }
}
