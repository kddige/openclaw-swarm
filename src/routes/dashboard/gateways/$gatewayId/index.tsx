import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/')({
  component: GatewayDetailPage,
  errorComponent: RouteErrorFallback,
})

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

function PairingBanner({
  gatewayId,
  requestId,
}: {
  gatewayId: string
  requestId: string | null
}) {
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

  const command = requestId
    ? `openclaw devices approve ${requestId}`
    : null

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
        This gateway requires you to approve this device before connecting.
        Run this command on the machine running the gateway:
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
          <code className="font-mono text-[0.6875rem] text-foreground">
            openclaw devices list
          </code>
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
        <Button
          variant="ghost"
          size="icon-xs"
          render={<Link to="/dashboard" />}
        >
          <ArrowLeftIcon />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold truncate">{gateway.label}</h1>
        <Badge variant="outline" className="gap-1.5 shrink-0">
          <span className={cn('size-1.5 rounded-full', status.dot)} />
          {status.text}
        </Badge>
      </div>

      {gateway.status === 'pairing' && (
        <PairingBanner
          gatewayId={gatewayId}
          requestId={gateway.pairingRequestId}
        />
      )}

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <StatusTab gateway={gateway} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab gatewayId={gatewayId} />
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
        <TabsContent value="devices">
          <DevicesTab gatewayId={gatewayId} />
        </TabsContent>
      </Tabs>
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

  const { data: sessions, isLoading } = useQuery(
    orpc.gateway.sessions.queryOptions({ input: { gatewayId } }),
  )

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
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No sessions found.
      </div>
    )
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
                  {session.key.length > 24
                    ? `${session.key.slice(0, 12)}...`
                    : session.key}
                </Link>
              </TableCell>
              <TableCell className="truncate max-w-32">
                {session.displayName ?? '--'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {session.kind ?? '--'}
              </TableCell>
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
              <TableCell className="text-right tabular-nums">
                ${session.cost.toFixed(4)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs" />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setActionDialog({ type: 'reset', sessionKey: session.key })
                      }
                    >
                      <RotateCcwIcon />
                      Reset Session
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActionDialog({ type: 'compact', sessionKey: session.key })
                      }
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
              This will reset the session state. The transcript may be preserved depending on gateway settings.
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
                    <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
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
      <div className="py-8 text-center text-xs text-muted-foreground">
        No agents configured.
      </div>
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
                  <span className="text-[0.625rem] text-muted-foreground">
                    Default agent
                  </span>
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
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Not configured.
      </div>
    )
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
  const agents = file.agents ? Object.entries(file.agents) : []

  return (
    <div className="flex flex-col gap-4 pt-2">
      {defaults && (
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
              {defaults.ask && (
                <Badge variant="outline">ask: {defaults.ask}</Badge>
              )}
              {defaults.askFallback && (
                <Badge variant="outline">fallback: {defaults.askFallback}</Badge>
              )}
              {defaults.autoAllowSkills !== undefined && (
                <Badge variant="outline">
                  autoAllowSkills: {String(defaults.autoAllowSkills)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length === 0 && !defaults && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No exec approval configuration found.
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
                      <TableCell className="font-mono text-[0.625rem]">
                        {entry.pattern}
                      </TableCell>
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
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const queryInput = {
    gatewayId,
    limit: 200,
    ...(levelFilter !== 'all' ? { level: levelFilter } : {}),
    ...(sourceFilter.trim() ? { source: sourceFilter.trim() } : {}),
  }

  // Reset lines when filters change
  const prevFilterRef = useRef({ levelFilter, sourceFilter })
  useEffect(() => {
    const prev = prevFilterRef.current
    if (prev.levelFilter !== levelFilter || prev.sourceFilter !== sourceFilter) {
      setLines([])
      setCursor(undefined)
      prevFilterRef.current = { levelFilter, sourceFilter }
    }
  }, [levelFilter, sourceFilter])

  // Initial fetch + polling
  const { data: logsData } = useQuery({
    ...orpc.gateway.logsTail.queryOptions({
      input: {
        ...queryInput,
        cursor: cursor,
      },
    }),
    refetchInterval: 3000,
  })

  // Append new lines when data arrives
  const prevDataRef = useRef<typeof logsData>(undefined)
  useEffect(() => {
    if (!logsData || logsData === prevDataRef.current) return
    prevDataRef.current = logsData
    const newLines: LogLine[] = logsData.lines ?? []
    const newCursor: string | undefined = logsData.cursor
    if (newLines.length > 0) {
      setLines((prev) => {
        const combined = [...prev, ...newLines]
        return combined.length > MAX_LINES
          ? combined.slice(combined.length - MAX_LINES)
          : combined
      })
      if (newCursor) setCursor(newCursor)
    }
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
    <div className="flex flex-col gap-3 pt-2" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="h-7 text-xs"
        >
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
                  <div key={i} className="flex items-baseline gap-2 font-mono text-[0.75rem] leading-relaxed">
                    <span className="text-zinc-500 shrink-0 tabular-nums">
                      {formatLogTime(line.ts)}
                    </span>
                    <span className={cn('w-10 shrink-0 uppercase text-[0.6rem] font-semibold tabular-nums', levelColor)}>
                      {line.level}
                    </span>
                    {line.source && (
                      <span className="shrink-0 rounded px-1 bg-zinc-800 text-zinc-400 text-[0.625rem] font-medium">
                        {line.source}
                      </span>
                    )}
                    <span className={cn('break-all', levelColor)}>
                      {line.msg}
                    </span>
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

function DevicesTab({ gatewayId }: { gatewayId: string }) {
  const { data: presence, isLoading } = useQuery(
    orpc.gateway.presence.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="pt-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    )
  }

  if (!presence?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No devices connected.
      </div>
    )
  }

  return (
    <div className="pt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Host</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presence.map((entry, i) => (
            <TableRow key={`${entry.host}-${entry.ip}-${i}`}>
              <TableCell className="font-medium text-xs">
                {entry.host}
              </TableCell>
              <TableCell className="font-mono text-[0.625rem]">
                {entry.ip}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{entry.mode}</Badge>
              </TableCell>
              <TableCell>{entry.platform}</TableCell>
              <TableCell className="text-muted-foreground">
                {entry.version}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
