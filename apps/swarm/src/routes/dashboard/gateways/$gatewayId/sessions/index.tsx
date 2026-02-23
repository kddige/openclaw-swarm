import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import {
  SessionActionDialogs,
  type SessionActionDialog,
} from '@/components/session-action-dialogs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontalIcon, RotateCcwIcon, MinimizeIcon, Trash2Icon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/sessions/')({
  component: SessionsPage,
  errorComponent: RouteErrorFallback,
})

function SessionsPage() {
  const { gatewayId } = Route.useParams()
  const queryClient = useQueryClient()
  const [actionDialog, setActionDialog] = useState<SessionActionDialog>({ type: 'none' })

  const { data: initialSessions, isLoading } = useQuery(
    orpc.gateway.sessions.queryOptions({ input: { gatewayId } }),
  )

  const { data: streamedChunks } = useQuery(
    orpc.gateway.sessionsStream.experimental_streamedOptions({
      input: { gatewayId },
      queryFnOptions: { refetchMode: 'replace' },
    }),
  )

  const sessions =
    streamedChunks && streamedChunks.length > 0
      ? streamedChunks[streamedChunks.length - 1]!.sessions
      : initialSessions

  const sessionsQueryKey = orpc.gateway.sessions.queryOptions({
    input: { gatewayId },
  }).queryKey

  const resetMutation = useMutation({
    ...orpc.gateway.resetSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session reset')
      setActionDialog({ type: 'none' })
    },
    onError: (err) => {
      toast.error('Failed to reset session', { description: String(err) })
    },
  })

  const compactMutation = useMutation({
    ...orpc.gateway.compactSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session compacted')
      setActionDialog({ type: 'none' })
    },
    onError: (err) => {
      toast.error('Failed to compact session', { description: String(err) })
    },
  })

  const deleteMutation = useMutation({
    ...orpc.gateway.deleteSession.mutationOptions(),
    onSuccess: () => {
      toast.success('Session deleted')
      setActionDialog({ type: 'none' })
      queryClient.invalidateQueries({ queryKey: sessionsQueryKey })
    },
    onError: (err) => {
      toast.error('Failed to delete session', { description: String(err) })
    },
  })

  if (isLoading) {
    return (
      <div className="pt-2 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    )
  }

  if (!sessions?.length) {
    return <div className="py-8 text-center text-xs text-muted-foreground">No sessions found.</div>
  }

  return (
    <div className="pt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.key}>
              <TableCell>
                <Link
                  to="/dashboard/gateways/$gatewayId/sessions/$sessionKey"
                  params={{ gatewayId, sessionKey: session.key }}
                  className="font-mono text-[0.625rem] hover:underline"
                >
                  {session.key}
                </Link>
              </TableCell>
              <TableCell className="truncate max-w-64">{session.displayName ?? '--'}</TableCell>
              <TableCell className="text-muted-foreground">{session.kind ?? '--'}</TableCell>
              <TableCell>{session.agent ?? '--'}</TableCell>
              <TableCell className="text-muted-foreground">
                {session.lastActiveAt
                  ? formatDistanceToNow(session.lastActiveAt, {
                      addSuffix: true,
                    })
                  : '--'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {(session.tokensIn + session.tokensOut).toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">${session.cost.toFixed(4)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setActionDialog({ type: 'reset', sessionKey: session.key })}
                    >
                      <RotateCcwIcon />
                      Reset Session
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActionDialog({ type: 'compact', sessionKey: session.key })}
                    >
                      <MinimizeIcon />
                      Compact Session
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        setActionDialog({ type: 'delete', sessionKey: session.key })
                      }
                    >
                      <Trash2Icon />
                      Delete Session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SessionActionDialogs
        dialog={actionDialog}
        onClose={() => setActionDialog({ type: 'none' })}
        onReset={(sessionKey) => resetMutation.mutate({ gatewayId, sessionKey })}
        onCompact={(sessionKey, maxLines) =>
          compactMutation.mutate({ gatewayId, sessionKey, maxLines })
        }
        onDelete={(sessionKey, deleteTranscript) =>
          deleteMutation.mutate({ gatewayId, sessionKey, deleteTranscript })
        }
        resetPending={resetMutation.isPending}
        compactPending={compactMutation.isPending}
        deletePending={deleteMutation.isPending}
      />
    </div>
  )
}
