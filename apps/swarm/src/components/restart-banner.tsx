import { useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { RefreshCwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

export function RestartBanner({
  gatewayId,
  message = 'Changes may require a gateway restart to take effect.',
  onDismiss,
}: {
  gatewayId: string
  message?: string
  onDismiss?: () => void
}) {
  const restartMutation = useMutation({
    ...orpc.gateway.configApply.mutationOptions(),
    onSuccess: () => {
      toast.success('Gateway restart initiated')
      onDismiss?.()
    },
    onError: (err) => toast.error('Restart failed', { description: String(err) }),
  })

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <RefreshCwIcon className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-[0.625rem] text-amber-600 dark:text-amber-400 font-medium">
          {message}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[0.625rem]"
          onClick={async () => {
            try {
              const config = await orpc.gateway.configGet
                .queryOptions({ input: { gatewayId } })
                .queryFn({ signal: new AbortController().signal } as never)
              if (config?.raw) {
                restartMutation.mutate({ gatewayId, raw: config.raw, baseHash: config.hash })
              }
            } catch (err) {
              toast.error('Failed to fetch config', { description: String(err) })
            }
          }}
          disabled={restartMutation.isPending}
        >
          {restartMutation.isPending && <Spinner className="size-2.5" />}
          <RefreshCwIcon className="size-2.5" />
          Apply &amp; Restart
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            title="Dismiss"
          >
            <XIcon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
