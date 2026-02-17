import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MonitorIcon,
  ClockIcon,
  ServerIcon,
  ShieldIcon,
  CpuIcon,
  ActivityIcon,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/')({
  component: GatewayDetailPage,
})

function statusBadge(status: string) {
  switch (status) {
    case 'connected':
      return { text: 'Connected', dot: 'bg-emerald-500' }
    case 'connecting':
      return { text: 'Connecting', dot: 'bg-amber-500 animate-pulse' }
    case 'pairing':
      return { text: 'Pairing', dot: 'bg-blue-500 animate-pulse' }
    case 'auth-failed':
      return { text: 'Auth Failed', dot: 'bg-destructive' }
    default:
      return { text: 'Offline', dot: 'bg-muted-foreground/50' }
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <StatusTab gateway={gateway} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab gatewayId={gatewayId} />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab gateway={gateway} />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsTab gatewayId={gatewayId} />
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
    gatewayStatus: {
      version: string
      uptime: number
      boundAddress: string
      authMode: string
      modelProvider: string
      activeSessions: number
      totalSessions: number
      defaultAgent: string | null
      defaultModel: string | null
    } | null
  }
}) {
  const s = gateway.gatewayStatus

  if (!s) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No status data available. Gateway may not be connected.
      </div>
    )
  }

  const items = [
    { label: 'Version', value: s.version, icon: ServerIcon },
    { label: 'Uptime', value: formatUptime(s.uptime), icon: ClockIcon },
    { label: 'Bound Address', value: s.boundAddress, icon: ActivityIcon },
    { label: 'Auth Mode', value: s.authMode, icon: ShieldIcon },
    { label: 'Model Provider', value: s.modelProvider, icon: CpuIcon },
    {
      label: 'Default Agent',
      value: s.defaultAgent ?? 'None',
      icon: UserIcon,
    },
    {
      label: 'Default Model',
      value: s.defaultModel ?? 'None',
      icon: CpuIcon,
    },
    {
      label: 'Sessions',
      value: `${s.activeSessions} active / ${s.totalSessions} total`,
      icon: MonitorIcon,
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
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
            <span className="text-xs font-medium">{item.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SessionsTab({ gatewayId }: { gatewayId: string }) {
  const { data: sessions, isLoading } = useQuery(
    orpc.gateway.sessions.queryOptions({ input: { gatewayId } }),
  )

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
            <TableHead>Label</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
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
                  {session.key.slice(0, 12)}...
                </Link>
              </TableCell>
              <TableCell className="truncate max-w-32">
                {session.label ?? '--'}
              </TableCell>
              <TableCell>{session.agent}</TableCell>
              <TableCell>{session.channel ?? '--'}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(session.lastActiveAt, {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {(session.tokensIn + session.tokensOut).toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${session.cost.toFixed(4)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function HealthTab({
  gateway,
}: {
  gateway: {
    health: {
      ok: boolean
      channels: { name: string; type: string; connected: boolean; error: string | null }[]
      modelAuth: { ok: boolean; provider: string; error: string | null }
      agents: { name: string; ok: boolean }[]
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

      <div>
        <h3 className="text-xs font-medium mb-2">Channels</h3>
        <div className="space-y-1.5">
          {h.channels.map((ch) => (
            <div
              key={ch.name}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{ch.name}</span>
                <span className="text-[0.625rem] text-muted-foreground">
                  {ch.type}
                </span>
              </div>
              {ch.connected ? (
                <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircleIcon className="size-2.5" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircleIcon className="size-2.5" />
                  {ch.error ?? 'Disconnected'}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium mb-2">Model Auth</h3>
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <span className="text-xs">{h.modelAuth.provider}</span>
          {h.modelAuth.ok ? (
            <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="size-2.5" />
              OK
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircleIcon className="size-2.5" />
              {h.modelAuth.error ?? 'Failed'}
            </Badge>
          )}
        </div>
      </div>

      {h.agents.length > 0 && (
        <div>
          <h3 className="text-xs font-medium mb-2">Agent Health</h3>
          <div className="space-y-1.5">
            {h.agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
              >
                <span className="text-xs font-medium">{agent.name}</span>
                {agent.ok ? (
                  <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="size-2.5" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircleIcon className="size-2.5" />
                    Error
                  </Badge>
                )}
              </div>
            ))}
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
                <CardTitle>{agent.name}</CardTitle>
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
            <TableHead>Device ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Connected</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presence.map((entry) => (
            <TableRow key={`${entry.deviceId}-${entry.clientId}`}>
              <TableCell className="font-mono text-[0.625rem]">
                {entry.deviceId.slice(0, 16)}...
              </TableCell>
              <TableCell>{entry.clientId}</TableCell>
              <TableCell>
                <Badge variant="outline">{entry.role}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(entry.connectedAt, 'MMM d, HH:mm')}
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
