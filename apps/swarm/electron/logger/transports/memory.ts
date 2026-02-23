import type { LogTransport, LogEntry } from '../types'

export class MemoryTransport implements LogTransport {
  private readonly capacity: number
  private readonly buffer: (LogEntry | undefined)[]
  private head = 0
  private count = 0

  constructor(capacity = 1_000) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  write(entry: LogEntry): void {
    this.buffer[this.head] = entry
    this.head = (this.head + 1) % this.capacity
    this.count++
  }

  tail(
    limit = 100,
    afterCursor?: number,
  ): { entries: LogEntry[]; cursor: number } {
    const cursor = this.count
    const available = Math.min(this.count, this.capacity)
    const startIndex = this.count - available

    const firstWanted =
      afterCursor !== undefined
        ? Math.max(afterCursor, startIndex)
        : this.count - Math.min(limit, available)

    const results: LogEntry[] = []
    for (let abs = firstWanted; abs < this.count; abs++) {
      const ringIdx = abs % this.capacity
      const entry = this.buffer[ringIdx]
      if (entry) results.push(entry)
      if (results.length >= limit) break
    }

    return { entries: results, cursor }
  }
}
