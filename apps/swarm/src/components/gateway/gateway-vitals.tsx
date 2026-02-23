import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  UserIcon,
  MonitorIcon,
  ClockIcon,
  ServerIcon,
  ActivityIcon,
  DownloadIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export function GatewayVitals({ gatewayId }: { gatewayId: string }) {
  const { data: gateway, isLoading } = useQuery(
    orpc.gateway.get.queryOptions({ input: { id: gatewayId } }),
  )

  const updateMutation = useMutation({
    ...orpc.gateway.runUpdate.mutationOptions(),
    onSuccess: () => toast.success('Gateway update started — gateway will restart'),
    onError: (err) => toast.error('Update failed', { description: String(err) }),
  })

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  const info = gateway?.serverInfo
  const s = gateway?.gatewayStatus

  if (!info && !s) return null

  const heartbeat = s?.heartbeat as
    | { defaultAgentId?: string; agents?: { agentId: string; every: string }[] }
    | undefined
  const channelSummary = (s?.channelSummary ?? []) as string[]
  const updateAvailable = s?.updateAvailable as
    | { currentVersion: string; latestVersion: string; channel?: string }
    | undefined

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
    <>
      {updateAvailable && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <DownloadIcon className="size-3.5 text-blue-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Update Available
              </span>
              <span className="text-[0.625rem] text-muted-foreground">
                {updateAvailable.currentVersion} &rarr; {updateAvailable.latestVersion}
                {updateAvailable.channel && (
                  <Badge variant="outline" className="ml-1.5 text-[0.5625rem]">
                    {updateAvailable.channel}
                  </Badge>
                )}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateMutation.mutate({ gatewayId })}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Spinner className="size-3" />}
            <DownloadIcon className="size-3" />
            Update
          </Button>
        </div>
      )}

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
    </>
  )
}
