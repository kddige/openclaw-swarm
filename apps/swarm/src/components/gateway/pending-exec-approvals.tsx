import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckIcon, XIcon, ShieldCheckIcon, TerminalIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

export function PendingExecApprovals({ gatewayId }: { gatewayId: string }) {
  const [pending, setPending] = useState<Map<string, PendingApproval>>(new Map())

  const { data: approvalEvents } = useQuery(
    orpc.gateway.execApprovalStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'append' },
      initialData: [],
    }),
  )

  const processedCount = useRef(0)

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
    },
    onError: (err) => toast.error('Failed to resolve', { description: String(err) }),
  })

  const handleResolve = useCallback(
    (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => {
      resolveMutation.mutate({ gatewayId, id, decision })
    },
    [gatewayId, resolveMutation],
  )

  if (allPending.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-3 text-amber-500" />
        <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
          Pending Exec Approvals
        </span>
        <span className="text-[0.5625rem] text-muted-foreground">(live)</span>
      </div>
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
    <div className={cn('rounded-md border px-3 py-2.5 flex flex-col gap-2', urgentClass)}>
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
