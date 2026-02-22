import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { HardDriveIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/nodes')({
  component: NodesPage,
  errorComponent: RouteErrorFallback,
})

function NodesPage() {
  const { gatewayId } = Route.useParams()
  const { data: nodes, isLoading, error } = useQuery(
    orpc.gateway.nodes.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Nodes not available.</div>
    )
  }

  if (!nodes?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No nodes registered.</div>
    )
  }

  const onlineCount = nodes.filter((n) => n.connected).length

  return (
    <div className="@container flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[0.625rem]">
          {onlineCount} online
        </Badge>
        <Badge variant="outline" className="text-[0.625rem] text-muted-foreground">
          {nodes.length} total
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3">
        {nodes.map((node) => (
          <Card key={node.nodeId} className="bg-muted/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                    <HardDriveIcon className="size-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="truncate">
                      {node.displayName ?? node.nodeId}
                    </CardTitle>
                    {node.displayName && (
                      <span className="font-mono text-[0.625rem] text-muted-foreground truncate">
                        {node.nodeId}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      node.connected ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                    )}
                  />
                  <span className="text-[0.625rem] text-muted-foreground">
                    {node.connected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                {node.platform && (
                  <Badge variant="outline" className="text-[0.625rem]">
                    {node.platform}
                  </Badge>
                )}
                {node.version && (
                  <Badge variant="outline" className="text-[0.625rem]">
                    v{node.version}
                  </Badge>
                )}
                {node.paired && (
                  <Badge
                    variant="outline"
                    className="text-[0.625rem] text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                  >
                    paired
                  </Badge>
                )}
              </div>

              {node.caps && node.caps.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {node.caps.map((cap) => (
                    <span
                      key={cap}
                      className="text-[0.5625rem] rounded px-1 py-0.5 bg-muted text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}

              {node.commands && node.commands.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {node.commands.map((cmd) => (
                    <span
                      key={cmd}
                      className="font-mono text-[0.5625rem] rounded px-1 py-0.5 bg-muted text-muted-foreground"
                    >
                      {cmd}
                    </span>
                  ))}
                </div>
              )}

              {node.lastSeenAt && (
                <p className="text-[0.5625rem] text-muted-foreground/70 mt-1">
                  Last seen {formatDistanceToNow(node.lastSeenAt, { addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
