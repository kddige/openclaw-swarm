export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: number
  level: LogLevel
  ns: string
  msg: string
  data?: unknown
}

export interface LogTransport {
  write(entry: LogEntry): void
}

export interface Logger {
  debug(msg: string, data?: unknown): void
  info(msg: string, data?: unknown): void
  warn(msg: string, data?: unknown): void
  error(msg: string, data?: unknown): void
  child(namespace: string): Logger
}
