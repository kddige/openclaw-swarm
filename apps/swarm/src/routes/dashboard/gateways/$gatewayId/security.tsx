import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShieldIcon, UserIcon, AlertTriangleIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/security')({
  component: SecurityPage,
  errorComponent: RouteErrorFallback,
})

function securityModeBadgeClass(mode: string | undefined) {
  switch (mode) {
    case 'full':
      return 'text-destructive border-destructive/40'
    case 'allowlist':
      return 'text-amber-600 dark:text-amber-400 border-amber-500/40'
    case 'deny':
      return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
    default:
      return ''
  }
}

function SecurityPage() {
  const { gatewayId } = Route.useParams()
  const { data, isLoading, error } = useQuery(
    orpc.gateway.execApprovals.queryOptions({ input: { gatewayId } }),
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Exec approvals not available.
      </div>
    )
  }

  if (!data) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Not configured.</div>
  }

  if (!data.exists) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No exec approvals file found on this gateway.
      </div>
    )
  }

  const { file } = data
  const defaults = file.defaults
  const hasDefaults = defaults && Object.keys(defaults).length > 0
  const agents = file.agents ? Object.entries(file.agents) : []

  return (
    <div className="flex flex-col gap-4 pt-2">
      {hasDefaults && (
        <Card size="sm" className="bg-muted/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-3 text-muted-foreground" />
              <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                Defaults
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {defaults.security && (
                <Badge
                  variant="outline"
                  className={cn('gap-1', securityModeBadgeClass(defaults.security))}
                >
                  security: {defaults.security}
                </Badge>
              )}
              {defaults.ask && <Badge variant="outline">ask: {defaults.ask}</Badge>}
              {defaults.askFallback && (
                <Badge variant="outline">fallback: {defaults.askFallback}</Badge>
              )}
              {defaults.autoAllowSkills !== undefined && (
                <Badge variant="outline">autoAllowSkills: {String(defaults.autoAllowSkills)}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length === 0 && !hasDefaults && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No exec approval configuration found. Exec security is using gateway defaults.
        </div>
      )}

      {agents.map(([agentId, config]) => (
        <div key={agentId} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <UserIcon className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium">{agentId}</span>
            <div className="flex flex-wrap gap-1.5">
              {config.security && (
                <Badge
                  variant="outline"
                  className={cn('gap-1', securityModeBadgeClass(config.security))}
                >
                  {config.security}
                </Badge>
              )}
              {config.ask && (
                <Badge variant="outline" className="text-[0.625rem]">
                  ask: {config.ask}
                </Badge>
              )}
              {config.autoAllowSkills !== undefined && (
                <Badge variant="outline" className="text-[0.625rem]">
                  autoAllowSkills: {String(config.autoAllowSkills)}
                </Badge>
              )}
            </div>
          </div>

          {config.security === 'full' && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertTriangleIcon className="size-3 text-destructive shrink-0" />
              <span className="text-[0.625rem] text-destructive font-medium">
                Full access — all commands allowed
              </span>
            </div>
          )}

          {config.allowlist && config.allowlist.length > 0 ? (
            <div className="rounded-md border bg-muted/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Last Command</TableHead>
                    <TableHead>Resolved Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.allowlist.map((entry, i) => (
                    <TableRow key={entry.id ?? i}>
                      <TableCell className="font-mono text-[0.625rem]">{entry.pattern}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {entry.lastUsedAt
                          ? formatDistanceToNow(entry.lastUsedAt, { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="font-mono text-[0.625rem] max-w-48 truncate">
                        {entry.lastUsedCommand ?? '--'}
                      </TableCell>
                      <TableCell className="font-mono text-[0.625rem] text-muted-foreground max-w-40 truncate">
                        {entry.lastResolvedPath ?? '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : config.security !== 'full' ? (
            <div className="py-4 text-center text-xs text-muted-foreground rounded-md border bg-muted/20">
              No allowed commands.
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
