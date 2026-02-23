import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserIcon, FileIcon, StarIcon } from 'lucide-react'

export function AgentsSection({ gatewayId }: { gatewayId: string }) {
  const [filesTarget, setFilesTarget] = useState<string | null>(null)

  const { data: agents, isLoading } = useQuery(
    orpc.gateway.agents.queryOptions({ input: { gatewayId } }),
  )

  const { data: agentFiles } = useQuery({
    ...orpc.gateway.agentFiles.queryOptions({
      input: { gatewayId, agentId: filesTarget ?? '' },
    }),
    enabled: filesTarget !== null,
  })

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!agents?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No agents configured.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} size="sm" className="bg-muted/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {agent.identity?.emoji ? (
                      <span className="text-base">{agent.identity.emoji}</span>
                    ) : (
                      <UserIcon className="size-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <CardTitle>{agent.identity?.name ?? agent.name ?? agent.id}</CardTitle>
                    {(agent.identity?.name || agent.name) && (
                      <span className="font-mono text-[0.625rem] text-muted-foreground">
                        {agent.id}
                      </span>
                    )}
                  </div>
                </div>
                {agent.isDefault && (
                  <Badge
                    variant="outline"
                    className="text-[0.625rem] shrink-0 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  >
                    <StarIcon className="size-2.5" />
                    default
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {agent.identity?.theme && (
                <p className="text-[0.625rem] text-muted-foreground line-clamp-2">
                  {agent.identity.theme}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="self-start h-6 text-[0.625rem]"
                onClick={() => setFilesTarget(agent.id)}
              >
                <FileIcon className="size-2.5" />
                View Files
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-[0.625rem] text-muted-foreground">
        Agent configuration is managed through the gateway&apos;s workspace. Use the Config section
        or gateway CLI to create or modify agents.
      </p>

      <Dialog open={filesTarget !== null} onOpenChange={(open) => !open && setFilesTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agent Files — {filesTarget}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {!agentFiles?.length ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No files found.</p>
            ) : (
              agentFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileIcon className="size-3 text-muted-foreground" />
                    <span className="font-mono text-[0.625rem]">{file.name}</span>
                  </div>
                  <span className="text-[0.625rem] text-muted-foreground tabular-nums">
                    {file.size} bytes
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
