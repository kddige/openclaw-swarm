# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

This is a **bun workspaces** monorepo with **moon** as the task runner.

```
├── .moon/
│   ├── workspace.yml    # Projects, VCS, pipeline settings
│   ├── toolchains.yml   # Bun toolchain config
│   └── tasks/
│       └── typescript.yml  # Inherited tasks (lint, typecheck) for all TS projects
├── apps/
│   ├── swarm/           # OpenClaw Swarm — Electron desktop app
│   │   └── moon.yml     # Swarm-specific tasks (dev, build)
│   └── docs/            # Documentation site (Fumadocs + TanStack Start)
│       └── moon.yml     # Docs tasks (dev, build)
├── .prettierrc          # Shared Prettier config (root-level)
├── .prettierignore      # Shared Prettier ignore (root-level)
├── moon.yml             # Root project (format task)
└── package.json         # Workspace root
```

**Always use `bun` as the package manager** (not npm/yarn/pnpm).

## Commands

### moon tasks (preferred)

```bash
moon run swarm:dev       # Start Vite dev server with Electron
moon run swarm:build     # Typecheck + Vite build + electron-builder
moon run swarm:lint      # ESLint (zero warnings allowed)
moon run swarm:typecheck # TypeScript type checking
moon ci                  # Run all affected tasks (native moon CI command)
moon run root:format     # Prettier formatting (whole monorepo)
```

Lint and typecheck are inherited from `.moon/tasks/typescript.yml` — do not redefine them in project `moon.yml` files.

### Direct bun commands (fallback)

```bash
bun install              # Install all workspace dependencies
bun run --cwd apps/swarm dev
bun run --cwd apps/swarm build
bun run format           # Root-level prettier
```

## Enforced ESLint rules

These rules are enforced at lint time with zero warnings allowed. Breaking any of them will fail the pre-commit hook and CI.

