import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserIcon, MonitorIcon, ClockIcon, ServerIcon, ActivityIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/')({
  component: StatusPage,
  errorComponent: RouteErrorFallback,
})

function StatusPage() {
  const { gatewayId } = Route.useParams()
  const { data: gateway, isLoading } = useQuery(
    orpc.gateway.get.queryOptions({ input: { id: gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const info = gateway?.serverInfo
  const s = gateway?.gatewayStatus

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
  if (gateway) {
    items.push({ label: 'URL', value: gateway.url, icon: MonitorIcon })
  }
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
  if (gateway?.lastConnectedAt) {
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
