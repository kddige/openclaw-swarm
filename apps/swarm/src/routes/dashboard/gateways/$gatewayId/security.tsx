import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { RestartBanner } from '@/components/restart-banner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShieldIcon,
  UserIcon,
  AlertTriangleIcon,
  SaveIcon,
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

// ── Pending Approval Queue ──────────────────────────────

interface PendingApproval {
  id: string
  request: {
    command: string
    cwd?: string | null
    agentId?: string | null
    sessionKey?: string | null
    host?: string | null
  }
  createdAtMs: number
  expiresAtMs: number
}

function PendingApprovals({
  gatewayId,
  onAllowlistChanged,
}: {
  gatewayId: string
  onAllowlistChanged: () => void
}) {
  const [pending, setPending] = useState<Map<string, PendingApproval>>(new Map())

  // Subscribe to exec approval events
  const { data: approvalEvents } = useQuery(
    orpc.gateway.execApprovalStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'append' },
      initialData: [],
    }),
  )

  // Track how many events we've processed to avoid reprocessing
  const processedCount = useRef(0)

  // Process streamed events into pending map
  useEffect(() => {
    if (!approvalEvents?.length) return
    const newEvents = approvalEvents.slice(processedCount.current)
    if (newEvents.length === 0) return
    processedCount.current = approvalEvents.length

    setPending((prev) => {
      const next = new Map(prev)
      for (const event of newEvents) {
        if (event.type === 'requested' && event.requested) {
          next.set(event.requested.id, event.requested as PendingApproval)
        }
        if (event.type === 'resolved' && event.resolved) {
          next.delete(event.resolved.id)
        }
      }
      return next
    })
  }, [approvalEvents])

  const allPending = useMemo(() => Array.from(pending.values()), [pending])

  const resolveMutation = useMutation({
    ...orpc.gateway.resolveExecApproval.mutationOptions(),
    onSuccess: (_data, variables) => {
      const label =
        variables.decision === 'allow-once'
          ? 'Allowed once'
          : variables.decision === 'allow-always'
            ? 'Added to allowlist'
            : 'Denied'
      toast.success(label)
      setPending((prev) => {
        const next = new Map(prev)
        next.delete(variables.id)
        return next
      })
      if (variables.decision === 'allow-always') {
        onAllowlistChanged()
      }
    },
    onError: (err) => toast.error('Failed to resolve', { description: String(err) }),
  })

  const handleResolve = useCallback(
    (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => {
      resolveMutation.mutate({ gatewayId, id, decision })
    },
    [gatewayId, resolveMutation],
  )

  if (allPending.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 px-3 py-3 flex items-center gap-2">
        <ShieldCheckIcon className="size-3 text-emerald-500" />
        <span className="text-[0.625rem] text-muted-foreground">
          No pending approval requests. Requests will appear here in real-time when agents need
          command execution approval.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {allPending.map((approval) => (
        <ApprovalCard
          key={approval.id}
          approval={approval}
          onResolve={handleResolve}
          isPending={resolveMutation.isPending}
        />
      ))}
    </div>
  )
}

