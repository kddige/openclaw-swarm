import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getActivityStatus } from '@/lib/gateway-status'
import {
  CheckIcon,
  XIcon,
  Trash2Icon,
  ShieldIcon,
  KeyIcon,
  MonitorIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/devices')({
  component: DevicesPage,
  errorComponent: RouteErrorFallback,
})

function DevicesPage() {
  const { gatewayId } = Route.useParams()
  const queryClient = useQueryClient()
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  // Get our own device ID to highlight "This device"
  const { data: deviceInfo } = useQuery(orpc.swarm.deviceId.queryOptions())
  const localDeviceId = deviceInfo?.deviceId

  const { data: initialPresence, isLoading: presenceLoading } = useQuery(
    orpc.gateway.presence.queryOptions({ input: { gatewayId } }),
  )

  const { data: streamedPresenceChunks } = useQuery(
    orpc.gateway.presenceStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'replace' },
    }),
  )

  const presence =
    streamedPresenceChunks && streamedPresenceChunks.length > 0
      ? streamedPresenceChunks[streamedPresenceChunks.length - 1]!.devices
      : initialPresence

  const pairsQueryKey = orpc.gateway.devicePairs.queryOptions({ input: { gatewayId } }).queryKey

  const { data: pairs, isLoading: pairsLoading } = useQuery(
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

  const removeMutation = useMutation({
    ...orpc.gateway.removeDevicePair.mutationOptions(),
    onSuccess: () => {
      toast.success('Device removed')
      setRemoveTarget(null)
      queryClient.invalidateQueries({ queryKey: pairsQueryKey })
    },
    onError: (err) => {
      toast.error('Failed to remove', { description: String(err) })
      setRemoveTarget(null)
    },
  })

  const isLoading = presenceLoading || pairsLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const pending = pairs?.pending ?? []
  const paired = pairs?.paired ?? []

  // Sort presence: this device first
  const sortedPresence = [...(presence ?? [])].sort((a, b) => {
    const aIsMe = a.deviceId === localDeviceId
    const bIsMe = b.deviceId === localDeviceId
    if (aIsMe !== bIsMe) return aIsMe ? -1 : 1
    return 0
  })

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Pending pair requests */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            Pending Approvals
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
      )}

      {/* Paired devices */}
      {paired.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            Paired Devices
          </span>
          <div className="space-y-1.5">
            {paired.map((device) => {
              const isMe = device.deviceId === localDeviceId
              return (
                <div
                  key={device.deviceId}
                  className={cn(
                    'flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2',
                    isMe && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="size-3 text-emerald-500" />
                      <span className="text-xs font-medium">
                        {device.displayName ?? device.deviceId.slice(0, 12)}
                      </span>
                      {isMe && (
                        <Badge
                          variant="outline"
                          className="text-[0.5625rem] gap-0.5 text-primary border-primary/40"
                        >
                          <MonitorIcon className="size-2" />
                          this device
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[0.625rem] text-muted-foreground">
                      {device.platform && <span>{device.platform}</span>}
                      {device.role && (
                        <Badge variant="outline" className="text-[0.5625rem]">
                          {device.role}
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[0.5625rem] text-muted-foreground/70 truncate max-w-64">
                      {device.deviceId}
                    </span>
                  </div>
                  {!isMe && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Remove device"
                      onClick={() => setRemoveTarget(device.deviceId)}
                    >
                      <Trash2Icon className="size-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Connected devices (presence) */}
      {sortedPresence.length > 0 && (
        <div className="@container flex flex-col gap-2">
          <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
            Connected Now
          </span>
          <div className="grid gap-3 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3">
            {sortedPresence.map((entry, i) => {
              const activity = getActivityStatus(entry.lastInputSeconds)
              const connectedSince = entry.ts
                ? formatDistanceToNow(entry.ts, { addSuffix: true })
                : null
              const isMe = entry.deviceId === localDeviceId
              return (
                <Card
                  key={`${entry.host}-${entry.ip}-${i}`}
                  className={cn('bg-muted/40', isMe && 'ring-primary/30 ring-1 bg-primary/5')}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold truncate">
                          {entry.host ?? 'Unknown'}
                        </span>
                        {isMe && (
                          <Badge
                            variant="outline"
                            className="text-[0.5625rem] gap-0.5 text-primary border-primary/40 shrink-0"
                          >
                            <MonitorIcon className="size-2" />
                            you
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {entry.platform && (
                          <Badge variant="outline" className="text-[0.625rem]">
                            {entry.platform}
                          </Badge>
                        )}
                        {entry.mode && (
                          <Badge variant="outline" className="text-[0.625rem]">
                            {entry.mode}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(entry.deviceFamily || entry.modelIdentifier) && (
                      <p className="text-[0.625rem] text-muted-foreground truncate">
                        {[entry.deviceFamily, entry.modelIdentifier].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {entry.ip && (
                      <span className="font-mono text-[0.625rem] text-muted-foreground">
                        {entry.ip}
                      </span>
                    )}
                    {entry.version && (
                      <span className="text-[0.625rem] text-muted-foreground">
                        v{entry.version}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={cn('size-1.5 rounded-full shrink-0', activity.color)} />
                      <span className="text-[0.625rem] text-muted-foreground">
                        {activity.label}
                      </span>
                    </div>
                    {entry.deviceId && (
                      <div className="flex items-center gap-1">
                        <KeyIcon className="size-2.5 text-muted-foreground/50" />
                        <span className="font-mono text-[0.5625rem] text-muted-foreground/70 truncate">
                          {entry.deviceId}
                        </span>
                      </div>
                    )}
                    {entry.roles && entry.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-[0.625rem]">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {connectedSince && (
                      <p className="text-[0.5625rem] text-muted-foreground/70 mt-1">
                        Connected {connectedSince}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {!sortedPresence.length && !pending.length && !paired.length && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No devices connected or paired.
        </div>
      )}

      {/* Remove device confirmation */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove paired device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpair the device. It will need to re-pair to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                removeTarget && removeMutation.mutate({ gatewayId, deviceId: removeTarget })
              }
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Spinner className="size-3" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
