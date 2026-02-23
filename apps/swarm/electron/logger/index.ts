export type { LogLevel, LogEntry, LogTransport, Logger } from './types'
export { LoggerImpl } from './logger'
export { ConsoleTransport } from './transports/console'
export { FileTransport } from './transports/file'
export { MemoryTransport } from './transports/memory'

import { LoggerImpl } from './logger'
import { ConsoleTransport } from './transports/console'
import { FileTransport } from './transports/file'
import { MemoryTransport } from './transports/memory'
import type { Logger } from './types'

let _rootLogger: LoggerImpl | null = null
let _memoryTransport: MemoryTransport | null = null
let _fileTransport: FileTransport | null = null

export interface RootLoggerOptions {
  logDir: string
  isDev: boolean
}

export function createRootLogger(opts: RootLoggerOptions): Logger {
  if (_rootLogger) return _rootLogger

  _memoryTransport = new MemoryTransport(1_000)
  _fileTransport = new FileTransport({ dir: opts.logDir })
  const consoleTransport = new ConsoleTransport(opts.isDev)

  _rootLogger = new LoggerImpl({
    ns: 'main',
    transports: [consoleTransport, _fileTransport, _memoryTransport],
    minLevel: opts.isDev ? 'debug' : 'info',
  })

  return _rootLogger
}

export function getMemoryTransport(): MemoryTransport {
  if (!_memoryTransport) throw new Error('createRootLogger() not called yet')
  return _memoryTransport
}

export function getFileTransport(): FileTransport {
  if (!_fileTransport) throw new Error('createRootLogger() not called yet')
  return _fileTransport
}
