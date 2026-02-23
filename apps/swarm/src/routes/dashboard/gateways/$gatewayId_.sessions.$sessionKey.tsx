import { useState, useRef, useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { ChatPanel } from '@/components/chat-panel'
import { MetricCard } from '@/components/metric-card'
import {
  SessionActionDialogs,
  type SessionActionDialog,
} from '@/components/session-action-dialogs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeftIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSignIcon,
  RotateCcwIcon,
  MinimizeIcon,
  Trash2Icon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId_/sessions/$sessionKey')({
  component: SessionDetailPage,
  errorComponent: RouteErrorFallback,
})

function SessionDetailPage() {
  const { gatewayId, sessionKey } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [dialog, setDialog] = useState<SessionActionDialog>({ type: 'none' })
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  const { data: usage, isLoading: usageLoading } = useQuery(
    orpc.gateway.sessionUsage.queryOptions({
      input: { gatewayId, sessionKey },
    }),
  )


  const { data: usageLogs } = useQuery(
    orpc.gateway.sessionUsageLogs.queryOptions({
      input: { gatewayId, sessionKey, limit: 50 },
    }),
  )

  const { data: sessions } = useQuery(
    orpc.gateway.sessions.queryOptions({
      input: { gatewayId },
    }),
  )

  const sessionsQueryKey = orpc.gateway.sessions.queryOptions({
    input: { gatewayId },
  }).queryKey

  const resetMutation = useMutation({
    ...orpc.gateway.resetSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session reset')
      setDialog({ type: 'none' })
      void navigate({ to: '/dashboard/gateways/$gatewayId', params: { gatewayId } })
    },
    onError: (err) => {
      toast.error('Failed to reset session', { description: String(err) })
    },
  })

  const deleteMutation = useMutation({
    ...orpc.gateway.deleteSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session deleted')
      setDialog({ type: 'none' })
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
      void navigate({ to: '/dashboard/gateways/$gatewayId', params: { gatewayId } })
    },
    onError: (err) => {
      toast.error('Failed to delete session', { description: String(err) })
    },
  })

  const compactMutation = useMutation({
    ...orpc.gateway.compactSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session compacted')
      setDialog({ type: 'none' })
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.sessionUsage.queryOptions({
          input: { gatewayId, sessionKey },
        }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to compact session', { description: String(err) })
    },
  })

  const patchMutation = useMutation({
    ...orpc.gateway.patchSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Label updated')
      setEditingLabel(false)
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
    },
    onError: (err) => {
      toast.error('Failed to update label', { description: String(err) })
    },
  })

  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [editingLabel])

  const session = sessions?.find((s) => s.key === sessionKey)

  function startEditLabel() {
    setLabelDraft(session?.displayName ?? '')
    setEditingLabel(true)
  }

  function cancelEditLabel() {
    setEditingLabel(false)
  }

  function saveLabel() {
    const trimmed = labelDraft.trim()
    if (!trimmed) {
      cancelEditLabel()
      return
    }
    patchMutation.mutate({ gatewayId, sessionKey, label: trimmed })
  }

  function handleLabelKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveLabel()
    if (e.key === 'Escape') cancelEditLabel()
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          render={<Link to="/dashboard/gateways/$gatewayId" params={{ gatewayId }} />}
        >
          <ArrowLeftIcon />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold">Session Detail</h1>

        {editingLabel ? (
          <div className="flex items-center gap-1">
            <Input
              ref={labelInputRef}
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={handleLabelKeyDown}
              onBlur={saveLabel}
              className="h-6 w-40 text-[0.625rem] font-mono px-2 py-0"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={saveLabel}
              disabled={patchMutation.isPending}
            >
              <CheckIcon />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={cancelEditLabel}>
              <XIcon />
            </Button>
          </div>
        ) : (
          <button type="button" onClick={startEditLabel} className="group flex items-center gap-1">
            <Badge variant="outline" className="font-mono text-[0.625rem]">
              {sessionKey.slice(0, 16)}...
            </Badge>
            <PencilIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <Button variant="outline" size="xs" onClick={() => setDialog({ type: 'reset', sessionKey })}>
          <RotateCcwIcon />
          Reset
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setDialog({ type: 'compact', sessionKey })}
        >
          <MinimizeIcon />
          Compact
        </Button>
        <Button
          variant="destructive"
          size="xs"
          onClick={() => setDialog({ type: 'delete', sessionKey })}
        >
          <Trash2Icon />
          Delete
        </Button>
      </div>

      {/* Session metadata — always shown from sessions.list */}
      {session && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border rounded-lg px-4 py-3 bg-muted/20">
          {session.displayName && (
            <span>
              <span className="font-medium text-foreground">Label</span> {session.displayName}
            </span>
          )}
          {session.kind && (
            <span>
              <span className="font-medium text-foreground">Kind</span> {session.kind}
            </span>
          )}
          {session.channel && (
            <span>
              <span className="font-medium text-foreground">Channel</span> {session.channel}
            </span>
          )}
          {session.agent && (
            <span>
              <span className="font-medium text-foreground">Agent</span> {session.agent}
            </span>
          )}
          {session.model && (
            <span>
              <span className="font-medium text-foreground">Model</span> {session.model}
            </span>
          )}
          {session.lastActiveAt && (
            <span>
              <span className="font-medium text-foreground">Last active</span>{' '}
              {formatDistanceToNow(session.lastActiveAt, { addSuffix: true })}
            </span>
          )}
          <span>
            <span className="font-medium text-foreground">Tokens</span>{' '}
            {(session.tokensIn + session.tokensOut).toLocaleString()}
          </span>
          <span>
            <span className="font-medium text-foreground">Cost</span> ${session.cost.toFixed(4)}
          </span>
        </div>
      )}

      {usageLoading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Tokens In"
              value={(usage?.tokensIn ?? 0).toLocaleString()}
              icon={<ArrowDownIcon className="size-3 text-blue-500" />}
            />
            <MetricCard
              label="Tokens Out"
              value={(usage?.tokensOut ?? 0).toLocaleString()}
              icon={<ArrowUpIcon className="size-3 text-emerald-500" />}
            />
            <MetricCard
              label="Total Cost"
              value={`$${(usage?.cost ?? 0).toFixed(4)}`}
              icon={<DollarSignIcon className="size-3 text-muted-foreground" />}
            />
          </div>

          {usage?.modelBreakdown && usage.modelBreakdown.length > 0 && (
            <div>
              <h2 className="text-xs font-medium mb-2">Model Breakdown</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Tokens In</TableHead>
                    <TableHead className="text-right">Tokens Out</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.modelBreakdown.map((entry) => (
                    <TableRow key={entry.model}>
                      <TableCell className="font-mono text-[0.625rem]">{entry.model}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.tokensIn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.tokensOut.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${entry.cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {usageLogs && usageLogs.length > 0 && <SessionUsageCharts usageLogs={usageLogs} />}

          {usageLogs && usageLogs.length > 0 && (
            <div>
              <h2 className="text-xs font-medium mb-2">Usage Logs</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">
                        {typeof log.timestamp === 'number' && log.timestamp > 0
                          ? format(log.timestamp, 'HH:mm:ss')
                          : '--'}
                      </TableCell>
                      <TableCell>{log.role}</TableCell>
                      <TableCell className="font-mono text-[0.625rem]">{log.model}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.tokensIn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {log.tokensOut.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${log.cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <ChatPanel
        gatewayId={gatewayId}
        sessionKey={sessionKey}
        limit={200}
        style={{ height: '500px' }}
      />

      <SessionActionDialogs
        dialog={dialog}
        onClose={() => setDialog({ type: 'none' })}
        onReset={(sk) => resetMutation.mutate({ gatewayId, sessionKey: sk })}
        onCompact={(sk, maxLines) =>
          compactMutation.mutate({ gatewayId, sessionKey: sk, maxLines })
        }
        onDelete={(sk, deleteTranscript) =>
          deleteMutation.mutate({ gatewayId, sessionKey: sk, deleteTranscript })
        }
        resetPending={resetMutation.isPending}
        compactPending={compactMutation.isPending}
        deletePending={deleteMutation.isPending}
      />
    </div>
  )
}

type UsageLog = {
  timestamp: number
  role: string
  model: string
  tokensIn: number
  tokensOut: number
  cost: number
}

function SessionUsageCharts({ usageLogs }: { usageLogs: UsageLog[] }) {
  const sorted = [...usageLogs].sort((a, b) => a.timestamp - b.timestamp)

  const cumulativeData = sorted.reduce<{ time: string; cost: number }[]>((acc, log) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cost : 0
    acc.push({
      time: log.timestamp > 0 ? format(log.timestamp, 'HH:mm:ss') : '',
      cost: prev + log.cost,
    })
    return acc
  }, [])

  const tokenData = sorted.map((log) => ({
    time: log.timestamp > 0 ? format(log.timestamp, 'HH:mm:ss') : '',
    tokensIn: log.tokensIn,
    tokensOut: log.tokensOut,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Cumulative cost over time */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <h2 className="text-xs font-medium mb-3">Cumulative Cost Over Time</h2>
          <ChartContainer
            config={{
              cost: {
                label: 'Cost',
                color: 'var(--chart-1)',
              },
            }}
            className="aspect-auto h-[160px] w-full"
          >
            <AreaChart data={cumulativeData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cumulative']}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#costGradient)"
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tokens per message */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <h2 className="text-xs font-medium mb-3">Tokens per Message</h2>
          <ChartContainer
            config={{
              tokensIn: { label: 'Tokens In', color: 'var(--chart-1)' },
              tokensOut: { label: 'Tokens Out', color: 'var(--chart-2)' },
            }}
            className="aspect-auto h-[160px] w-full"
          >
            <BarChart data={tokenData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v: number) => v.toLocaleString()}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar
                dataKey="tokensIn"
                stackId="tokens"
                fill="var(--chart-1)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="tokensOut"
                stackId="tokens"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

