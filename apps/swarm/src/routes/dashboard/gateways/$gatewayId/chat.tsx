import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { ChatPanel } from '@/components/chat-panel'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { z } from 'zod/v4'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeftIcon, MessageSquareIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/chat')({
  component: MaintenanceChatPage,
  errorComponent: RouteErrorFallback,
  validateSearch: z.object({
    sessionKey: z.string().default('swarm-maintenance'),
  }),
})

function MaintenanceChatPage() {
  const { gatewayId } = Route.useParams()
  const { sessionKey } = Route.useSearch()

  const { data: gateway } = useQuery(orpc.gateway.get.queryOptions({ input: { id: gatewayId } }))

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          render={<Link to="/dashboard/gateways/$gatewayId" params={{ gatewayId }} />}
        >
          <ArrowLeftIcon />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <MessageSquareIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Maintenance Chat</span>
        {gateway && (
          <>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {gateway.label}
            </span>
          </>
        )}
        <Badge variant="outline" className="font-mono text-[0.625rem] shrink-0">
          {sessionKey}
        </Badge>
      </div>

      <ChatPanel
        gatewayId={gatewayId}
        sessionKey={sessionKey}
        className="flex-1 min-h-0 px-6 py-4"
      />
    </div>
  )
}
