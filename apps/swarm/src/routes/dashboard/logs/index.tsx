import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery, useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DownloadIcon, ArrowDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/dashboard/logs/')({
  component: LogsPage,
  errorComponent: RouteErrorFallback,
})

interface LogEntry {
  ts: number
  level: string
  ns: string
  msg: string
  data?: unknown
}

const MAX_LINES = 2_000

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-muted-foreground',
  info: 'text-sky-500 dark:text-sky-400',
  warn: 'text-amber-500 dark:text-amber-400',
  error: 'text-destructive',
}

function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCursorRef = useRef<number | undefined>(undefined)
  const [mountNonce] = useState(() => Date.now())

  const { data: logsData, isLoading } = useQuery({
    ...orpc.logs.tail.queryOptions({
      input: { limit: 200, afterCursor: cursor },
    }),
    queryKey: [mountNonce, 'logs-tail', cursor],
    refetchInterval: 2_000,
    staleTime: 0,
    gcTime: 0,
  })

  useEffect(() => {
    if (!logsData) return
    const newEntries = logsData.entries ?? []
    const newCursor = logsData.cursor

    if (
      newCursor !== undefined &&
      newCursor === prevCursorRef.current &&
      newEntries.length === 0
    )
      return

    prevCursorRef.current = newCursor

    if (newEntries.length === 0) return

    const timer = setTimeout(() => {
      setEntries((prev) => {
        const combined = [...prev, ...newEntries]
        return combined.length > MAX_LINES
          ? combined.slice(combined.length - MAX_LINES)
          : combined
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
  }, [entries, atBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distFromBottom < 40)
  }, [])

  const exportMutation = useMutation(orpc.logs.export.mutationOptions())

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Application Logs</h1>
          <p className="text-xs text-muted-foreground">
            Real-time log stream from the main process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate({})}
            disabled={exportMutation.isPending}
          >
            <DownloadIcon className="mr-1 size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="relative flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-auto rounded-md border bg-zinc-950 font-mono text-[0.6875rem] leading-5"
          >
            <div className="p-3">
              {entries.length === 0 && (
                <p className="text-muted-foreground">No log entries yet...</p>
              )}
              {entries.map((e, i) => (
                <div key={i} className="flex gap-2 hover:bg-white/5">
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {new Date(e.ts).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 border-0 px-0 py-0 font-mono text-[0.625rem] uppercase',
                      LEVEL_COLORS[e.level] ?? 'text-muted-foreground',
                    )}
                  >
                    {e.level.padEnd(5)}
                  </Badge>
                  <span className="shrink-0 text-zinc-500">[{e.ns}]</span>
                  <span
                    className={cn(
                      'min-w-0 break-all',
                      e.level === 'error'
                        ? 'text-destructive'
                        : e.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-zinc-200',
                    )}
                  >
                    {e.msg}
                    {e.data !== undefined && (
                      <span className="ml-2 text-zinc-500">
                        {typeof e.data === 'string'
                          ? e.data
                          : JSON.stringify(e.data)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!atBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-3 right-5 rounded-full bg-zinc-800 p-1.5 text-zinc-400 shadow-md transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              <ArrowDownIcon className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
