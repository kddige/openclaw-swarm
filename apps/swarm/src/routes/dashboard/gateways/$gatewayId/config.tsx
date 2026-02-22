import { useState, useMemo } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/config')({
  component: ConfigPage,
  errorComponent: RouteErrorFallback,
})

const REDACTED = '__OPENCLAW_REDACTED__'

function stripRedacted(obj: unknown): { cleaned: unknown; redactedCount: number } {
  let redactedCount = 0

  function walk(v: unknown): unknown {
    if (typeof v === 'string' && v === REDACTED) {
      redactedCount++
      return undefined
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v !== null && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const walked = walk(val)
        if (walked !== undefined) out[k] = walked
      }
      return out
    }
    return v
  }

  return { cleaned: walk(obj), redactedCount }
}

function ConfigPage() {
  const { gatewayId } = Route.useParams()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<string | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)

  const { data, isLoading, error } = useQuery(
    orpc.gateway.configGet.queryOptions({ input: { gatewayId } }),
  )

  const original = useMemo(() => (data !== undefined ? data.raw : ''), [data])

  const text = draft ?? original
  const isDirty = draft !== null && draft !== original
  const hasRedacted = text.includes('__OPENCLAW_REDACTED__')

  const patchMutation = useMutation({
    ...orpc.gateway.configPatch.mutationOptions(),
    onSuccess: () => {
      toast.success('Config saved')
      setDraft(null)
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to save config', { description: String(err) })
    },
  })

  const applyMutation = useMutation({
    ...orpc.gateway.configApply.mutationOptions(),
    onSuccess: () => {
      toast.success('Config applied')
      setDraft(null)
      setApplyOpen(false)
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to apply config', { description: String(err) })
      setApplyOpen(false)
    },
  })

  const handlePatch = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      toast.error('Invalid JSON')
      return
    }
    const { cleaned, redactedCount } = stripRedacted(parsed)
    if (redactedCount > 0) {
      toast.info(`Stripped ${redactedCount} redacted field(s) — existing values kept on gateway`)
    }
    patchMutation.mutate({ gatewayId, raw: JSON.stringify(cleaned, null, 2), baseHash: data?.hash })
  }

  const handleApply = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      toast.error('Invalid JSON')
      setApplyOpen(false)
      return
    }
    const { cleaned, redactedCount } = stripRedacted(parsed)
    if (redactedCount > 0) {
      toast.info(
        `Stripped ${redactedCount} redacted field(s) from apply — those keys will be omitted`,
      )
    }
    applyMutation.mutate({ gatewayId, raw: JSON.stringify(cleaned, null, 2), baseHash: data?.hash })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="rounded-lg" style={{ minHeight: '400px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Config not available.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          disabled={!isDirty || patchMutation.isPending}
          onClick={handlePatch}
          title="Safe: only sends your changes, secrets are untouched"
        >
          {patchMutation.isPending && <Spinner className="size-3" />}
          Save changes
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={!isDirty || applyMutation.isPending || hasRedacted}
          onClick={() => setApplyOpen(true)}
          title={
            hasRedacted
              ? 'Remove all __OPENCLAW_REDACTED__ placeholders before applying — apply replaces the entire config including secrets'
              : 'Replace entire config and restart gateway'
          }
        >
          Replace entire config
        </Button>
        {hasRedacted && isDirty && (
          <p className="text-[0.625rem] text-destructive">
            Replace all <code>__OPENCLAW_REDACTED__</code> values with real values before using
            &ldquo;Replace entire config&rdquo;
          </p>
        )}
      </div>
      <p className="text-[0.625rem] text-muted-foreground -mt-1">
        <strong>Save changes</strong> = safe incremental patch (recommended) ·{' '}
        <strong>Replace entire config</strong> = full overwrite + gateway restart
      </p>

      <div className="overflow-hidden rounded-lg border">
        <MonacoEditor
          language="json"
          theme="vs-dark"
          height="60vh"
          value={text}
          onChange={(val) => setDraft(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      <AlertDialog open={applyOpen} onOpenChange={(open) => !open && setApplyOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace entire config?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends your full config to the gateway, replacing everything — including secrets.
              The gateway will restart. This cannot be undone. Use <strong>Save changes</strong>{' '}
              instead if you only want to update specific fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleApply}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending && <Spinner className="size-3" />}
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
