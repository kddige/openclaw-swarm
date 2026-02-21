# Contributing to OpenClaw

Thanks for your interest in contributing! This guide will help you get up and running.

## Prerequisites

- **Node 22+**
- **macOS** (vibrancy and native titlebar features are macOS-only)
- **[Bun](https://bun.sh/)** — always use `bun` as the package manager. Never `npm`, `yarn`, or `pnpm`.
- **[moon](https://moonrepo.dev/docs/install)** — task runner for the monorepo

## Getting started

```bash
git clone https://github.com/kddige/openclaw-fleet.git
cd openclaw-fleet
bun install
moon run fleet:dev
```

This starts Vite + Electron with hot reload.

## Common tasks

```bash
moon run fleet:dev       # Start dev server with Electron
moon run fleet:build     # Typecheck + Vite build + electron-builder
moon run fleet:lint      # ESLint (zero warnings allowed)
moon run fleet:typecheck # TypeScript type-check
moon ci                  # Run all affected tasks (CI mode)
moon run root:format     # Prettier formatting (whole monorepo)
```

## Monorepo layout

```
├── .moon/               # moon workspace + toolchain config
│   ├── workspace.yml
│   ├── toolchains.yml
│   └── tasks/           # Inherited task definitions (lint, typecheck)
├── apps/
│   └── fleet/           # Electron desktop app
│       └── moon.yml     # Fleet-specific tasks (dev, build)
├── .prettierrc          # Shared Prettier config
└── package.json         # Bun workspaces root
```

## Code style

- **Linting**: ESLint with zero warnings allowed. Configured in `apps/fleet/eslint.config.js`.
- **Formatting**: Prettier. Config lives at the monorepo root (`.prettierrc`).
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`.
- All three are enforced in CI via `moon ci`.

## Architecture overview

See [CLAUDE.md](CLAUDE.md) for a full breakdown. The short version:

- **Main process** (`apps/fleet/electron/`) owns all WebSocket connections, persistence, and device identity.
- **Renderer** (`apps/fleet/src/`) is a React 19 SPA. It talks to the main process exclusively via oRPC over a `MessagePort`.
- **Routing**: TanStack Router, file-based. Routes live in `src/routes/`. `src/routeTree.gen.ts` is auto-generated — **never edit it manually**.
- **UI components**: shadcn/ui. Add new ones with `bunx shadcn@latest add <name>`, never copy-paste from shadcn docs.
- **Queries**: use `useQuery`/`useMutation` directly in components — no custom query hooks.

## PR process

1. Branch off `main`.
2. One feature or fix per PR — keep diffs focused.
3. `moon ci` must pass (zero lint warnings, no type errors).
4. Keep commit messages clear and in the imperative mood.

## Key conventions

- **oRPC procedures**: defined in `electron/api/routers/`, use `zod/v4` for input validation.
- **Shared types**: all persistence, protocol, runtime, and domain types go in `electron/api/types.ts`.
- **Styling**: Tailwind CSS 4 utility classes + CVA for variants. Use the `cn()` utility from `@/lib/utils`.
- **Debug logging**: use `createDebugLogger` from `electron/lib/debug.ts` in main process code — logs only appear in dev.
- **Do not** edit `src/routeTree.gen.ts` — it is regenerated automatically by TanStack Router.
