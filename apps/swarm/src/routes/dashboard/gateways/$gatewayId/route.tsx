import { createFileRoute, createLink, Link, Outlet } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { CopyableCommand } from '@/components/copyable-command'
import { getGatewayStatus } from '@/lib/gateway-status'
import { ArrowLeftIcon, LinkIcon, RefreshCwIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId')({
  component: GatewayLayout,
  errorComponent: RouteErrorFallback,
})

function PairingBanner({ gatewayId, requestId }: { gatewayId: string; requestId: string | null }) {
  const queryClient = useQueryClient()

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

  const command = requestId ? `openclaw devices approve ${requestId}` : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Device Pairing Required
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This gateway requires you to approve this device before connecting. Run this command on the
        machine running the gateway:
      </p>
      {command ? (
        <CopyableCommand command={command} />
      ) : (
        <div className="flex flex-col gap-1.5 rounded-md border bg-muted/60 px-3 py-2">
          <code className="font-mono text-[0.6875rem] text-foreground">openclaw devices list</code>
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

const TabsLink = createLink(TabsTrigger)

function GatewayLayout() {
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

  const status = getGatewayStatus(gateway.status)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" render={<Link to="/dashboard" />}>
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
        <PairingBanner gatewayId={gatewayId} requestId={gateway.pairingRequestId} />
      )}

      <Tabs defaultValue="active" value="active">
        <TabsList>
          <TabsLink
            value="$root"
            to="/dashboard/gateways/$gatewayId"
            params={{ gatewayId }}
            activeOptions={{ exact: true }}
            activeProps={{ value: 'active' }}
          >
            Status
          </TabsLink>
          <TabsLink
            value="sessions"
            to="/dashboard/gateways/$gatewayId/sessions"
            params={{ gatewayId }}
            activeOptions={{ exact: false }}
            activeProps={{ value: 'active' }}
          >
            Sessions
          </TabsLink>
          <TabsLink
            value="chat"
            to="/dashboard/gateways/$gatewayId/chat"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Chat
          </TabsLink>
          <TabsLink
            value="logs"
            to="/dashboard/gateways/$gatewayId/logs"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Logs
          </TabsLink>
          <TabsLink
            value="usage"
            to="/dashboard/gateways/$gatewayId/usage"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Usage
          </TabsLink>
          <TabsLink
            value="agents"
            to="/dashboard/gateways/$gatewayId/agents"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Agents
          </TabsLink>
          <TabsLink
            value="security"
            to="/dashboard/gateways/$gatewayId/security"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Security
          </TabsLink>
          <TabsLink
            value="models"
            to="/dashboard/gateways/$gatewayId/models"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Models
          </TabsLink>
          <TabsLink
            value="cron"
            to="/dashboard/gateways/$gatewayId/cron"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Cron
          </TabsLink>
          <TabsLink
            value="nodes"
            to="/dashboard/gateways/$gatewayId/nodes"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Nodes
          </TabsLink>
          <TabsLink
            value="skills"
            to="/dashboard/gateways/$gatewayId/skills"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Skills
          </TabsLink>
          <TabsLink
            value="channels"
            to="/dashboard/gateways/$gatewayId/channels"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Channels
          </TabsLink>
          <TabsLink
            value="config"
            to="/dashboard/gateways/$gatewayId/config"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Config
          </TabsLink>
          <TabsLink
            value="devices"
            to="/dashboard/gateways/$gatewayId/devices"
            params={{ gatewayId }}
            activeProps={{ value: 'active' }}
          >
            Devices
          </TabsLink>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
