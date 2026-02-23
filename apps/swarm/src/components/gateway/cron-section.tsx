import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ClockIcon,
  PlayIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  AlertTriangleIcon,
  PencilIcon,
  SearchIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export function CronSection({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<{
    jobId: string
    name: string
    description: string
    message: string
    schedule: string
    enabled: boolean
  } | null>(null)
  const [search, setSearch] = useState('')

  const cronQueryKey = orpc.gateway.cronJobs.queryOptions({
    input: { gatewayId, includeDisabled: true },
  }).queryKey

  const { data: jobs, isLoading, error } = useQuery(
    orpc.gateway.cronJobs.queryOptions({ input: { gatewayId, includeDisabled: true } }),
  )

  const runMutation = useMutation({
    ...orpc.gateway.runCronJob.mutationOptions(),
    onSuccess: () => toast.success('Cron job triggered'),
    onError: (err) => toast.error('Failed to run cron job', { description: String(err) }),
  })

  const removeMutation = useMutation({
    ...orpc.gateway.removeCronJob.mutationOptions(),
    onSuccess: () => {
      toast.success('Cron job removed')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: cronQueryKey })
    },
    onError: (err) => {
      toast.error('Failed to remove cron job', { description: String(err) })
      setDeleteTarget(null)
    },
  })

  const toggleMutation = useMutation({
    ...orpc.gateway.updateCronJob.mutationOptions(),
    onSuccess: () => {
      toast.success('Cron job updated')
      queryClient.invalidateQueries({ queryKey: cronQueryKey })
    },
    onError: (err) => toast.error('Failed to update cron job', { description: String(err) }),
  })

  const editMutation = useMutation({
    ...orpc.gateway.updateCronJob.mutationOptions(),
    onSuccess: () => {
      toast.success('Cron job updated')
      setEditTarget(null)
      queryClient.invalidateQueries({ queryKey: cronQueryKey })
    },
    onError: (err) => toast.error('Failed to update', { description: String(err) }),
  })

  const sorted = useMemo(() => {
    if (!jobs) return []
    const q = search.toLowerCase()
    return [...jobs]
      .filter((j) => {
        if (!q) return true
        return (
          j.name.toLowerCase().includes(q) ||
          (j.description ?? '').toLowerCase().includes(q) ||
          (j.agentId ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [jobs, search])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Cron jobs not available.</div>
    )
  }

  if (!jobs?.length) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">No cron jobs configured.</div>
    )
  }

  const enabledCount = jobs.filter((j) => j.enabled).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[0.625rem]">
          {enabledCount} enabled
        </Badge>
        <Badge variant="outline" className="text-[0.625rem] text-muted-foreground">
          {jobs.length} total
        </Badge>
        <div className="relative flex-1 max-w-64 ml-auto">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Filter cron jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {sorted.map((job) => {
        const scheduleLabel =
          job.schedule.type === 'cron'
            ? job.schedule.expr
            : job.schedule.type === 'every'
              ? `every ${((job.schedule.everyMs ?? 0) / 1000 / 60).toFixed(0)}m`
              : job.schedule.type === 'at'
                ? `at ${job.schedule.at}`
                : 'unknown'

        return (
          <Card key={job.id} size="sm" className={cn('bg-muted/40', !job.enabled && 'opacity-50')}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ClockIcon className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">{job.name}</span>
                  <Badge variant="outline" className="text-[0.625rem] font-mono shrink-0">
                    {scheduleLabel}
                  </Badge>
                  {!job.enabled && (
                    <Badge variant="outline" className="text-[0.625rem] text-muted-foreground shrink-0">
                      disabled
                    </Badge>
                  )}
                  {job.lastStatus === 'error' && (
                    <Badge variant="destructive" className="text-[0.625rem] gap-1 shrink-0">
                      <AlertTriangleIcon className="size-2.5" />
                      error
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const msg = job.payload.message ?? ''
                        setEditTarget({
                          jobId: job.id,
                          name: job.name,
                          description: job.description ?? '',
                          message: msg,
                          schedule: scheduleLabel ?? '',
                          enabled: job.enabled,
                        })
                      }}
                    >
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        runMutation.mutate({ gatewayId, jobId: job.id, mode: 'force' })
                      }
                    >
                      <PlayIcon />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toggleMutation.mutate({
                          gatewayId,
                          jobId: job.id,
                          patch: { enabled: !job.enabled },
                        })
                      }
                    >
                      {job.enabled ? <ToggleLeftIcon /> : <ToggleRightIcon />}
                      {job.enabled ? 'Disable' : 'Enable'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(job.id)}>
                      <Trash2Icon />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                {job.description && (
                  <p className="text-[0.625rem] text-muted-foreground">{job.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.625rem] text-muted-foreground">
                  <span>
                    type: <span className="text-foreground">{job.payload.type}</span>
                  </span>
                  {job.agentId && (
                    <span>
                      agent: <span className="text-foreground">{job.agentId}</span>
                    </span>
                  )}
                  {job.nextRunAtMs && (
                    <span>
                      next:{' '}
                      <span className="text-foreground tabular-nums">
                        {formatDistanceToNow(job.nextRunAtMs, { addSuffix: true })}
                      </span>
                    </span>
                  )}
                  {job.lastRunAtMs && (
                    <span>
                      last:{' '}
                      <span className="text-foreground tabular-nums">
                        {formatDistanceToNow(job.lastRunAtMs, { addSuffix: true })}
                      </span>
                    </span>
                  )}
                  {(job.consecutiveErrors ?? 0) > 0 && (
                    <span className="text-destructive">
                      {job.consecutiveErrors} consecutive error
                      {job.consecutiveErrors !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {job.lastError && (
                  <p className="text-[0.625rem] text-destructive truncate mt-0.5">{job.lastError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove cron job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the cron job. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                deleteTarget && removeMutation.mutate({ gatewayId, jobId: deleteTarget })
              }
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Spinner className="size-3" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cron Job</DialogTitle>
            <DialogDescription>Update the job configuration.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] text-muted-foreground">Name</label>
                <Input
                  value={editTarget.name}
                  onChange={(e) => setEditTarget((p) => p && { ...p, name: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] text-muted-foreground">Description</label>
                <Input
                  value={editTarget.description}
                  onChange={(e) => setEditTarget((p) => p && { ...p, description: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] text-muted-foreground">Message / Prompt</label>
                <Textarea
                  value={editTarget.message}
                  onChange={(e) => setEditTarget((p) => p && { ...p, message: e.target.value })}
                  className="text-xs min-h-[80px]"
                  placeholder="The message sent to the agent when the cron fires..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.625rem] text-muted-foreground">Schedule (read-only)</label>
                <Input
                  value={editTarget.schedule}
                  disabled
                  className="h-7 text-xs font-mono opacity-60"
                />
                <p className="text-[0.5625rem] text-muted-foreground">
                  Schedule changes require recreating the cron job.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return
                const patch: Record<string, unknown> = {
                  name: editTarget.name,
                  description: editTarget.description || undefined,
                }
                if (editTarget.message) {
                  patch.payload = { message: editTarget.message }
                }
                editMutation.mutate({ gatewayId, jobId: editTarget.jobId, patch })
              }}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending && <Spinner className="size-3" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