function ApprovalCard({
  approval,
  onResolve,
  isPending,
}: {
  approval: PendingApproval
  onResolve: (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => void
  isPending: boolean
}) {
  const [mountTime] = useState(() => Date.now())
  const timeLeft = approval.expiresAtMs - mountTime
  const expired = timeLeft <= 0
  const urgentClass =
    timeLeft < 30_000
      ? 'border-destructive/40 bg-destructive/5'
      : 'border-amber-500/30 bg-amber-500/5'

  if (expired) return null

  return (
    <div
      className={cn('rounded-md border px-3 py-2.5 flex flex-col gap-2', urgentClass)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="size-3 text-muted-foreground shrink-0" />
            <code className="font-mono text-[0.6875rem] text-foreground break-all">
              {approval.request.command}
            </code>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.5625rem] text-muted-foreground">
            {approval.request.agentId && (
              <span>
                agent: <span className="text-foreground">{approval.request.agentId}</span>
              </span>
            )}
            {approval.request.sessionKey && (
              <span>
                session:{' '}
                <span className="font-mono text-foreground">{approval.request.sessionKey}</span>
              </span>
            )}
            {approval.request.cwd && (
              <span className="font-mono truncate max-w-48">{approval.request.cwd}</span>
            )}
            {approval.request.host && <span>{approval.request.host}</span>}
            <span className="tabular-nums">
              {formatDistanceToNow(approval.createdAtMs, { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[0.625rem] text-emerald-600 dark:text-emerald-400"
            onClick={() => onResolve(approval.id, 'allow-once')}
            disabled={isPending}
            title="Allow this command once"
          >
            <CheckIcon className="size-2.5" />
            Once
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[0.625rem] text-blue-600 dark:text-blue-400"
            onClick={() => onResolve(approval.id, 'allow-always')}
            disabled={isPending}
            title="Add to allowlist permanently"
          >
            <ShieldCheckIcon className="size-2.5" />
            Always
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[0.625rem] text-destructive"
            onClick={() => onResolve(approval.id, 'deny')}
            disabled={isPending}
            title="Deny execution"
          >
            <XIcon className="size-2.5" />
            Deny
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Security Page ──────────────────────────────────

function SecurityPage() {
  const { gatewayId } = Route.useParams()
  const queryClient = useQueryClient()
  const [editDefaults, setEditDefaults] = useState<{
    security?: string
    ask?: string
  } | null>(null)
  const [showRestart, setShowRestart] = useState(false)

  const approvalsQueryKey = orpc.gateway.execApprovals.queryOptions({ input: { gatewayId } }).queryKey

  const { data, isLoading, error } = useQuery(
    orpc.gateway.execApprovals.queryOptions({ input: { gatewayId } }),
  )

  const saveMutation = useMutation({
    ...orpc.gateway.setExecApprovals.mutationOptions(),
    onSuccess: () => {
      toast.success('Security policy saved')
      setEditDefaults(null)
      setShowRestart(true)
      queryClient.invalidateQueries({ queryKey: approvalsQueryKey })
    },
    onError: (err) => toast.error('Failed to save', { description: String(err) }),
  })

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

  const handleSaveDefaults = () => {
    if (!editDefaults) return
    const updatedFile = {
      ...file,
      defaults: {
        ...file.defaults,
        ...editDefaults,
      },
    }
    saveMutation.mutate({
      gatewayId,
      file: updatedFile as Record<string, unknown>,
      baseHash: data.hash,
    })
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      {showRestart && (
        <RestartBanner
          gatewayId={gatewayId}
          message="Security policy updated. A gateway restart is required for changes to take effect."
          onDismiss={() => setShowRestart(false)}
        />
      )}

      {/* Live pending approvals */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="size-3 text-muted-foreground" />
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            Pending Approvals
          </span>
          <span className="text-[0.5625rem] text-muted-foreground">(live)</span>
        </div>
        <PendingApprovals
          gatewayId={gatewayId}
          onAllowlistChanged={() =>
            queryClient.invalidateQueries({ queryKey: approvalsQueryKey })
          }
        />
      </div>

      {/* Defaults section */}
      <Card size="sm" className="bg-muted/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-3 text-muted-foreground" />
              <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
                Defaults
              </span>
            </div>
            {editDefaults ? (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setEditDefaults(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDefaults}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && <Spinner className="size-3" />}
                  <SaveIcon className="size-3" />
                  Save
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditDefaults({
                    security: defaults?.security,
                    ask: defaults?.ask,
                  })
                }
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editDefaults ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="text-[0.625rem] text-muted-foreground w-16">Security</label>
                <Select
                  value={editDefaults.security ?? ''}
                  onValueChange={(v) =>
                    setEditDefaults((prev) => ({ ...prev, security: v || undefined }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deny">deny</SelectItem>
                    <SelectItem value="allowlist">allowlist</SelectItem>
                    <SelectItem value="full">full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[0.625rem] text-muted-foreground w-16">Ask</label>
                <Select
                  value={editDefaults.ask ?? ''}
                  onValueChange={(v) =>
                    setEditDefaults((prev) => ({ ...prev, ask: v || undefined }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">always</SelectItem>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="never">never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : hasDefaults ? (
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
          ) : (
            <p className="text-[0.625rem] text-muted-foreground">
              No defaults set. Using gateway defaults.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Allowed Commands — consolidated view across all agents */}
      <AllowedCommands agents={agents} />

      {/* Per-agent security policies */}
      {agents.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UserIcon className="size-3 text-muted-foreground" />
            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
              Per-Agent Policies
            </span>
          </div>
          {agents.map(([agentId, config]) => (
            <div
              key={agentId}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {agentId === '*' ? 'All agents (wildcard)' : agentId}
                </span>
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
                </div>
              </div>
              <div className="flex items-center gap-2">
                {config.security === 'full' && (
                  <Badge variant="destructive" className="text-[0.625rem] gap-1">
                    <AlertTriangleIcon className="size-2.5" />
                    full access
                  </Badge>
                )}
                {config.allowlist && (
                  <Badge variant="outline" className="text-[0.625rem] tabular-nums">
                    {config.allowlist.length} rule{config.allowlist.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {agents.length === 0 && !hasDefaults && (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No exec approval configuration found. Exec security is using gateway defaults.
        </div>
      )}
    </div>
  )
}

function AllowedCommands({
  agents,
}: {
  agents: [string, { security?: string; allowlist?: { id?: string; pattern: string; lastUsedAt?: number; lastUsedCommand?: string; lastResolvedPath?: string }[] }][]
}) {
  // Flatten all allowlist entries across all agents
  const allEntries = agents.flatMap(([agentId, config]) =>
    (config.allowlist ?? []).map((entry) => ({
      ...entry,
      agentId: agentId === '*' ? 'all' : agentId,
    })),
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-3 text-muted-foreground" />
        <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
          Allowed Commands
        </span>
        <Badge variant="outline" className="text-[0.625rem] tabular-nums">
          {allEntries.length}
        </Badge>
      </div>

      {allEntries.length === 0 ? (
        <div className="rounded-md border bg-muted/20 px-3 py-3 text-center">
          <span className="text-[0.625rem] text-muted-foreground">
            No commands in the allowlist. Commands approved with &ldquo;Always&rdquo; will appear here.
          </span>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Last Command</TableHead>
                <TableHead>Resolved Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allEntries.map((entry, i) => (
                <TableRow key={entry.id ?? i}>
                  <TableCell className="font-mono text-[0.625rem]">{entry.pattern}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[0.5625rem]">
                      {entry.agentId}
                    </Badge>
                  </TableCell>
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
      )}
    </div>
  )
}
