import type { LogTransport, LogEntry, LogLevel } from '../types'

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m', // grey
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
}
const RESET = '\x1b[0m'

export class ConsoleTransport implements LogTransport {
  private readonly enabled: boolean

  constructor(enabled = !!process.env['VITE_DEV_SERVER_URL']) {
    this.enabled = enabled
  }

  write(entry: LogEntry): void {
    if (!this.enabled) return

    const color = COLORS[entry.level]
    const prefix = `${color}[${entry.level.toUpperCase()}]${RESET} [${entry.ns}]`
    const fn =
      entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log

    if (entry.data !== undefined) {
      fn(prefix, entry.msg, entry.data)
    } else {
      fn(prefix, entry.msg)
    }
  }
}
