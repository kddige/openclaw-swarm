import fs from 'node:fs'
import path from 'node:path'
import type { LogTransport, LogEntry } from '../types'

export interface FileTransportOptions {
  dir: string
  basename?: string
  maxBytes?: number
  maxFiles?: number
}

export class FileTransport implements LogTransport {
  private readonly dir: string
  private readonly basename: string
  private readonly maxBytes: number
  private readonly maxFiles: number
  private readonly currentPath: string
  private stream: fs.WriteStream | null = null
  private bytesWritten = 0

  constructor(opts: FileTransportOptions) {
    this.dir = opts.dir
    this.basename = opts.basename ?? 'swarm'
    this.maxBytes = opts.maxBytes ?? 5 * 1024 * 1024
    this.maxFiles = opts.maxFiles ?? 5
    this.currentPath = path.join(this.dir, `${this.basename}.log`)
    this.open()
  }

  private open(): void {
    fs.mkdirSync(this.dir, { recursive: true })

    try {
      const stat = fs.statSync(this.currentPath)
      if (stat.size >= this.maxBytes) this.rotate()
    } catch {
      // file doesn't exist yet
    }

    this.stream = fs.createWriteStream(this.currentPath, { flags: 'a' })
    try {
      this.bytesWritten = fs.statSync(this.currentPath).size
    } catch {
      this.bytesWritten = 0
    }
  }

  private rotate(): void {
    this.stream?.end()
    this.stream = null

    for (let i = this.maxFiles - 2; i >= 1; i--) {
      const from = path.join(this.dir, `${this.basename}.${i}.log`)
      const to = path.join(this.dir, `${this.basename}.${i + 1}.log`)
      try {
        fs.renameSync(from, to)
      } catch {
        // skip missing files
      }
    }

    try {
      fs.renameSync(this.currentPath, path.join(this.dir, `${this.basename}.1.log`))
    } catch {
      // skip
    }

    this.bytesWritten = 0
  }

  write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n'
    const bytes = Buffer.byteLength(line)

    if (this.bytesWritten + bytes > this.maxBytes) {
      this.rotate()
      this.open()
    }

    this.stream?.write(line)
    this.bytesWritten += bytes
  }

  get logPath(): string {
    return this.currentPath
  }

  allLogPaths(): string[] {
    const paths = [this.currentPath]
    for (let i = 1; i < this.maxFiles; i++) {
      const p = path.join(this.dir, `${this.basename}.${i}.log`)
      if (fs.existsSync(p)) paths.push(p)
    }
    return paths
  }

  close(): void {
    this.stream?.end()
    this.stream = null
  }
}
