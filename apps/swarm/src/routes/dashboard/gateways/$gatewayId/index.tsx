import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { ChatPanel } from '@/components/chat-panel'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MonitorIcon,
  ClockIcon,
  ServerIcon,
  ActivityIcon,
  LinkIcon,
  TerminalIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  MinimizeIcon,
  Trash2Icon,
  ShieldIcon,
  AlertTriangleIcon,
  ArrowDownIcon,
  MessageSquareIcon,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatDistanceToNow } from 'date-fns'
import { XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/')({
  component: GatewayDetailPage,
  errorComponent: RouteErrorFallback,
})

const REDACTED = '__OPENCLAW_REDACTED__'

function stripRedacted(obj: unknown): { cleaned: unknown; redactedCount: number } {
  let redactedCount = 0

  function walk(v: unknown): unknown {
    if (typeof v === 'string' && v === REDACTED) {
      redactedCount++
      return undefined
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v !== null && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const walked = walk(val)
        if (walked !== undefined) out[k] = walked
      }
      return out
    }
    return v
  }

  return { cleaned: walk(obj), redactedCount }
}

function statusBadge(status: string) {
  switch (status) {
    case 'connected':
      return { text: 'Connected', dot: 'bg-emerald-500' }
    case 'connecting':
      return { text: 'Connecting', dot: 'bg-amber-500 animate-pulse' }
    case 'pairing':
      return { text: 'Pairing Required', dot: 'bg-amber-400 animate-pulse' }
    case 'auth-failed':
      return { text: 'Auth Failed', dot: 'bg-destructive' }
    default:
      return { text: 'Offline', dot: 'bg-muted-foreground/50' }
  }
}

function PairingBanner({ gatewayId, requestId }: { gatewayId: string; requestId: string | null }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)

  const reconnectMutation = useMutation({
    ...orpc.gateway.reconnect.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.get.queryOptions({ input: { id: gatewayId } }).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.list.queryOptions().queryKey,
      })
    },
  })

  const command = requestId ? `openclaw devices approve ${requestId}` : null

  const copyCommand = async () => {
    if (!command) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Device Pairing Required
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This gateway requires you to approve this device before connecting. Run this command on the
        machine running the gateway:
      </p>
      {command ? (
        <button
          type="button"
          onClick={copyCommand}
          className="group flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
        >
          <TerminalIcon className="size-3 text-muted-foreground shrink-0" />
          <code className="flex-1 font-mono text-[0.6875rem] text-foreground select-all">
            {command}
          </code>
          {copied ? (
            <CheckIcon className="size-3 text-emerald-500 shrink-0" />
          ) : (
            <CopyIcon className="size-3 text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-md border bg-muted/60 px-3 py-2">
          <code className="font-mono text-[0.6875rem] text-foreground">openclaw devices list</code>
          <p className="text-[0.625rem] text-muted-foreground">
            Find the pending request, then run:{' '}
            <code className="font-mono">openclaw devices approve &lt;requestId&gt;</code>
          </p>
        </div>
      )}
      <p className="text-[0.625rem] text-muted-foreground">
        You can also approve via the OpenClaw Control UI → Devices tab.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => reconnectMutation.mutate({ id: gatewayId })}
        disabled={reconnectMutation.isPending}
        className="self-start"
      >
        {reconnectMutation.isPending && <Spinner className="size-3" />}
        <RefreshCwIcon className="size-3" />
        Retry Connection
      </Button>
    </div>
  )
}

