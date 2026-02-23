import type { LogLevel, LogEntry, LogTransport, Logger } from './types'

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error']

export class LoggerImpl implements Logger {
  private readonly ns: string
  private readonly transports: LogTransport[]
  private readonly minLevelIdx: number

  constructor(options: {
    ns: string
    transports: LogTransport[]
    minLevel?: LogLevel
  }) {
    this.ns = options.ns
    this.transports = options.transports
    this.minLevelIdx = LEVEL_ORDER.indexOf(options.minLevel ?? 'debug')
  }

  private write(level: LogLevel, msg: string, data?: unknown): void {
    if (LEVEL_ORDER.indexOf(level) < this.minLevelIdx) return

    const entry: LogEntry = { ts: Date.now(), level, ns: this.ns, msg }
    if (data !== undefined) entry.data = data

    for (const t of this.transports) {
      try {
        t.write(entry)
      } catch {
        // transport failure must never crash the app
      }
    }
  }

  debug(msg: string, data?: unknown): void {
    this.write('debug', msg, data)
  }
  info(msg: string, data?: unknown): void {
    this.write('info', msg, data)
  }
  warn(msg: string, data?: unknown): void {
    this.write('warn', msg, data)
  }
  error(msg: string, data?: unknown): void {
    this.write('error', msg, data)
  }

  child(namespace: string): Logger {
    return new LoggerImpl({
      ns: this.ns ? `${this.ns}:${namespace}` : namespace,
      transports: this.transports,
      minLevel: LEVEL_ORDER[this.minLevelIdx],
    })
  }
}
