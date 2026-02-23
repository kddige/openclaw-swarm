import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { RestartBanner } from '@/components/restart-banner'
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
import { ShieldIcon, UserIcon, AlertTriangleIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

export function SecurityPolicies({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()
  const [editDefaults, setEditDefaults] = useState<{
    security?: string
    ask?: string
  } | null>(null)
  const [showRestart, setShowRestart] = useState(false)

  const approvalsQueryKey = orpc.gateway.execApprovals.queryOptions({
    input: { gatewayId },
  }).queryKey

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-lg" />
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
    <div className="flex flex-col gap-4">
      {showRestart && (
        <RestartBanner
          gatewayId={gatewayId}
          message="Security policy updated. A gateway restart is required for changes to take effect."
          onDismiss={() => setShowRestart(false)}
        />
      )}

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
                <Button size="sm" onClick={handleSaveDefaults} disabled={saveMutation.isPending}>
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

      {/* Allowed Commands */}
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
  agents: [
    string,
    {
      security?: string
      allowlist?: {
        id?: string
        pattern: string
        lastUsedAt?: number
        lastUsedCommand?: string
        lastResolvedPath?: string
      }[]
    },
  ][]
}) {
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
            No commands in the allowlist. Commands approved with &ldquo;Always&rdquo; will appear
            here.
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
