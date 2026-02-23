# Contributing

## Running locally

```bash
bun install
bun run dev
```

That starts Vite + Electron with hot reload. You need macOS and Node 22+.

## Code style

- **Package manager**: always use `bun`. Never `npm`, `yarn`, or `pnpm`.
- **Linting**: ESLint with zero warnings allowed (`bun run lint`).
- **Formatting**: Prettier (`bun run format`). Formatting is checked in CI.
- **TypeScript**: strict mode. Run `bun run typecheck` before pushing.
- **CI shortcut**: `bun run ci` runs lint + typecheck together.

## Architecture overview

See [CLAUDE.md](CLAUDE.md) for a full breakdown of the architecture, key directories, and code patterns. The short version:

- **Main process** (`electron/`) owns all WebSocket connections, persistence, and device identity.
- **Renderer** (`src/`) is a React 19 SPA. It talks to the main process exclusively via oRPC over a `MessagePort`.
- **Routing**: TanStack Router, file-based. Routes live in `src/routes/`. `src/routeTree.gen.ts` is auto-generated — **never edit it manually**.
- **UI components**: shadcn/ui. Add new ones with `bunx shadcn@latest add <name>`, never copy-paste from shadcn docs.
- **Queries**: use `useQuery`/`useMutation` directly in components — no custom query hooks.

## PR process

1. Branch off `main`.
2. One feature or fix per PR — keep diffs focused.
3. `bun run ci` must pass (zero lint warnings, no type errors).
4. Keep commit messages clear and in the imperative mood.

## Key conventions

- **oRPC procedures**: defined in `electron/api/routers/`, use `zod/v4` for input validation.
- **Shared types**: all persistence, protocol, runtime, and domain types go in `electron/api/types.ts`.
- **Styling**: Tailwind CSS 4 utility classes + CVA for variants. Use the `cn()` utility from `@/lib/utils`.
- **Logging**: use the `Logger` interface from `electron/logger/` in main process code. Classes receive the logger via constructor injection; oRPC procedures access it via `context.logger`.
- **Do not** edit `src/routeTree.gen.ts` — it is regenerated automatically by TanStack Router on every dev server start.
