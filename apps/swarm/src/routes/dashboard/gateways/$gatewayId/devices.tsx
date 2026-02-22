import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/devices')({
  component: DevicesPage,
  errorComponent: RouteErrorFallback,
})

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

function DevicesPage() {
  const { gatewayId } = Route.useParams()
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
