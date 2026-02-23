import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { LayoutDashboardIcon, Loader2Icon, PlusIcon, ServerIcon, TerminalIcon } from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // Debounce input → query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(inputValue.trim()), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Open on custom window event dispatched by sidebar
  useEffect(() => {
    function handleOpenEvent() {
      setOpen(true)
    }
    window.addEventListener('open-command-palette', handleOpenEvent)
    return () => window.removeEventListener('open-command-palette', handleOpenEvent)
  }, [])

  // Reset state when dialog closes
  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      setInputValue('')
      setQuery('')
    }
  }

  const { data, isFetching } = useQuery({
    ...orpc.swarm.search.queryOptions({ input: { query } }),
    enabled: query.length > 0,
  })

  function runAndClose(fn: () => void) {
    fn()
    setOpen(false)
  }

  const sessions = data?.sessions ?? []
  const agents = data?.agents ?? []

  // Group sessions by gateway
  const sessionsByGateway = sessions.reduce<
    Record<
      string,
      { gatewayId: string; gatewayLabel: string; key: string; displayName: string | null }[]
    >
  >((acc, s) => {
    const group = acc[s.gatewayId] ?? []
    group.push(s)
    acc[s.gatewayId] = group
    return acc
  }, {})

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search sessions, agents, or actions..."
          value={inputValue}
          onValueChange={setInputValue}
        />
        <CommandList>
          {/* Quick Actions — always visible */}
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runAndClose(() => navigate({ to: '/dashboard' }))}>
              <LayoutDashboardIcon />
              Swarm Dashboard
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runAndClose(() => navigate({ to: '/dashboard/gateways' }))}
            >
              <PlusIcon />
              Add Gateway
            </CommandItem>
          </CommandGroup>

          {/* Search results — only when a query is entered */}
          {query.length > 0 && (
            <>
              <CommandSeparator />

              {isFetching && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Searching...
                </div>
              )}

              {!isFetching && sessions.length === 0 && agents.length === 0 && (
                <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
              )}

              {!isFetching &&
                Object.entries(sessionsByGateway).map(([gatewayId, gatewaySessions]) => (
                  <CommandGroup
                    key={gatewayId}
                    heading={`Sessions — ${gatewaySessions[0].gatewayLabel}`}
                  >
                    {gatewaySessions.map((session) => (
                      <CommandItem
                        key={`${gatewayId}:${session.key}`}
                        value={`${gatewayId}:${session.key}`}
                        onSelect={() =>
                          runAndClose(() =>
                            navigate({
                              to: '/dashboard/gateways/$gatewayId/sessions/$sessionKey',
                              params: { gatewayId, sessionKey: session.key },
                            }),
                          )
                        }
                      >
                        <TerminalIcon />
                        <span className="truncate">{session.displayName ?? session.key}</span>
                        <span className="ml-auto font-mono text-[0.625rem] text-muted-foreground truncate max-w-24">
                          {session.key}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

              {!isFetching && agents.length > 0 && (
                <CommandGroup heading="Agents">
                  {agents.map((agent) => (
                    <CommandItem
                      key={`${agent.gatewayId}:${agent.id}`}
                      value={`agent:${agent.gatewayId}:${agent.id}`}
                      onSelect={() =>
                        runAndClose(() =>
                          navigate({
                            to: '/dashboard/gateways/$gatewayId',
                            params: { gatewayId: agent.gatewayId },
                          }),
                        )
                      }
                    >
                      <ServerIcon />
                      <span className="truncate">{agent.id}</span>
                      <span className="ml-1 text-muted-foreground truncate text-[0.625rem]">
                        {agent.gatewayLabel}
                      </span>
                      {agent.isDefault && (
                        <span className="ml-auto text-[0.625rem] text-muted-foreground">
                          default
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