- **`from 'zod'` is banned** — always import from `zod/v4`
- **`from 'clsx'` and `from 'tailwind-merge'` are banned in src/** — use `cn()` from `@/lib/utils`
- **`React.FC` / `React.FunctionComponent` are banned** — use plain function components with typed props
- **`console.*` is banned in `electron/`** — use the injected `Logger` from `electron/logger`
- **`useQuery`/`useMutation` are banned in `src/hooks/`** — use them directly in components with `orpc.*.queryOptions()`

## Swarm app architecture

Electron desktop app (macOS vibrancy/hidden titlebar) with a React 19 frontend.

### Stack

- **Routing**: TanStack Router (file-based, memory history for Electron)
- **Server state**: TanStack React Query
- **IPC**: oRPC over MessagePort (client in renderer, server in main process)
- **UI**: Base-UI React primitives + shadcn/ui components (base-mira style) + Tailwind CSS 4
- **Styling**: CVA for component variants, `cn()` utility from `@/lib/utils`
- **Gateway connections**: WebSocket (ws) in main process, exposed via oRPC procedures
- **Persistence**: electron-store with safeStorage encryption
- **Crypto**: Node native Ed25519 for device identity

### Key directories

All paths below are relative to `apps/swarm/`:

- `src/routes/` — File-based routes, auto-generates `src/routeTree.gen.ts` (never edit)
- `src/components/ui/` — shadcn/ui components (add new ones via `bunx shadcn@latest add <name>`)
- `src/lib/` — Utilities and oRPC client setup
- `electron/` — Main process, preload script, and API definitions
- `electron/api/` — oRPC server router and procedures
- `electron/api/routers/` — Individual oRPC router files (gateway, swarm, events, window)
- `electron/api/types.ts` — All shared TypeScript types (persistence, protocol, runtime, domain)
- `electron/gateway/` — WebSocket connection layer (protocol, connection, manager)
- `electron/lib/` — Utilities (debug logger)
- `electron/store.ts` — electron-store persistence
- `electron/device-identity.ts` — Ed25519 keypair generation + challenge signing

### Route pattern

Routes use TanStack Router's file-based convention. Each route exports a `Route` const:

```tsx
export const Route = createFileRoute('/dashboard/example/')({
  component: ExamplePage,
})
function ExamplePage() { ... }
```

The dashboard layout (`/dashboard/route.tsx`) provides the sidebar and renders child routes via `<Outlet />`.

### oRPC IPC pattern

The renderer creates a `MessageChannel` and sends one port to the main process. The oRPC client (`src/lib/orpc.ts`) uses `RPCLink` over this channel. Server-side procedures are defined in `electron/api/routers/` with a context containing `{ win: BrowserWindow, gatewayManager: GatewayManager }`.

**Do NOT create custom hooks for queries.** Always use queries and mutations directly in components:

```tsx
// Queries
useQuery(orpc.gateway.list.queryOptions())
useQuery(orpc.gateway.get.queryOptions({ input: { id: gatewayId } }))

// Mutations
useMutation(orpc.gateway.add.mutationOptions())

// Event streaming (real-time updates from main process)
useQuery(
  orpc.events.subscribe.experimental_streamedOptions({
    queryFnOptions: { refetchMode: 'replace' },
  }),
)
```

**Procedure definitions** use zod/v4 for input validation:

```tsx
import { z } from 'zod/v4'
import { p } from '../orpc'

export const exampleRouter = {
  get: p.input(z.object({ id: z.string() })).handler(({ input, context }) => {
    return context.gatewayManager.getGateway(input.id)
  }),
}
```

**Event streaming** uses `EventPublisher` from `@orpc/shared` with async generator handlers:

```tsx
import { EventPublisher } from '@orpc/shared'

// Server-side: async generator that yields events
export const eventsRouter = {
  subscribe: p.handler(async function* ({ context, signal }) {
    for await (const event of publisher.subscribe('eventName', { signal })) {
      yield event
    }
  }),
}
```

### Theming

CSS variables in oklch color space defined in `src/index.css`. Light/dark mode via `.dark` class toggled by the main process through `nativeTheme`. Electron-specific `app-region: drag` handles macOS titlebar dragging.

### UI patterns

- **Card styling**: `bg-muted/40` with `hover:bg-muted/60` for interactive cards
- **Status dots**: `size-1.5 rounded-full` with color (emerald=connected, amber=connecting, blue=pairing, destructive=auth-failed, muted-foreground/50=disconnected)
- **Stat labels**: `text-[0.625rem] font-medium text-muted-foreground uppercase tracking-wider`
- **Page layout**: `p-6` padding, `gap-3`/`gap-4` between elements
- **Headings**: `text-sm font-semibold` for page titles, `text-xs font-medium` for section headers
- **Monospace IDs**: `font-mono text-[0.625rem]` for keys, device IDs, session keys
- **Tabular numbers**: `tabular-nums` class on all numeric displays (costs, tokens, stats)
- **Empty states**: Use `Empty` + `EmptyHeader` + `EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`
- **Loading states**: `Skeleton` components matching the layout of loaded content
- **Badge statuses**: `Badge variant="outline"` with a colored dot span inside for status indicators
- **Tables**: shadcn `Table` components, `text-right` for numeric columns

### Logging

`electron/logger/` provides a transport-agnostic logger. Classes receive the logger via constructor injection; oRPC procedures access it via `context.logger`. Direct `console.*` is banned by ESLint.

```tsx
// In classes — use the injected logger
this.logger.info('connected', { gatewayId })
this.logger.error('request failed', err.message)

// Child loggers for sub-components
const childLogger = this.logger.child('conn')

// In oRPC procedures
context.logger.info('handling request')
```

Three transports run simultaneously: console (dev only, colored), file (NDJSON with rotation at `app.getPath('logs')`), and memory (1000-entry ring buffer for in-app viewer). Namespaces: `main`, `gw`, `gw:conn`, `gw:protocol`.
