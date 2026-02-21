# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

This is a **bun workspaces** monorepo. No monorepo management tool (turborepo, nx, etc.) is used — just bun's native workspace support.

```
├── apps/
│   └── fleet/       # OpenClaw Fleet — Electron desktop app
├── .prettierrc      # Shared Prettier config (root-level)
├── .prettierignore  # Shared Prettier ignore (root-level)
└── package.json     # Workspace root
```

**Always use `bun` as the package manager** (not npm/yarn/pnpm).

## Commands

### Root-level

```bash
bun install          # Install all workspace dependencies
bun run format       # Prettier formatting (whole monorepo)
```

### Fleet app (`apps/fleet/`)

```bash
bun run --cwd apps/fleet dev          # Start Vite dev server with Electron
bun run --cwd apps/fleet build        # Typecheck + Vite build + electron-builder
bun run --cwd apps/fleet lint         # ESLint (zero warnings allowed)
bun run --cwd apps/fleet typecheck    # TypeScript type checking
bun run --cwd apps/fleet ci           # Lint + typecheck
```

## Fleet app architecture

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

All paths below are relative to `apps/fleet/`:

- `src/routes/` — File-based routes, auto-generates `src/routeTree.gen.ts` (never edit)
- `src/components/ui/` — shadcn/ui components (add new ones via `bunx shadcn@latest add <name>`)
- `src/lib/` — Utilities and oRPC client setup
- `electron/` — Main process, preload script, and API definitions
- `electron/api/` — oRPC server router and procedures
- `electron/api/routers/` — Individual oRPC router files (gateway, fleet, events, window)
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
useQuery(orpc.events.subscribe.experimental_streamedOptions({
  queryFnOptions: { refetchMode: 'replace' },
}))
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

### Debug logging

`electron/lib/debug.ts` provides a dev-only logger. Logs only appear when `VITE_DEV_SERVER_URL` is set (i.e. `bun run dev`):

```tsx
import { createDebugLogger } from '../lib/debug'
const debug = createDebugLogger('my:namespace')
debug.log('message', data)    // Only logs in dev
debug.error('failed:', err)   // Only logs in dev
```
