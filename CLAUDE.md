# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start Vite dev server with Electron
bun run build        # Typecheck + Vite build + electron-builder
bun run lint         # ESLint (zero warnings allowed)
bun run typecheck    # TypeScript type checking
bun run ci           # Lint + typecheck
bun run format       # Prettier formatting
```

**Always use `bun` as the package manager** (not npm/yarn/pnpm).

## Architecture

Electron desktop app (macOS vibrancy/hidden titlebar) with a React 19 frontend.

### Stack

- **Routing**: TanStack Router (file-based, memory history for Electron)
- **Server state**: TanStack React Query
- **IPC**: oRPC over MessagePort (client in renderer, server in main process)
- **UI**: Base-UI React primitives + shadcn/ui components (base-mira style) + Tailwind CSS 4
- **Styling**: CVA for component variants, `cn()` utility from `@/lib/utils`

### Key directories

- `src/routes/` — File-based routes, auto-generates `src/routeTree.gen.ts` (never edit)
- `src/components/ui/` — shadcn/ui components (add new ones via `bunx shadcn@latest add <name>`)
- `src/lib/` — Utilities and oRPC client setup
- `electron/` — Main process, preload script, and API definitions
- `electron/api/` — oRPC server router and procedures

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

The renderer creates a `MessageChannel` and sends one port to the main process. The oRPC client (`src/lib/orpc.ts`) uses `RPCLink` over this channel. Server-side procedures are defined in `electron/api/` with a context containing the `BrowserWindow` instance.

### Theming

CSS variables in oklch color space defined in `src/index.css`. Light/dark mode via `.dark` class toggled by the main process through `nativeTheme`. Electron-specific `app-region: drag` handles macOS titlebar dragging.
