import { cn } from '@/lib/utils'
import { CheckCircleIcon, XCircleIcon } from 'lucide-react'

interface ChannelHealthCompactProps {
  health?: {
    ok: boolean
    channels: Record<string, {
      configured?: boolean
      running?: boolean
      probe?: { ok: boolean; error?: string | null }
      lastError?: string | null
    }>
  } | null
}

export function ChannelHealthCompact({ health }: ChannelHealthCompactProps) {
  if (!health) return null

  const channelEntries = Object.entries(health.channels)
  if (channelEntries.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider">
          Channel Health
        </span>
        {health.ok ? (
          <CheckCircleIcon className="size-3 text-emerald-500" />
        ) : (
          <XCircleIcon className="size-3 text-destructive" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {channelEntries.map(([name, ch]) => {
          const isOk = ch.probe?.ok ?? ch.running ?? ch.configured
          return (
            <div
              key={name}
              className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  isOk ? 'bg-emerald-500' : 'bg-destructive',
                )}
              />
              <span className="text-[0.625rem] font-medium capitalize">{name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
