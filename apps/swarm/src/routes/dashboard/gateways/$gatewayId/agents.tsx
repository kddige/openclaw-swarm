import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/agents')({
  component: AgentsPage,
  errorComponent: RouteErrorFallback,
})

function AgentsPage() {
  const { gatewayId } = Route.useParams()
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
