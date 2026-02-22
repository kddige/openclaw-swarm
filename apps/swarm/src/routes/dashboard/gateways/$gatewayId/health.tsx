import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircleIcon, XCircleIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/health')({
  component: HealthPage,
  errorComponent: RouteErrorFallback,
})

function HealthPage() {
  const { gatewayId } = Route.useParams()
  const { data: gateway, isLoading } = useQuery(
    orpc.gateway.get.queryOptions({ input: { id: gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  const h = gateway?.health

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
