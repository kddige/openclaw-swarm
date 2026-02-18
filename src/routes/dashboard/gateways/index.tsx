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
  XCircleIcon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
  LinkIcon,
  TerminalIcon,
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
      return { text: 'Pairing Required', dot: 'bg-amber-400 animate-pulse' }
    case 'auth-failed':
      return { text: 'Auth Failed', dot: 'bg-destructive' }
    case 'disconnected':
    default:
      return { text: 'Offline', dot: 'bg-muted-foreground/50' }
  }
}

function GatewayPairingHint({
  requestId,
  gatewayId,
}: {
  requestId: string | null
  gatewayId: string
}) {
  const [copied, setCopied] = useState(false)
  const command = requestId
    ? `openclaw devices approve ${requestId}`
    : null

  const copyCommand = async () => {
    if (!command) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.625rem] text-amber-600 dark:text-amber-400">
        Device pairing required
      </span>
      {command ? (
        <button
          type="button"
          onClick={copyCommand}
          className="group flex items-center gap-1.5 rounded border bg-muted/60 px-2 py-1 text-left transition-colors hover:bg-muted"
        >
          <code className="flex-1 font-mono text-[0.5625rem] text-foreground truncate">
            {command}
          </code>
          {copied ? (
            <CheckIcon className="size-2.5 text-emerald-500 shrink-0" />
          ) : (
            <CopyIcon className="size-2.5 text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </button>
      ) : (
        <Link
          to="/dashboard/gateways/$gatewayId"
          params={{ gatewayId }}
          className="text-[0.625rem] text-amber-600 dark:text-amber-400 hover:underline"
        >
          View pairing instructions →
        </Link>
      )}
    </div>
  )
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
                    {gw.lastError && gw.status !== 'pairing' && (
                      <span className="text-[0.625rem] text-destructive truncate">
                        {gw.lastError}
                      </span>
                    )}
                    {gw.status === 'pairing' && (
                      <GatewayPairingHint
                        requestId={gw.pairingRequestId}
                        gatewayId={gw.id}
                      />
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      {(gw.status === 'disconnected' ||
                        gw.status === 'auth-failed' ||
                        gw.status === 'pairing') && (
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

type DialogPhase =
  | { step: 'form' }
  | { step: 'testing' }
  | { step: 'error'; message: string }
  | { step: 'pairing'; requestId: string | null }
  | { step: 'saving' }

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <TerminalIcon className="size-3 text-muted-foreground shrink-0" />
      <code className="flex-1 font-mono text-[0.6875rem] text-foreground select-all">
        {command}
      </code>
      {copied ? (
        <CheckIcon className="size-3 text-emerald-500 shrink-0" />
      ) : (
        <CopyIcon className="size-3 text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

function AddGatewayDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const [phase, setPhase] = useState<DialogPhase>({ step: 'form' })

  const testMutation = useMutation(
    orpc.gateway.testConnection.mutationOptions(),
  )
  const addMutation = useMutation(
    orpc.gateway.add.mutationOptions(),
  )

  const canSubmit = url.length > 0 && token.length > 0 && label.length > 0
  const busy = phase.step === 'testing' || phase.step === 'saving'

  const handleSubmit = async () => {
    setPhase({ step: 'testing' })
    try {
      const result = await testMutation.mutateAsync({ url, token })
      if (!result.ok) {
        if (result.error === 'Device pairing required') {
          setPhase({
            step: 'pairing',
            requestId: result.pairingRequestId ?? null,
          })
        } else {
          setPhase({ step: 'error', message: result.error ?? 'Connection failed' })
        }
        return
      }
      // Test passed — save
      setPhase({ step: 'saving' })
      await addMutation.mutateAsync({ url, token, label })
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.list.queryOptions().queryKey,
      })
      onClose()
    } catch {
      setPhase({ step: 'error', message: 'Connection failed unexpectedly' })
    }
  }

  const resetToForm = () => setPhase({ step: 'form' })

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Gateway</DialogTitle>
        <DialogDescription>
          Connect to an OpenClaw Gateway instance.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-label">Label</Label>
          <Input
            id="gw-label"
            placeholder="My Gateway"
            value={label}
            onChange={(e) => { setLabel(e.target.value); resetToForm() }}
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-url">URL</Label>
          <Input
            id="gw-url"
            placeholder="wss://gateway.example.com:18789"
            value={url}
            onChange={(e) => { setUrl(e.target.value); resetToForm() }}
            disabled={busy}
          />
          <p className="text-[0.625rem] text-muted-foreground">
            WebSocket URL including port. Use wss:// for TLS.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gw-token">Token</Label>
          <Input
            id="gw-token"
            type="password"
            placeholder="Enter authentication token"
            value={token}
            onChange={(e) => { setToken(e.target.value); resetToForm() }}
            disabled={busy}
          />
        </div>

        {/* ── Phase feedback ── */}

        {phase.step === 'error' && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <XCircleIcon className="size-3.5 shrink-0" />
            {phase.message}
          </div>
        )}

        {phase.step === 'pairing' && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Device Pairing Required
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Approve this device on the gateway, then press the button below to
              finish connecting.
            </p>
            {phase.requestId ? (
              <CopyableCommand
                command={`openclaw devices approve ${phase.requestId}`}
              />
            ) : (
              <div className="flex flex-col gap-1.5 rounded-md border bg-muted/60 px-3 py-2">
                <code className="font-mono text-[0.6875rem] text-foreground">
                  openclaw devices list
                </code>
                <p className="text-[0.625rem] text-muted-foreground">
                  Find the pending request, then:{' '}
                  <code className="font-mono">
                    openclaw devices approve &lt;id&gt;
                  </code>
                </p>
              </div>
            )}
            <p className="text-[0.625rem] text-muted-foreground">
              Or approve via the OpenClaw Control UI → Devices tab.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        {phase.step === 'pairing' ? (
          <Button disabled={busy} onClick={handleSubmit}>
            {phase.step === 'pairing' && testMutation.isPending && (
              <Spinner className="size-3" />
            )}
            Retry & Save
          </Button>
        ) : (
          <Button disabled={!canSubmit || busy} onClick={handleSubmit}>
            {busy && <Spinner className="size-3" />}
            {phase.step === 'testing'
              ? 'Connecting...'
              : phase.step === 'saving'
                ? 'Saving...'
                : phase.step === 'error'
                  ? 'Try Again'
                  : 'Add Gateway'}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  )
}
