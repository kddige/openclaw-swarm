import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckIcon, XIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export function DevicePairingRequests({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()

  const pairsQueryKey = orpc.gateway.devicePairs.queryOptions({ input: { gatewayId } }).queryKey

  const { data: pairs } = useQuery(
    orpc.gateway.devicePairs.queryOptions({ input: { gatewayId } }),
  )

  const approveMutation = useMutation({
    ...orpc.gateway.approveDevicePair.mutationOptions(),
    onSuccess: () => {
      toast.success('Device approved')
      queryClient.invalidateQueries({ queryKey: pairsQueryKey })
    },
    onError: (err) => toast.error('Failed to approve', { description: String(err) }),
  })

  const rejectMutation = useMutation({
    ...orpc.gateway.rejectDevicePair.mutationOptions(),
    onSuccess: () => {
      toast.success('Device rejected')
      queryClient.invalidateQueries({ queryKey: pairsQueryKey })
    },
    onError: (err) => toast.error('Failed to reject', { description: String(err) }),
  })

  const pending = pairs?.pending ?? []
  if (pending.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
        Device Pairing Requests
      </span>
      <div className="space-y-1.5">
        {pending.map((req) => (
          <div
            key={req.requestId}
            className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">
                {req.displayName ?? req.deviceId.slice(0, 12)}
              </span>
              <div className="flex flex-wrap gap-1.5 text-[0.625rem] text-muted-foreground">
                {req.platform && <span>{req.platform}</span>}
                {req.remoteIp && <span>{req.remoteIp}</span>}
                {req.role && (
                  <Badge variant="outline" className="text-[0.5625rem]">
                    {req.role}
                  </Badge>
                )}
                <span className="tabular-nums">
                  {formatDistanceToNow(req.ts, { addSuffix: true })}
                </span>
              </div>
              <span className="font-mono text-[0.5625rem] text-muted-foreground/70 truncate max-w-64">
                {req.deviceId}
              </span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  approveMutation.mutate({ gatewayId, requestId: req.requestId })
                }
                disabled={approveMutation.isPending}
                className="text-emerald-600 dark:text-emerald-400"
              >
                {approveMutation.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <CheckIcon className="size-3" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  rejectMutation.mutate({ gatewayId, requestId: req.requestId })
                }
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <XIcon className="size-3" />
                )}
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
