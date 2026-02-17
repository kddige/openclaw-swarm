import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  PlusIcon,
  ServerIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/')({
  component: GatewaysPage,
})

function statusConfig(status: string) {
  switch (status) {
    case 'connected':
      return { text: 'Connected', dot: 'bg-emerald-500' }
    case 'connecting':
      return { text: 'Connecting', dot: 'bg-amber-500 animate-pulse' }
    case 'pairing':
      return { text: 'Pairing', dot: 'bg-blue-500 animate-pulse' }
    case 'auth-failed':
      return { text: 'Auth Failed', dot: 'bg-destructive' }
    case 'disconnected':
    default:
      return { text: 'Offline', dot: 'bg-muted-foreground/50' }
  }
}

function GatewaysPage() {
  const queryClient = useQueryClient()
  const { data: gateways, isLoading } = useQuery(
    orpc.gateway.list.queryOptions(),
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const removeMutation = useMutation({
    ...orpc.gateway.remove.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.list.queryOptions().queryKey,
      })
      setRemoveId(null)
    },
  })

  const reconnectMutation = useMutation(
    orpc.gateway.reconnect.mutationOptions(),
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Gateways</h1>
          <p className="text-muted-foreground text-xs">
            Manage connected gateways
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <PlusIcon data-icon="inline-start" />
                Add Gateway
              </Button>
            }
          />
          <AddGatewayDialog onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : !gateways?.length ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerIcon />
            </EmptyMedia>
            <EmptyTitle>No gateways configured</EmptyTitle>
            <EmptyDescription>
              Add a gateway to start monitoring.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((gw) => {
            const status = statusConfig(gw.status)
            return (
              <Card
                key={gw.id}
                className="bg-muted/40 transition-colors hover:bg-muted/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Link
                      to="/dashboard/gateways/$gatewayId"
                      params={{ gatewayId: gw.id }}
                      className="truncate hover:underline"
                    >
                      <CardTitle className="truncate">{gw.label}</CardTitle>
                    </Link>
                    <Badge variant="outline" className="shrink-0 gap-1.5">
                      <span
                        className={cn('size-1.5 rounded-full', status.dot)}
                      />
                      {status.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {gw.url}
                    </span>
                    {gw.lastError && (
                      <span className="text-[0.625rem] text-destructive truncate">
                        {gw.lastError}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      {(gw.status === 'disconnected' ||
                        gw.status === 'auth-failed') && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            reconnectMutation.mutate({ id: gw.id })
                          }
                        >
                          <RefreshCwIcon />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveId(gw.id)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog
        open={removeId !== null}
        onOpenChange={(open) => !open && setRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect and remove the gateway from your fleet. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeId && removeMutation.mutate({ id: removeId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddGatewayDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const [testResult, setTestResult] = useState<{
    ok: boolean
    error?: string
  } | null>(null)

  const testMutation = useMutation({
    ...orpc.gateway.testConnection.mutationOptions(),
    onSuccess: (result) => setTestResult(result),
  })

  const addMutation = useMutation({
    ...orpc.gateway.add.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.list.queryOptions().queryKey,
      })
      onClose()
    },
  })

  const canTest = url.length > 0 && token.length > 0
  const canSave = canTest && label.length > 0

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Gateway</DialogTitle>
        <DialogDescription>
          Enter the connection details for the gateway.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-label">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="gw-label"
            placeholder="My Gateway"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-url">
            URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="gw-url"
            placeholder="wss://gateway.example.com:18789"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setTestResult(null)
            }}
          />
          <p className="text-[0.625rem] text-muted-foreground">
            WebSocket URL including port. Use wss:// for TLS connections.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-token">
            Token <span className="text-destructive">*</span>
          </Label>
          <Input
            id="gw-token"
            type="password"
            placeholder="Enter authentication token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setTestResult(null)
            }}
          />
        </div>

        {testResult && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
              testResult.ok
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/5 text-destructive',
            )}
          >
            {testResult.ok ? (
              <>
                <CheckCircleIcon className="size-3.5 shrink-0" />
                Connection successful
              </>
            ) : (
              <>
                <XCircleIcon className="size-3.5 shrink-0" />
                {testResult.error ?? 'Connection failed'}
              </>
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          disabled={!canTest || testMutation.isPending}
          onClick={() => testMutation.mutate({ url, token })}
        >
          {testMutation.isPending && <Spinner className="size-3" />}
          Test Connection
        </Button>
        <Button
          disabled={!canSave || addMutation.isPending}
          onClick={() => addMutation.mutate({ url, token, label })}
        >
          {addMutation.isPending && <Spinner className="size-3" />}
          Add Gateway
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
