import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDownIcon, TerminalIcon } from 'lucide-react'

type LogLine = {
  ts: number
  level: string
  msg: string
  source?: string
  [key: string]: unknown
}

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-muted-foreground',
  info: 'text-foreground',
  warn: 'text-amber-400',
  error: 'text-red-400',
}

function formatLogTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const MAX_LINES = 1000

export function LogsPanel({ gatewayId, className }: { gatewayId: string; className?: string }) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [lines, setLines] = useState<LogLine[]>([])
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [mountNonce] = useState(() => Date.now())
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [prevLevelFilter, setPrevLevelFilter] = useState(levelFilter)
  const [prevSourceFilter, setPrevSourceFilter] = useState(sourceFilter)
  if (prevLevelFilter !== levelFilter || prevSourceFilter !== sourceFilter) {
    setPrevLevelFilter(levelFilter)
    setPrevSourceFilter(sourceFilter)
    setLines([])
    setCursor(undefined)
  }

  const queryInput = {
    gatewayId,
    limit: 200,
    ...(levelFilter !== 'all' ? { level: levelFilter } : {}),
    ...(sourceFilter.trim() ? { source: sourceFilter.trim() } : {}),
  }

  const { data: logsData } = useQuery({
    ...orpc.gateway.logsTail.queryOptions({
      input: {
        ...queryInput,
        cursor: cursor,
      },
    }),
    queryKey: [mountNonce, gatewayId, cursor, levelFilter, sourceFilter],
    refetchInterval: 3000,
    staleTime: 0,
    gcTime: 0,
  })

  const prevCursorRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!logsData) return
    const newLines: LogLine[] = logsData.lines ?? []
    const newCursor: number | undefined = logsData.cursor
    if (newCursor !== undefined && newCursor === prevCursorRef.current && newLines.length === 0)
      return
    prevCursorRef.current = newCursor
    if (newLines.length === 0) return
    const timer = setTimeout(() => {
      setLines((prev) => {
        const combined = [...prev, ...newLines]
        return combined.length > MAX_LINES ? combined.slice(combined.length - MAX_LINES) : combined
      })
      if (newCursor) setCursor(newCursor)
    }, 0)
    return () => clearTimeout(timer)
  }, [logsData])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    setAtBottom(true)
  }, [])

  useEffect(() => {
    if (atBottom) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [lines, atBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distFromBottom <= 50)
  }, [])

  const handleClear = () => {
    setLines([])
    setCursor(undefined)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)} style={{ height: '100%', minHeight: '400px' }}>
      {/* Filter bar */}
      <div className="flex items-center gap-2 shrink-0">
        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v ?? 'all')}>
          <SelectTrigger className="w-32 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by source…"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-7 w-40 text-xs"
        />
        <Button variant="outline" size="sm" onClick={handleClear} className="h-7 text-xs">
          Clear
        </Button>
      </div>

      {/* Log area */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto rounded-lg border bg-zinc-950 p-3"
        >
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
              <TerminalIcon className="size-6 opacity-40" />
              <span className="font-mono text-xs">No logs available</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {lines.map((line, i) => {
                const levelColor = LEVEL_COLORS[line.level] ?? 'text-zinc-400'
                return (
                  <div
                    key={i}
                    className="flex items-baseline gap-2 font-mono text-[0.75rem] leading-relaxed"
                  >
                    <span className="text-zinc-500 shrink-0 tabular-nums">
                      {formatLogTime(line.ts)}
                    </span>
                    <span
                      className={cn(
                        'w-10 shrink-0 uppercase text-[0.6rem] font-semibold tabular-nums',
                        levelColor,
                      )}
                    >
                      {line.level}
                    </span>
                    {line.source && (
                      <span className="shrink-0 rounded px-1 bg-zinc-800 text-zinc-400 text-[0.625rem] font-medium">
                        {line.source}
                      </span>
                    )}
                    <span className={cn('break-all', levelColor)}>{line.msg}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Jump to bottom button */}
        {!atBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-[0.625rem] font-medium text-zinc-300 shadow-lg hover:bg-zinc-700 transition-colors"
          >
            <ArrowDownIcon className="size-3" />
            Jump to bottom
          </button>
        )}
      </div>
    </div>
  )
}
