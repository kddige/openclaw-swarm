import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PendingExecApprovals } from '@/components/gateway/pending-exec-approvals'
import { DevicePairingRequests } from '@/components/gateway/device-pairing-requests'
import { GatewayVitals } from '@/components/gateway/gateway-vitals'
import { ChannelHealthCompact } from '@/components/gateway/channel-health-compact'
import { UsagePanel } from '@/components/gateway/usage-panel'
import { LogsPanel } from '@/components/gateway/logs-panel'
import { BarChart3Icon, ScrollTextIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/')({
  component: OverviewPage,
  errorComponent: RouteErrorFallback,
})

function OverviewPage() {
  const { gatewayId } = Route.useParams()
  const [usageSheetOpen, setUsageSheetOpen] = useState(false)
  const [logsSheetOpen, setLogsSheetOpen] = useState(false)

  const { data: gateway } = useQuery(orpc.gateway.get.queryOptions({ input: { id: gatewayId } }))

  const { data: costData } = useQuery(orpc.gateway.cost.queryOptions({ input: { gatewayId } }))

  const { data: sessions } = useQuery(orpc.gateway.sessions.queryOptions({ input: { gatewayId } }))

  const { data: nodes } = useQuery(orpc.gateway.nodes.queryOptions({ input: { gatewayId } }))

  const daily = costData?.daily ?? []
  const todayCost = daily.length > 0 ? daily[daily.length - 1]!.totalCost : 0
  const sessionCount = sessions?.length ?? 0
  const onlineNodes = nodes?.filter((n) => n.connected).length ?? 0

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Actionable items */}
      <PendingExecApprovals gatewayId={gatewayId} />
      <DevicePairingRequests gatewayId={gatewayId} />

      {/* Gateway vitals */}
      <GatewayVitals gatewayId={gatewayId} />

      {/* Channel health */}
      <ChannelHealthCompact health={gateway?.health} />

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Sessions
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">{sessionCount}</span>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className="bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
          onClick={() => setUsageSheetOpen(true)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                Today&apos;s Cost
              </span>
              <BarChart3Icon className="size-3 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">${todayCost.toFixed(4)}</span>
          </CardContent>
        </Card>

        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Online Nodes
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">{onlineNodes}</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setUsageSheetOpen(true)}>
          <BarChart3Icon className="size-3" />
          Usage Details
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLogsSheetOpen(true)}>
          <ScrollTextIcon className="size-3" />
          View Logs
        </Button>
      </div>

      {/* Usage Sheet */}
      <Sheet open={usageSheetOpen} onOpenChange={setUsageSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Usage & Costs</SheetTitle>
          </SheetHeader>
          <div className="p-6 pt-0">
            <UsagePanel gatewayId={gatewayId} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Logs Sheet */}
      <Sheet open={logsSheetOpen} onOpenChange={setLogsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle>Gateway Logs</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            <LogsPanel gatewayId={gatewayId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
