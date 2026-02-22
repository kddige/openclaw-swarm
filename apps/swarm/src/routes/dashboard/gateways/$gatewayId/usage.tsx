import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/usage')({
  component: UsagePage,
  errorComponent: RouteErrorFallback,
})

function UsagePage() {
  const { gatewayId } = Route.useParams()
  const { data: costData, isLoading } = useQuery(
    orpc.gateway.cost.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    )
  }

  const daily = costData?.daily ?? []

  if (daily.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No usage data available.</div>
    )
  }

  const totalCost = daily.reduce((sum, d) => sum + d.totalCost, 0)
  const totalTokens = daily.reduce((sum, d) => sum + d.totalTokens, 0)

  const chartData = daily.map((d) => ({
    date: d.date.slice(-5),
    totalCost: d.totalCost,
  }))

  return (
    <div className="flex flex-col gap-4 pt-2">
      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <h3 className="text-xs font-medium mb-3">Daily Cost (last {daily.length} days)</h3>
          <ChartContainer
            config={{ totalCost: { label: 'Cost', color: 'var(--chart-1)' } }}
            className="aspect-auto h-[200px] w-full"
          >
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Total Cost (period)
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">${totalCost.toFixed(4)}</span>
          </CardContent>
        </Card>
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Total Tokens (period)
            </span>
          </CardHeader>
          <CardContent>
            <span className="text-sm font-semibold tabular-nums">
              {totalTokens.toLocaleString()}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
