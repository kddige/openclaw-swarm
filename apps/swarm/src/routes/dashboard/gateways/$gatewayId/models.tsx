import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckIcon, SearchIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/models')({
  component: ModelsPage,
  errorComponent: RouteErrorFallback,
})

function ModelsPage() {
  const { gatewayId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')

  const { data: models, isLoading, error } = useQuery(
    orpc.gateway.models.queryOptions({ input: { gatewayId } }),
  )

  // Cross-reference with config to determine which models are explicitly enabled
  const { data: configData } = useQuery(
    orpc.gateway.configGet.queryOptions({ input: { gatewayId } }),
  )

  const enabledModelIds = useMemo(() => {
    if (!configData?.parsed) return null
    const config = configData.parsed as {
      agents?: { defaults?: { models?: Record<string, unknown> } }
    }
    const modelsMap = config?.agents?.defaults?.models
    if (!modelsMap || Object.keys(modelsMap).length === 0) return null // all enabled
    return new Set(Object.keys(modelsMap))
  }, [configData])

  const providers = useMemo(() => {
    if (!models) return []
    const set = new Set(models.map((m) => m.provider))
    return Array.from(set).sort()
  }, [models])

  const filtered = useMemo(() => {
    if (!models) return []
    const q = search.toLowerCase()
    return models.filter((m) => {
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false
      if (q && !m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [models, search, providerFilter])

  // Sort: enabled first, then alphabetically
  const sorted = useMemo(() => {
    if (!enabledModelIds) return filtered // all enabled, just sort alpha
    return [...filtered].sort((a, b) => {
      const aEnabled = enabledModelIds.has(a.id) || enabledModelIds.has(`${a.provider}/${a.id}`)
      const bEnabled = enabledModelIds.has(b.id) || enabledModelIds.has(`${b.provider}/${b.id}`)
      if (aEnabled !== bEnabled) return aEnabled ? -1 : 1
      return a.id.localeCompare(b.id)
    })
  }, [filtered, enabledModelIds])

  const enabledCount = useMemo(() => {
    if (!enabledModelIds || !models) return models?.length ?? 0
    return models.filter(
      (m) => enabledModelIds.has(m.id) || enabledModelIds.has(`${m.provider}/${m.id}`),
    ).length
  }, [models, enabledModelIds])

  const isEnabled = (model: { id: string; provider: string }) => {
    if (!enabledModelIds) return true
    return enabledModelIds.has(model.id) || enabledModelIds.has(`${model.provider}/${model.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-7 w-64" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">Models not available.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[0.625rem]">
          {enabledCount} enabled
        </Badge>
        <Badge variant="outline" className="text-[0.625rem] text-muted-foreground">
          {models?.length ?? 0} total
        </Badge>
        {!enabledModelIds && (
          <span className="text-[0.625rem] text-muted-foreground">
            No allowlist configured — all models enabled
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-64">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
        <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v ?? 'all')}>
          <SelectTrigger className="h-7 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No models match your filters.
        </div>
      ) : (
        <div className="rounded-md border bg-muted/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Model ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Context</TableHead>
                <TableHead className="text-center">Reasoning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((model) => {
                const enabled = isEnabled(model)
                return (
                  <TableRow key={model.id} className={cn(!enabled && 'opacity-40')}>
                    <TableCell className="pr-0">
                      {enabled && (
                        <span className="size-1.5 rounded-full bg-emerald-500 block" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[0.625rem]">{model.id}</TableCell>
                    <TableCell>{model.name}</TableCell>
                    <TableCell className="text-muted-foreground">{model.provider}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {model.contextWindow
                        ? `${(model.contextWindow / 1000).toFixed(0)}k`
                        : '--'}
                    </TableCell>
                    <TableCell className="text-center">
                      {model.reasoning && (
                        <CheckIcon className="size-3.5 text-emerald-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[0.625rem] text-muted-foreground">
        Showing {sorted.length} of {models?.length ?? 0} models.
        {enabledModelIds && ' Green dot = enabled in allowlist.'}
      </p>
    </div>
  )
}
