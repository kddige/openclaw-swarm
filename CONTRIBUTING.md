# Contributing to OpenClaw Swarm

Thanks for your interest in contributing! This guide will help you get up and running.

## Prerequisites

- **Node 22+**
- **macOS** (vibrancy and native titlebar features are macOS-only)
- **[proto](https://moonrepo.dev/proto)** — toolchain manager (installs the correct bun + moon versions automatically)

Install proto, then from the repo root:

```bash
proto use        # Installs pinned versions of bun + moon from .prototools
```

## Getting started

```bash
git clone https://github.com/kddige/openclaw-swarm.git
cd openclaw-swarm
proto use
bun install
moon run swarm:dev
```

This starts Vite + Electron with hot reload. A pre-commit hook runs lint + typecheck on staged files automatically.

## Common tasks

```bash
moon run swarm:dev       # Start dev server with Electron
moon run swarm:build     # Typecheck + Vite build + electron-builder
moon run swarm:lint      # ESLint (zero warnings allowed)
moon run swarm:typecheck # TypeScript type-check
moon ci                  # Run all affected tasks (CI mode)
moon run root:format     # Prettier formatting (whole monorepo)
```

## Monorepo layout

```
├── .moon/               # moon workspace + toolchain config
│   ├── workspace.yml    # Projects, VCS hooks, pipeline
│   ├── toolchains.yml   # Bun toolchain
│   └── tasks/           # Inherited tasks (lint, typecheck)
├── apps/
│   ├── swarm/           # Electron desktop app
│   │   └── moon.yml     # Swarm-specific tasks (dev, build)
│   └── docs/            # Documentation site (Fumadocs + TanStack Start)
├── .prototools          # Pinned tool versions (moon, bun)
├── .editorconfig        # Editor formatting defaults
├── .prettierrc          # Shared Prettier config
└── package.json         # Bun workspaces root
```

## Enforced rules

ESLint is configured with custom rules that catch common mistakes **at lint time**. Every rule has a clear error message telling you exactly what to do instead. Zero warnings are allowed.

### Import restrictions

| Banned import | Use instead | Why |
|---|---|---|
| `from 'zod'` | `from 'zod/v4'` | We use Zod v4 API exclusively |
| `from 'clsx'` | `cn()` from `@/lib/utils` | Single utility for class merging |
| `from 'tailwind-merge'` | `cn()` from `@/lib/utils` | Same — `cn()` wraps both |

### No custom query hooks

`useQuery`, `useMutation`, `useInfiniteQuery`, and `useSuspenseQuery` **must not** be wrapped in custom hooks. Use them directly in components with `orpc.*.queryOptions()`:

```tsx
// Good — direct in component
function GatewayList() {
  const { data } = useQuery(orpc.gateway.list.queryOptions())
  // ...
}

// Bad — custom hook wrapper (ESLint will block this in src/hooks/)
function useGateways() {
  return useQuery(orpc.gateway.list.queryOptions())
}
```

This keeps query keys colocated, makes invalidation obvious, and avoids unnecessary abstraction.

### No `React.FC`

Use plain function components with typed props:

```tsx
// Good
function StatusBadge(props: StatusBadgeProps) { ... }

// Bad — ESLint will block this
const StatusBadge: React.FC<StatusBadgeProps> = (props) => { ... }
```

### No `console.*` in Electron code

All logging in `electron/` must go through the `Logger` interface from `electron/logger/`. Classes receive the logger via constructor injection; oRPC procedures access it via `context.logger`. Three transports run simultaneously: console (dev only), file (NDJSON with rotation), and memory (ring buffer for in-app viewer).

```tsx
// In classes — use the injected logger
this.logger.info('connected', { gatewayId })
this.logger.error('request failed', err.message)

// Child loggers for sub-components
const childLogger = this.logger.child('conn')

// In oRPC procedures
context.logger.info('handling request')
```

## Architecture overview

See [CLAUDE.md](CLAUDE.md) for a full breakdown. The short version:

- **Main process** (`apps/swarm/electron/`) owns all WebSocket connections, persistence, and device identity.
- **Renderer** (`apps/swarm/src/`) is a React 19 SPA. It talks to the main process exclusively via oRPC over a `MessagePort`.
- **Routing**: TanStack Router, file-based. Routes live in `src/routes/`. `src/routeTree.gen.ts` is auto-generated — **never edit it manually**.
- **UI components**: shadcn/ui. Add new ones with `bunx shadcn@latest add <name>`, never copy-paste from shadcn docs.
- **Styling**: Tailwind CSS 4 + CVA. Always use `cn()` from `@/lib/utils` for class merging.

## PR process

1. Branch off `main`.
2. One feature or fix per PR — keep diffs focused.
3. The pre-commit hook runs lint + typecheck on staged files. If it fails, fix before committing.
4. `moon ci` must pass (zero lint warnings, no type errors).
5. Keep commit messages clear and in the imperative mood.