function GatewayDetailPage() {
  const { gatewayId } = Route.useParams()
  const { data: gateway, isLoading } = useQuery(
    orpc.gateway.get.queryOptions({ input: { id: gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!gateway) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">Gateway not found.</p>
      </div>
    )
  }

  const status = statusBadge(gateway.status)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" render={<Link to="/dashboard" />}>
          <ArrowLeftIcon />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold truncate">{gateway.label}</h1>
        <Badge variant="outline" className="gap-1.5 shrink-0">
          <span className={cn('size-1.5 rounded-full', status.dot)} />
          {status.text}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/dashboard/gateways/$gatewayId/chat" params={{ gatewayId }} />}
        >
          <MessageSquareIcon className="size-3" />
          Maintenance Chat
        </Button>
      </div>

      {gateway.status === 'pairing' && (
        <PairingBanner gatewayId={gatewayId} requestId={gateway.pairingRequestId} />
      )}

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <StatusTab gateway={gateway} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab gateway={gateway} />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="devices">
          <DevicesTab gatewayId={gatewayId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UsageTab({ gatewayId }: { gatewayId: string }) {
  const { data: costData, isLoading } = useQuery(
    orpc.gateway.cost.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    )
  }

  const daily = costData?.daily ?? []

  if (daily.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No usage data available.</div>
    )
  }

  const totalCost = daily.reduce((sum, d) => sum + d.totalCost, 0)
  const totalTokens = daily.reduce((sum, d) => sum + d.totalTokens, 0)

  const chartData = daily.map((d) => ({
    date: d.date.slice(-5),
    totalCost: d.totalCost,
  }))

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Daily cost area chart */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <h3 className="text-xs font-medium mb-3">Daily Cost (last {daily.length} days)</h3>
          <ChartContainer
            config={{ totalCost: { label: 'Cost', color: 'var(--chart-1)' } }}
            className="aspect-auto h-[200px] w-full"
          >
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Summary row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Total Cost (period)
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">${totalCost.toFixed(4)}</span>
          </CardContent>
        </Card>
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Total Tokens (period)
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">
              {totalTokens.toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusTab({
  gateway,
}: {
  gateway: {
    url: string
    lastConnectedAt: number | null
    lastError: string | null
    serverInfo: { version: string; host: string; connId: string } | null
    gatewayStatus: Record<string, unknown> | null
  }
}) {
  const info = gateway.serverInfo
  const s = gateway.gatewayStatus

  if (!info && !s) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No status data available. Gateway may not be connected.
      </div>
    )
  }

  const heartbeat = s?.heartbeat as
    | { defaultAgentId?: string; agents?: { agentId: string; every: string }[] }
    | undefined
  const channelSummary = (s?.channelSummary ?? []) as string[]

  const items: { label: string; value: string; icon: typeof ServerIcon }[] = []

  if (info) {
    items.push({ label: 'Version', value: info.version, icon: ServerIcon })
    items.push({ label: 'Host', value: info.host, icon: ActivityIcon })
  }
  items.push({ label: 'URL', value: gateway.url, icon: MonitorIcon })
  if (heartbeat?.defaultAgentId) {
    items.push({
      label: 'Default Agent',
      value: heartbeat.defaultAgentId,
      icon: UserIcon,
    })
  }
  if (heartbeat?.agents?.length) {
    items.push({
      label: 'Heartbeat Agents',
      value: heartbeat.agents.map((a) => `${a.agentId} (${a.every})`).join(', '),
      icon: ClockIcon,
    })
  }
  if (gateway.lastConnectedAt) {
    items.push({
      label: 'Connected',
      value: formatDistanceToNow(gateway.lastConnectedAt, { addSuffix: true }),
      icon: ClockIcon,
    })
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.label} size="sm" className="bg-muted/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <item.icon className="size-3 text-muted-foreground" />
                <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-medium break-all">{item.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {channelSummary.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-2">Channels</h3>
          <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
            {channelSummary.map((line, i) => (
              <p key={i} className="font-mono text-[0.6875rem] text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type SessionActionDialog =
  | { type: 'none' }
  | { type: 'reset'; sessionKey: string }
  | { type: 'compact'; sessionKey: string }
  | { type: 'delete'; sessionKey: string; deleteTranscript: boolean }

function SessionsTab({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()
  const [actionDialog, setActionDialog] = useState<SessionActionDialog>({ type: 'none' })

  const { data: initialSessions, isLoading } = useQuery(
    orpc.gateway.sessions.queryOptions({ input: { gatewayId } }),
  )

  const { data: streamedChunks } = useQuery(
    orpc.gateway.sessionsStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'replace' },
    }),
  )

  const sessions =
    streamedChunks && streamedChunks.length > 0
      ? streamedChunks[streamedChunks.length - 1]!.sessions
      : initialSessions

  const sessionsQueryKey = orpc.gateway.sessions.queryOptions({
    input: { gatewayId },
  }).queryKey

  const resetMutation = useMutation({
    ...orpc.gateway.resetSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session reset')
      setActionDialog({ type: 'none' })
    },
    onError: (err) => {
      toast.error('Failed to reset session', { description: String(err) })
    },
  })

  const compactMutation = useMutation({
    ...orpc.gateway.compactSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session compacted')
      setActionDialog({ type: 'none' })
    },
    onError: (err) => {
      toast.error('Failed to compact session', { description: String(err) })
    },
  })

  const deleteMutation = useMutation({
    ...orpc.gateway.deleteSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session deleted')
      setActionDialog({ type: 'none' })
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
    },
    onError: (err) => {
      toast.error('Failed to delete session', { description: String(err) })
    },
  })

  if (isLoading) {
    return (
      <div className="pt-2 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    )
  }

  if (!sessions?.length) {
    return <div className="py-8 text-center text-xs text-muted-foreground">No sessions found.</div>
  }

  return (
    <div className="pt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.key}>
              <TableCell>
                <Link
                  to="/dashboard/gateways/$gatewayId/sessions/$sessionKey"
                  params={{ gatewayId, sessionKey: session.key }}
                  className="font-mono text-[0.625rem] hover:underline"
                >
                  {session.key.length > 24 ? `${session.key.slice(0, 12)}...` : session.key}
                </Link>
              </TableCell>
              <TableCell className="truncate max-w-32">{session.displayName ?? '--'}</TableCell>
              <TableCell className="text-muted-foreground">{session.kind ?? '--'}</TableCell>
              <TableCell>{session.agent ?? '--'}</TableCell>
              <TableCell className="text-muted-foreground">
                {session.lastActiveAt
                  ? formatDistanceToNow(session.lastActiveAt, {
                      addSuffix: true,
                    })
                  : '--'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {(session.tokensIn + session.tokensOut).toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">${session.cost.toFixed(4)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setActionDialog({ type: 'reset', sessionKey: session.key })}
                    >
                      <RotateCcwIcon />
                      Reset Session
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActionDialog({ type: 'compact', sessionKey: session.key })}
                    >
                      <MinimizeIcon />
                      Compact Session
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        setActionDialog({
                          type: 'delete',
                          sessionKey: session.key,
                          deleteTranscript: false,
                        })
                      }
                    >
                      <Trash2Icon />
                      Delete Session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Reset Dialog */}
      <AlertDialog
        open={actionDialog.type === 'reset'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the session state. The transcript may be preserved depending on
              gateway settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionDialog.type === 'reset' &&
                resetMutation.mutate({ gatewayId, sessionKey: actionDialog.sessionKey })
              }
              disabled={resetMutation.isPending}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compact Dialog */}
      <AlertDialog
        open={actionDialog.type === 'compact'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compact Session</AlertDialogTitle>
            <AlertDialogDescription>
              Summarize and compress the session history to reduce token usage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionDialog.type === 'compact' &&
                compactMutation.mutate({ gatewayId, sessionKey: actionDialog.sessionKey })
              }
              disabled={compactMutation.isPending}
            >
              Compact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={actionDialog.type === 'delete'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={actionDialog.type === 'delete' ? actionDialog.deleteTranscript : false}
              onChange={(e) =>
                actionDialog.type === 'delete' &&
                setActionDialog({ ...actionDialog, deleteTranscript: e.target.checked })
              }
              className="rounded"
            />
            Also delete transcript
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                actionDialog.type === 'delete' &&
                deleteMutation.mutate({
                  gatewayId,
                  sessionKey: actionDialog.sessionKey,
                  deleteTranscript: actionDialog.deleteTranscript,
                })
              }
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function HealthTab({
  gateway,
}: {
  gateway: {
    health: {
      ok: boolean
      channels: Record<
        string,
        {
          configured: boolean
          running: boolean
          lastError: string | null
          probe?: { ok: boolean; error: string | null }
        }
      >
    } | null
  }
}) {
  const h = gateway.health

  if (!h) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No health data available.
      </div>
    )
  }

  const channelEntries = Object.entries(h.channels)

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Overall</span>
        {h.ok ? (
          <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="size-2.5" />
            Healthy
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircleIcon className="size-2.5" />
            Unhealthy
          </Badge>
        )}
      </div>

      {channelEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-2">Channels</h3>
          <div className="space-y-1.5">
            {channelEntries.map(([name, ch]) => {
              const isOk = ch.probe?.ok ?? ch.running ?? ch.configured
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize">{name}</span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      {ch.configured ? 'configured' : 'not configured'}
                      {ch.running ? ' · running' : ''}
                    </span>
                  </div>
                  {isOk ? (
                    <Badge
                      variant="outline"
                      className="gap-1 text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircleIcon className="size-2.5" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircleIcon className="size-2.5" />
                      {ch.lastError ?? ch.probe?.error ?? 'Error'}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AgentsTab({ gatewayId }: { gatewayId: string }) {
  const { data: agents, isLoading } = useQuery(
    orpc.gateway.agents.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!agents?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No agents configured.</div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
      {agents.map((agent) => (
        <Card key={agent.id} size="sm" className="bg-muted/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <UserIcon className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <CardTitle>{agent.id}</CardTitle>
                {agent.isDefault && (
                  <span className="text-[0.625rem] text-muted-foreground">Default agent</span>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function securityModeBadgeClass(mode: string | undefined) {
  switch (mode) {
    case 'full':
      return 'text-destructive border-destructive/40'
    case 'allowlist':
      return 'text-amber-600 dark:text-amber-400 border-amber-500/40'
    case 'deny':
      return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
    default:
      return ''
  }
}

function SecurityTab({ gatewayId }: { gatewayId: string }) {
  const { data, isLoading, error } = useQuery(
    orpc.gateway.execApprovals.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Exec approvals not available.
      </div>
    )
  }

  if (!data) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Not configured.</div>
  }

  if (!data.exists) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No exec approvals file found on this gateway.
      </div>
    )
  }

  const { file } = data
  const defaults = file.defaults
  const hasDefaults = defaults && Object.keys(defaults).length > 0
  const agents = file.agents ? Object.entries(file.agents) : []

  return (
    <div className="flex flex-col gap-4 pt-2">
      {hasDefaults && (
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-3 text-muted-foreground" />
              <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                Defaults
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {defaults.security && (
                <Badge
                  variant="outline"
                  className={cn('gap-1', securityModeBadgeClass(defaults.security))}
                >
                  security: {defaults.security}
                </Badge>
              )}
              {defaults.ask && <Badge variant="outline">ask: {defaults.ask}</Badge>}
              {defaults.askFallback && (
                <Badge variant="outline">fallback: {defaults.askFallback}</Badge>
              )}
              {defaults.autoAllowSkills !== undefined && (
                <Badge variant="outline">autoAllowSkills: {String(defaults.autoAllowSkills)}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length === 0 && !hasDefaults && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No exec approval configuration found. Exec security is using gateway defaults.
        </div>
      )}

      {agents.map(([agentId, config]) => (
        <div key={agentId} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <UserIcon className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium">{agentId}</span>
            <div className="flex flex-wrap gap-1.5">
              {config.security && (
                <Badge
                  variant="outline"
                  className={cn('gap-1', securityModeBadgeClass(config.security))}
                >
                  {config.security}
                </Badge>
              )}
              {config.ask && (
                <Badge variant="outline" className="text-[0.625rem]">
                  ask: {config.ask}
                </Badge>
              )}
              {config.autoAllowSkills !== undefined && (
                <Badge variant="outline" className="text-[0.625rem]">
                  autoAllowSkills: {String(config.autoAllowSkills)}
                </Badge>
              )}
            </div>
          </div>

          {config.security === 'full' && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertTriangleIcon className="size-3 text-destructive shrink-0" />
              <span className="text-[0.625rem] text-destructive font-medium">
                Full access — all commands allowed
              </span>
            </div>
          )}

          {config.allowlist && config.allowlist.length > 0 ? (
            <div className="rounded-md border bg-muted/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Last Command</TableHead>
                    <TableHead>Resolved Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.allowlist.map((entry, i) => (
                    <TableRow key={entry.id ?? i}>
                      <TableCell className="font-mono text-[0.625rem]">{entry.pattern}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {entry.lastUsedAt
                          ? formatDistanceToNow(entry.lastUsedAt, { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="font-mono text-[0.625rem] max-w-48 truncate">
                        {entry.lastUsedCommand ?? '--'}
                      </TableCell>
                      <TableCell className="font-mono text-[0.625rem] text-muted-foreground max-w-40 truncate">
                        {entry.lastResolvedPath ?? '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : config.security !== 'full' ? (
            <div className="py-4 text-center text-xs text-muted-foreground rounded-md border bg-muted/20">
              No allowed commands.
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

const MAINTENANCE_SESSION_KEY = 'swarm-maintenance'

function ChatTab({ gatewayId }: { gatewayId: string }) {
  return (
    <ChatPanel
      gatewayId={gatewayId}
      sessionKey={MAINTENANCE_SESSION_KEY}
      className="pt-2"
      style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}
    />
  )
}

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

function LogsTab({ gatewayId }: { gatewayId: string }) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [lines, setLines] = useState<LogLine[]>([])
  const [cursor, setCursor] = useState<number | undefined>(undefined)
  // mountNonce forces a fresh query on every mount, bypassing stale cache
  const [mountNonce] = useState(() => Date.now())
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track previous filters to reset lines/cursor during render when they change
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

  // Initial fetch + polling — mountNonce in queryKey ensures no stale cache reuse
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

  // Append new lines when data arrives
  const prevCursorRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!logsData) return
    const newLines: LogLine[] = logsData.lines ?? []
    const newCursor: number | undefined = logsData.cursor
    // Skip if we've already processed this exact cursor position
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

  // Auto-scroll when new lines arrive and user is at bottom
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
    <div
      className="flex flex-col gap-3 pt-2"
      style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}
    >
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

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'groq', label: 'Groq' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'other', label: 'Other' },
] as const

const CHANNELS = [
  { value: 'none', label: 'None' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'signal', label: 'Signal' },
  { value: 'imessage', label: 'iMessage' },
] as const

function ProviderWizard({
  gatewayId,
  data,
}: {
  gatewayId: string
  data: { raw: string; hash?: string } | undefined
}) {
  const queryClient = useQueryClient()

  // Parse the raw config once
  const parsed = useMemo<Record<string, unknown>>(() => {
    const raw = data?.raw
    if (!raw) return {}
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [data])

  // Helper to safely navigate nested config
  const getPath = useCallback(
    (...keys: string[]): unknown => {
      let cur: unknown = parsed
      for (const k of keys) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = (cur as Record<string, unknown>)[k]
      }
      return cur
    },
    [parsed],
  )

  const isRedacted = (v: unknown) => v === REDACTED

  // --- Section 1: Provider & Model ---
  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState(() => {
    const v = getPath('defaultModel')
    return typeof v === 'string' && !isRedacted(v) ? v : ''
  })

  // Key-set indicator for the currently selected provider
  const existingProviderKey = useMemo(() => {
    if (!provider) return false
    const v = getPath('providers', provider, 'apiKey')
    return isRedacted(v)
  }, [provider, getPath])

  // --- Section 2: Agent Settings ---
  const [defaultAgentId, setDefaultAgentId] = useState(() => {
    const v = getPath('heartbeat', 'defaultAgentId')
    return typeof v === 'string' && !isRedacted(v) ? v : ''
  })
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(() => {
    const agents = getPath('heartbeat', 'agents')
    if (!Array.isArray(agents) || agents.length === 0) return false
    const first = agents[0] as Record<string, unknown>
    return first?.enabled === true
  })
  const [heartbeatInterval, setHeartbeatInterval] = useState(() => {
    const agents = getPath('heartbeat', 'agents')
    if (!Array.isArray(agents) || agents.length === 0) return ''
    const first = agents[0] as Record<string, unknown>
    const v = first?.every
    return typeof v === 'string' ? v : ''
  })

  // --- Section 3: Channel ---
  const [channel, setChannel] = useState('none')
  const [discordToken, setDiscordToken] = useState('')

  const existingDiscordToken = useMemo(() => {
    const v = getPath('channels', 'discord', 'token')
    return isRedacted(v)
  }, [getPath])

  const patchMutation = useMutation({
    ...orpc.gateway.configPatch.mutationOptions(),
    onSuccess: () => {
      toast.success('Config saved')
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to save config', { description: String(err) })
    },
  })

  const handleSave = () => {
    const patch: Record<string, unknown> = {}

    // Provider API key
    if (provider && apiKey.trim() && !isRedacted(apiKey)) {
      patch.providers = {
        [provider]: { apiKey: apiKey.trim() },
      }
    }

    // Default model
    if (defaultModel.trim()) {
      patch.defaultModel = defaultModel.trim()
    }

    // Agent settings
    const agentId = defaultAgentId.trim() || 'main'
    const heartbeatPatch: Record<string, unknown> = {}
    if (defaultAgentId.trim()) {
      heartbeatPatch.defaultAgentId = defaultAgentId.trim()
    }
    // Always write heartbeat agents if the user has interacted (enabled or set interval)
    if (heartbeatEnabled || heartbeatInterval.trim()) {
      heartbeatPatch.agents = [
        {
          agentId,
          enabled: heartbeatEnabled,
          ...(heartbeatInterval.trim() ? { every: heartbeatInterval.trim() } : {}),
        },
      ]
    }
    if (Object.keys(heartbeatPatch).length > 0) {
      patch.heartbeat = heartbeatPatch
    }

    // Channel
    if (channel === 'discord' && discordToken.trim() && !isRedacted(discordToken)) {
      patch.channels = { discord: { token: discordToken.trim() } }
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save')
      return
    }

    const { cleaned } = stripRedacted(patch)
    patchMutation.mutate({
      gatewayId,
      raw: JSON.stringify(cleaned, null, 2),
      baseHash: data?.hash,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Provider & Model */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Provider &amp; Model
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v ?? '')}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue placeholder="Select provider…" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs">API Key</Label>
                {existingProviderKey && (
                  <Badge variant="outline" className="text-[0.625rem] py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
                    Key set ✓
                  </Badge>
                )}
              </div>
              <Input
                size={undefined}
                type="password"
                className="h-8 text-xs w-72"
                placeholder="Enter new API key…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {existingProviderKey && (
                <p className="text-[0.625rem] text-muted-foreground">
                  Leave empty to keep existing key
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Default model</Label>
            <Input
              size={undefined}
              className="h-8 text-xs w-72 font-mono"
              placeholder="e.g. claude-sonnet-4-5-20250929"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 2: Agent Settings */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Agent Settings
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Default agent ID</Label>
            <Input
              size={undefined}
              className="h-8 text-xs w-48 font-mono"
              placeholder="main"
              value={defaultAgentId}
              onChange={(e) => setDefaultAgentId(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="heartbeat-enabled"
              checked={heartbeatEnabled}
              onCheckedChange={setHeartbeatEnabled}
            />
            <Label htmlFor="heartbeat-enabled" className="text-xs cursor-pointer">
              Enable heartbeat
            </Label>
          </div>

          {heartbeatEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Heartbeat interval</Label>
              <Input
                size={undefined}
                className="h-8 text-xs w-32 font-mono"
                placeholder="30m"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Section 3: Channel */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Channel
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Channel type</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v ?? 'none')}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Select channel…" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel === 'discord' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Discord token</Label>
                {existingDiscordToken && (
                  <Badge variant="outline" className="text-[0.625rem] py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
                    Token set ✓
                  </Badge>
                )}
              </div>
              <Input
                size={undefined}
                type="password"
                className="h-8 text-xs w-72"
                placeholder="Enter new token…"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
              />
              {existingDiscordToken && (
                <p className="text-[0.625rem] text-muted-foreground">
                  Leave empty to keep existing token
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" disabled={patchMutation.isPending} onClick={handleSave}>
          {patchMutation.isPending && <Spinner className="size-3" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

function ConfigTab({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()
  // null = user hasn't edited yet; string = user's current edits
  const [draft, setDraft] = useState<string | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'wizard' | 'raw'>('wizard')

  const { data, isLoading, error } = useQuery(
    orpc.gateway.configGet.queryOptions({ input: { gatewayId } }),
  )

  const original = useMemo(() => (data !== undefined ? data.raw : ''), [data])

  const text = draft ?? original
  const isDirty = draft !== null && draft !== original
  const hasRedacted = text.includes('__OPENCLAW_REDACTED__')

  const patchMutation = useMutation({
    ...orpc.gateway.configPatch.mutationOptions(),
    onSuccess: () => {
      toast.success('Config saved')
      setDraft(null)
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to save config', { description: String(err) })
    },
  })

  const applyMutation = useMutation({
    ...orpc.gateway.configApply.mutationOptions(),
    onSuccess: () => {
      toast.success('Config applied')
      setDraft(null)
      setApplyOpen(false)
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to apply config', { description: String(err) })
      setApplyOpen(false)
    },
  })

  const handlePatch = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      toast.error('Invalid JSON')
      return
    }
    const { cleaned, redactedCount } = stripRedacted(parsed)
    if (redactedCount > 0) {
      toast.info(`Stripped ${redactedCount} redacted field(s) — existing values kept on gateway`)
    }
    patchMutation.mutate({ gatewayId, raw: JSON.stringify(cleaned, null, 2), baseHash: data?.hash })
  }

  const handleApply = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      toast.error('Invalid JSON')
      setApplyOpen(false)
      return
    }
    const { cleaned, redactedCount } = stripRedacted(parsed)
    if (redactedCount > 0) {
      toast.info(
        `Stripped ${redactedCount} redacted field(s) from apply — those keys will be omitted`,
      )
    }
    applyMutation.mutate({ gatewayId, raw: JSON.stringify(cleaned, null, 2), baseHash: data?.hash })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="rounded-lg" style={{ minHeight: '400px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Config not available.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Wizard / Raw JSON toggle */}
      <div className="flex items-center gap-1 self-start rounded-md border p-0.5">
        <button
          type="button"
          onClick={() => setViewMode('wizard')}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            viewMode === 'wizard'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Wizard
        </button>
        <button
          type="button"
          onClick={() => setViewMode('raw')}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            viewMode === 'raw'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Raw JSON
        </button>
      </div>

      {viewMode === 'wizard' ? (
        <ProviderWizard gatewayId={gatewayId} data={data} />
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || patchMutation.isPending}
              onClick={handlePatch}
              title="Safe: only sends your changes, secrets are untouched"
            >
              {patchMutation.isPending && <Spinner className="size-3" />}
              Save changes
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!isDirty || applyMutation.isPending || hasRedacted}
              onClick={() => setApplyOpen(true)}
              title={
                hasRedacted
                  ? 'Remove all __OPENCLAW_REDACTED__ placeholders before applying — apply replaces the entire config including secrets'
                  : 'Replace entire config and restart gateway'
              }
            >
              Replace entire config
            </Button>
            {hasRedacted && isDirty && (
              <p className="text-[0.625rem] text-destructive">
                Replace all <code>__OPENCLAW_REDACTED__</code> values with real values before using
                &ldquo;Replace entire config&rdquo;
              </p>
            )}
          </div>
          <p className="text-[0.625rem] text-muted-foreground -mt-1">
            <strong>Save changes</strong> = safe incremental patch (recommended) ·{' '}
            <strong>Replace entire config</strong> = full overwrite + gateway restart
          </p>

          <div className="overflow-hidden rounded-lg border">
            <MonacoEditor
              language="json"
              theme="vs-dark"
              height="60vh"
              value={text}
              onChange={(val) => setDraft(val ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          <AlertDialog open={applyOpen} onOpenChange={(open) => !open && setApplyOpen(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace entire config?</AlertDialogTitle>
                <AlertDialogDescription>
                  This sends your full config to the gateway, replacing everything — including
                  secrets. The gateway will restart. This cannot be undone. Use{' '}
                  <strong>Save changes</strong> instead if you only want to update specific fields.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleApply}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending && <Spinner className="size-3" />}
                  Apply
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

function activityStatus(lastInputSeconds?: number): { label: string; color: string } {
  if (lastInputSeconds === undefined || lastInputSeconds === null) {
    return { label: 'Unknown', color: 'bg-muted-foreground/50' }
  }
  if (lastInputSeconds < 60) {
    return { label: 'Active now', color: 'bg-emerald-500' }
  }
  if (lastInputSeconds < 300) {
    const mins = Math.floor(lastInputSeconds / 60)
    return { label: `Active ${mins}m ago`, color: 'bg-emerald-500' }
  }
  if (lastInputSeconds < 1800) {
    const mins = Math.floor(lastInputSeconds / 60)
    return { label: `Idle ${mins}m ago`, color: 'bg-amber-500' }
  }
  return { label: 'Away', color: 'bg-muted-foreground/50' }
}

function DevicesTab({ gatewayId }: { gatewayId: string }) {
  const { data: initialPresence, isLoading } = useQuery(
    orpc.gateway.presence.queryOptions({ input: { gatewayId } }),
  )

  const { data: streamedPresenceChunks } = useQuery(
    orpc.gateway.presenceStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'replace' },
    }),
  )

  const presence =
    streamedPresenceChunks && streamedPresenceChunks.length > 0
      ? streamedPresenceChunks[streamedPresenceChunks.length - 1]!.devices
      : initialPresence

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!presence?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No devices connected.</div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
      {presence.map((entry, i) => {
        const activity = activityStatus(entry.lastInputSeconds)
        const connectedSince = entry.ts ? formatDistanceToNow(entry.ts, { addSuffix: true }) : null
        return (
          <Card key={`${entry.host}-${entry.ip}-${i}`} className="bg-muted/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold truncate">{entry.host ?? 'Unknown'}</span>
                <div className="flex gap-1 shrink-0">
                  {entry.platform && (
                    <Badge variant="outline" className="text-[0.625rem]">
                      {entry.platform}
                    </Badge>
                  )}
                  {entry.mode && (
                    <Badge variant="outline" className="text-[0.625rem]">
                      {entry.mode}
                    </Badge>
                  )}
                </div>
              </div>
              {(entry.deviceFamily || entry.modelIdentifier) && (
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  {[entry.deviceFamily, entry.modelIdentifier].filter(Boolean).join(' · ')}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {entry.ip && (
                <span className="font-mono text-[0.625rem] text-muted-foreground">{entry.ip}</span>
              )}
              {entry.version && (
                <span className="text-[0.625rem] text-muted-foreground">v{entry.version}</span>
              )}

              <div className="flex items-center gap-1.5">
                <span className={cn('size-1.5 rounded-full shrink-0', activity.color)} />
                <span className="text-[0.625rem] text-muted-foreground">{activity.label}</span>
              </div>

              {entry.text && (
                <p className="text-[0.625rem] text-muted-foreground italic truncate">
                  {entry.text}
                </p>
              )}

              {entry.roles && entry.roles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-[0.625rem]">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.5625rem] rounded px-1 py-0.5 bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {connectedSince && (
                <p className="text-[0.5625rem] text-muted-foreground/70 mt-1">
                  Connected {connectedSince}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
