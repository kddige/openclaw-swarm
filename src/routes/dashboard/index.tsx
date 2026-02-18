import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  ServerIcon,
  WifiIcon,
  WifiOffIcon,
  ActivityIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard/')({
  component: FleetDashboard,
})

function statusLabel(status: string) {
  switch (status) {
    case 'connected':
      return { text: 'Connected', className: 'text-emerald-600 dark:text-emerald-400' }
    case 'connecting':
      return { text: 'Connecting', className: 'text-amber-600 dark:text-amber-400' }
    case 'pairing':
      return { text: 'Pairing Required', className: 'text-amber-600 dark:text-amber-400' }
    case 'auth-failed':
      return { text: 'Auth Failed', className: 'text-destructive' }
    case 'disconnected':
    default:
      return { text: 'Offline', className: 'text-muted-foreground' }
  }
}

function FleetDashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery(
    orpc.fleet.overview.queryOptions(),
  )
  const { data: gateways, isLoading: gatewaysLoading } = useQuery(
    orpc.gateway.list.queryOptions(),
  )
  const { data: fleetCost, isLoading: costLoading } = useQuery(
    orpc.fleet.cost.queryOptions(),
  )

  if (gatewaysLoading || overviewLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-3 w-20 mt-2" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!gateways?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerIcon />
            </EmptyMedia>
            <EmptyTitle>No gateways configured</EmptyTitle>
            <EmptyDescription>
              Add a gateway to start monitoring your fleet.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" render={<Link to="/dashboard/gateways" />}>
            Add Gateway
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-sm font-semibold">Fleet Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gateways Online"
          value={`${overview?.connectedGateways ?? 0} / ${overview?.totalGateways ?? 0}`}
          icon={<WifiIcon className="size-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Gateways Offline"
          value={String(overview?.disconnectedGateways ?? 0)}
          icon={<WifiOffIcon className="size-3.5 text-muted-foreground" />}
          alert={(overview?.disconnectedGateways ?? 0) > 0}
        />
        <StatCard
          label="Active Sessions"
          value={String(overview?.totalActiveSessions ?? 0)}
          icon={<ActivityIcon className="size-3.5 text-blue-500" />}
        />
        <StatCard
          label="Total Cost (24h)"
          value={
            costLoading
              ? '--'
              : `$${(fleetCost?.totalCost ?? 0).toFixed(2)}`
          }
          icon={<DollarSignIcon className="size-3.5 text-muted-foreground" />}
        />
      </div>

      <h2 className="text-xs font-medium text-muted-foreground mt-2">
        Gateways
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gateways.map((gw) => {
          const status = statusLabel(gw.status)
          return (
            <Link
              key={gw.id}
              to="/dashboard/gateways/$gatewayId"
              params={{ gatewayId: gw.id }}
            >
              <Card className="bg-muted/40 cursor-pointer transition-colors hover:bg-muted/60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="truncate">{gw.label}</CardTitle>
                    <Badge variant="outline" className="shrink-0 gap-1.5">
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          gw.status === 'connected'
                            ? 'bg-emerald-500'
                            : gw.status === 'connecting'
                              ? 'bg-amber-500 animate-pulse'
                              : gw.status === 'pairing'
                                ? 'bg-amber-400 animate-pulse'
                                : gw.status === 'auth-failed'
                                  ? 'bg-destructive'
                                  : 'bg-muted-foreground/50',
                        )}
                      />
                      {status.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {gw.serverInfo && (
                      <span>{gw.serverInfo.host} · v{gw.serverInfo.version}</span>
                    )}
                    <span className="truncate">{gw.url}</span>
                    {gw.status === 'pairing' && (
                      <Badge
                        variant="outline"
                        className="w-fit mt-1 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      >
                        <LinkIcon data-icon="inline-start" />
                        Pairing required
                      </Badge>
                    )}
                    {gw.health && !gw.health.ok && (
                      <Badge
                        variant="destructive"
                        className="w-fit mt-1 gap-1"
                      >
                        <AlertTriangleIcon data-icon="inline-start" />
                        Health issues
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  alert,
}: {
  label: string
  value: string
  icon: React.ReactNode
  alert?: boolean
}) {
  return (
    <Card
      size="sm"
      className={cn(
        'bg-muted/40',
        alert && 'ring-destructive/30',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}
