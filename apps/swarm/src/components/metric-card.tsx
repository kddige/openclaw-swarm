import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function MetricCard({
  label,
  value,
  icon,
  alert,
  className,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  alert?: boolean
  className?: string
}) {
  return (
    <Card size="sm" className={cn('bg-muted/40', alert && 'ring-destructive/30', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}
