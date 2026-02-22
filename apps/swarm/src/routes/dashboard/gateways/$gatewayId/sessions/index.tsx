import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
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
import { MoreHorizontalIcon, RotateCcwIcon, MinimizeIcon, Trash2Icon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/sessions/')({
  component: SessionsPage,
  errorComponent: RouteErrorFallback,
})

type SessionActionDialog =
  | { type: 'none' }
  | { type: 'reset'; sessionKey: string }
  | { type: 'compact'; sessionKey: string }
  | { type: 'delete'; sessionKey: string; deleteTranscript: boolean }

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
                  {session.key.length > 24 ? `${session.key.slice(0, 12)}...` : session.key}
                </Link>
              </TableCell>
              <TableCell className="truncate max-w-32">{session.displayName ?? '--'}</TableCell>
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
                        setActionDialog({
                          type: 'delete',
                          sessionKey: session.key,
                          deleteTranscript: false,
                        })
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

      {/* Reset Dialog */}
      <AlertDialog
        open={actionDialog.type === 'reset'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the session state. The transcript may be preserved depending on
              gateway settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionDialog.type === 'reset' &&
                resetMutation.mutate({ gatewayId, sessionKey: actionDialog.sessionKey })
              }
              disabled={resetMutation.isPending}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compact Dialog */}
      <AlertDialog
        open={actionDialog.type === 'compact'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compact Session</AlertDialogTitle>
            <AlertDialogDescription>
              Summarize and compress the session history to reduce token usage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionDialog.type === 'compact' &&
                compactMutation.mutate({ gatewayId, sessionKey: actionDialog.sessionKey })
              }
              disabled={compactMutation.isPending}
            >
              Compact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={actionDialog.type === 'delete'}
        onOpenChange={(open) => !open && setActionDialog({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={actionDialog.type === 'delete' ? actionDialog.deleteTranscript : false}
              onChange={(e) =>
                actionDialog.type === 'delete' &&
                setActionDialog({ ...actionDialog, deleteTranscript: e.target.checked })
              }
              className="rounded"
            />
            Also delete transcript
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                actionDialog.type === 'delete' &&
                deleteMutation.mutate({
                  gatewayId,
                  sessionKey: actionDialog.sessionKey,
                  deleteTranscript: actionDialog.deleteTranscript,
                })
              }
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
