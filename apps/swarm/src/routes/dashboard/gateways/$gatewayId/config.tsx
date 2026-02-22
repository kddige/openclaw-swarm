import { useState, useMemo, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'groq', label: 'Groq' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'other', label: 'Other' },
] as const

const CHANNELS = [
  { value: 'none', label: 'None' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'signal', label: 'Signal' },
  { value: 'imessage', label: 'iMessage' },
] as const

function ProviderWizard({
  gatewayId,
  data,
}: {
  gatewayId: string
  data: { raw: string; hash?: string } | undefined
}) {
  const queryClient = useQueryClient()

  const parsed = useMemo<Record<string, unknown>>(() => {
    const raw = data?.raw
    if (!raw) return {}
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [data])

  const getPath = useCallback(
    (...keys: string[]): unknown => {
      let cur: unknown = parsed
      for (const k of keys) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = (cur as Record<string, unknown>)[k]
      }
      return cur
    },
    [parsed],
  )

  const isRedacted = (v: unknown) => v === REDACTED

  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState(() => {
    const v = getPath('defaultModel')
    return typeof v === 'string' && !isRedacted(v) ? v : ''
  })

  const existingProviderKey = useMemo(() => {
    if (!provider) return false
    const v = getPath('providers', provider, 'apiKey')
    return isRedacted(v)
  }, [provider, getPath])

  const [defaultAgentId, setDefaultAgentId] = useState(() => {
    const v = getPath('heartbeat', 'defaultAgentId')
    return typeof v === 'string' && !isRedacted(v) ? v : ''
  })
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(() => {
    const agents = getPath('heartbeat', 'agents')
    if (!Array.isArray(agents) || agents.length === 0) return false
    const first = agents[0] as Record<string, unknown>
    return first?.enabled === true
  })
  const [heartbeatInterval, setHeartbeatInterval] = useState(() => {
    const agents = getPath('heartbeat', 'agents')
    if (!Array.isArray(agents) || agents.length === 0) return ''
    const first = agents[0] as Record<string, unknown>
    const v = first?.every
    return typeof v === 'string' ? v : ''
  })

  const [channel, setChannel] = useState('none')
  const [discordToken, setDiscordToken] = useState('')

  const existingDiscordToken = useMemo(() => {
    const v = getPath('channels', 'discord', 'token')
    return isRedacted(v)
  }, [getPath])

  const patchMutation = useMutation({
    ...orpc.gateway.configPatch.mutationOptions(),
    onSuccess: () => {
      toast.success('Config saved')
      queryClient.invalidateQueries({
        queryKey: orpc.gateway.configGet.queryOptions({ input: { gatewayId } }).queryKey,
      })
    },
    onError: (err) => {
      toast.error('Failed to save config', { description: String(err) })
    },
  })

  const handleSave = () => {
    const patch: Record<string, unknown> = {}

    if (provider && apiKey.trim() && !isRedacted(apiKey)) {
      patch.providers = {
        [provider]: { apiKey: apiKey.trim() },
      }
    }

    if (defaultModel.trim()) {
      patch.defaultModel = defaultModel.trim()
    }

    const agentId = defaultAgentId.trim() || 'main'
    const heartbeatPatch: Record<string, unknown> = {}
    if (defaultAgentId.trim()) {
      heartbeatPatch.defaultAgentId = defaultAgentId.trim()
    }
    if (heartbeatEnabled || heartbeatInterval.trim()) {
      heartbeatPatch.agents = [
        {
          agentId,
          enabled: heartbeatEnabled,
          ...(heartbeatInterval.trim() ? { every: heartbeatInterval.trim() } : {}),
        },
      ]
    }
    if (Object.keys(heartbeatPatch).length > 0) {
      patch.heartbeat = heartbeatPatch
    }

    if (channel === 'discord' && discordToken.trim() && !isRedacted(discordToken)) {
      patch.channels = { discord: { token: discordToken.trim() } }
    }

    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save')
      return
    }

    const { cleaned } = stripRedacted(patch)
    patchMutation.mutate({
      gatewayId,
      raw: JSON.stringify(cleaned, null, 2),
      baseHash: data?.hash,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Provider &amp; Model
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v ?? '')}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue placeholder="Select provider…" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs">API Key</Label>
                {existingProviderKey && (
                  <Badge variant="outline" className="text-[0.625rem] py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
                    Key set ✓
                  </Badge>
                )}
              </div>
              <Input
                size={undefined}
                type="password"
                className="h-8 text-xs w-72"
                placeholder="Enter new API key…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {existingProviderKey && (
                <p className="text-[0.625rem] text-muted-foreground">
                  Leave empty to keep existing key
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Default model</Label>
            <Input
              size={undefined}
              className="h-8 text-xs w-72 font-mono"
              placeholder="e.g. claude-sonnet-4-5-20250929"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Agent Settings
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Default agent ID</Label>
            <Input
              size={undefined}
              className="h-8 text-xs w-48 font-mono"
              placeholder="main"
              value={defaultAgentId}
              onChange={(e) => setDefaultAgentId(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="heartbeat-enabled"
              checked={heartbeatEnabled}
              onCheckedChange={setHeartbeatEnabled}
            />
            <Label htmlFor="heartbeat-enabled" className="text-xs cursor-pointer">
              Enable heartbeat
            </Label>
          </div>

          {heartbeatEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Heartbeat interval</Label>
              <Input
                size={undefined}
                className="h-8 text-xs w-32 font-mono"
                placeholder="30m"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Channel
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Channel type</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v ?? 'none')}>
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Select channel…" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel === 'discord' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Discord token</Label>
                {existingDiscordToken && (
                  <Badge variant="outline" className="text-[0.625rem] py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
                    Token set ✓
                  </Badge>
                )}
              </div>
              <Input
                size={undefined}
                type="password"
                className="h-8 text-xs w-72"
                placeholder="Enter new token…"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
              />
              {existingDiscordToken && (
                <p className="text-[0.625rem] text-muted-foreground">
                  Leave empty to keep existing token
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" disabled={patchMutation.isPending} onClick={handleSave}>
          {patchMutation.isPending && <Spinner className="size-3" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

function ConfigPage() {
  const { gatewayId } = Route.useParams()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<string | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'wizard' | 'raw'>('wizard')

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
      <div className="flex items-center gap-1 self-start rounded-md border p-0.5">
        <button
          type="button"
          onClick={() => setViewMode('wizard')}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            viewMode === 'wizard'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Wizard
        </button>
        <button
          type="button"
          onClick={() => setViewMode('raw')}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            viewMode === 'raw'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Raw JSON
        </button>
      </div>

      {viewMode === 'wizard' ? (
        <ProviderWizard gatewayId={gatewayId} data={data} />
      ) : (
        <>
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
                  This sends your full config to the gateway, replacing everything — including
                  secrets. The gateway will restart. This cannot be undone. Use{' '}
                  <strong>Save changes</strong> instead if you only want to update specific fields.
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
        </>
      )}
    </div>
  )
}
