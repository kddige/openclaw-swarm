import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircleIcon, XCircleIcon, LogOutIcon, RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'

export function ChannelsSection({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()

  const channelsQueryKey = orpc.gateway.channelsStatus.queryOptions({
    input: { gatewayId },
  }).queryKey

  const { data, isLoading, error, isFetching } = useQuery(
    orpc.gateway.channelsStatus.queryOptions({ input: { gatewayId } }),
  )

  const probeQuery = useQuery({
    ...orpc.gateway.channelsStatus.queryOptions({ input: { gatewayId, probe: true } }),
    enabled: false,
  })

  const handleProbe = async () => {
    try {
      await probeQuery.refetch()
      toast.success('Probe complete')
      queryClient.invalidateQueries({ queryKey: channelsQueryKey })
    } catch (err) {
      toast.error('Probe failed', { description: String(err) })
    }
  }

  const logoutMutation = useMutation({
    ...orpc.gateway.logoutChannel.mutationOptions(),
    onSuccess: () => {
      toast.success('Logged out')
      queryClient.invalidateQueries({ queryKey: channelsQueryKey })
    },
    onError: (err) => toast.error('Logout failed', { description: String(err) }),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Channel status not available.
      </div>
    )
  }

  const channels = data.channels ?? {}
  const channelOrder = data.channelOrder ?? Object.keys(channels)
  const channelLabels = data.channelLabels ?? {}

  if (channelOrder.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No channels configured.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleProbe}
          disabled={probeQuery.isFetching || isFetching}
        >
          {(probeQuery.isFetching || isFetching) && <Spinner className="size-3" />}
          <RefreshCwIcon className="size-3" />
          Probe All
        </Button>
      </div>

      <div className="space-y-1.5">
        {channelOrder.map((name) => {
          const ch = channels[name]
          if (!ch) return null
          const label = channelLabels[name] ?? name
          const isOk = ch.probe?.ok ?? ch.running ?? ch.configured
          const probeElapsed = ch.probe?.elapsedMs

          return (
            <div
              key={name}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium capitalize">{label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {ch.configured && (
                    <Badge variant="outline" className="text-[0.625rem]">
                      configured
                    </Badge>
                  )}
                  {ch.running && (
                    <Badge variant="outline" className="text-[0.625rem]">
                      running
                    </Badge>
                  )}
                  {ch.tokenSource && (
                    <Badge variant="outline" className="text-[0.625rem] text-muted-foreground">
                      {ch.tokenSource}
                    </Badge>
                  )}
                  {probeElapsed != null && (
                    <span className="text-[0.625rem] text-muted-foreground tabular-nums">
                      {probeElapsed}ms
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOk ? (
                  <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="size-2.5" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircleIcon className="size-2.5" />
                    {ch.lastError ?? ch.probe?.error ?? 'Error'}
                  </Badge>
                )}
                {ch.running && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Logout"
                    onClick={() => logoutMutation.mutate({ gatewayId, channel: name })}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOutIcon className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
