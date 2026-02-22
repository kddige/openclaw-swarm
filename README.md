# OpenClaw Swarm

A command center for managing your [OpenClaw Gateway](https://github.com/kddige/openclaw-gateway) deployments — a single pane of glass for monitoring sessions, streaming logs, and managing security across your AI agent infrastructure.

**Think Portainer, but for AI agent swarms.**

> [!NOTE]
> OpenClaw Swarm is in active development. The desktop app is the first milestone — a self-hostable web dashboard is next on the roadmap.

## Features

- **Multi-gateway management** — connect to any number of gateway instances and switch between them instantly
- **Live session monitoring** — see every active agent session with token usage and cost breakdown in real time
- **Streaming logs** — tail log output from any gateway with filtering, right from the app
- **Usage & cost charts** — token usage and cost trends over time
- **Security configuration** — push rate limits, allowed models, and access controls across your swarm
- **Swarm-wide search** — `Cmd+K` command palette to jump between gateways, sessions, and actions
- **Presence view** — see which agents are connected and active right now

## Requirements

- **macOS** — the desktop app currently targets macOS (Windows and Linux support planned)
- At least one running [OpenClaw Gateway](https://github.com/kddige/openclaw-gateway) instance to connect to

## Download

Grab the latest `.dmg` from the [Releases](https://github.com/kddige/openclaw-swarm/releases) page.

## Development

### Prerequisites

- Node 22+
- [proto](https://moonrepo.dev/proto) (installs the correct [Bun](https://bun.sh/) + [moon](https://moonrepo.dev/) versions automatically)

### Getting started

```bash
git clone https://github.com/kddige/openclaw-swarm.git
cd openclaw-swarm
proto use          # Install pinned bun + moon from .prototools
bun install        # Install all workspace dependencies
moon run swarm:dev # Start the Swarm app in dev mode
```

### Common tasks

```bash
moon run swarm:dev       # Start Swarm desktop app (Vite + Electron with hot reload)
moon run docs:dev        # Start docs site (localhost:3001)
moon run swarm:build     # Typecheck + Vite build + electron-builder
moon run swarm:lint      # ESLint (zero warnings allowed)
moon run swarm:typecheck # TypeScript type-check
moon ci                  # Run all affected tasks (CI mode)
moon run root:format     # Format all files (Prettier)
```

## Architecture

OpenClaw Swarm is an Electron desktop app with a React 19 frontend. The main process owns all WebSocket connections, persistence, and device identity. The renderer is a standard React SPA that communicates with the main process via [oRPC](https://orpc.unnoq.com/) over a `MessagePort`.

| Layer | Tech |
|---|---|
| Routing | TanStack Router (file-based) |
| Server state | TanStack React Query |
| IPC | oRPC over MessagePort |
| UI | shadcn/ui + Base UI + Tailwind CSS 4 |
| Persistence | electron-store with safeStorage encryption |
| Identity | Node native Ed25519 keypairs |
| Logging | Transport-agnostic structured logger (console, file, memory ring buffer) |

## Repository structure

This is a [Bun](https://bun.sh/) workspaces monorepo with [moon](https://moonrepo.dev/) as the task runner.

```
├── apps/
│   ├── swarm/           # Electron desktop app
│   │   ├── electron/    #   Main process, oRPC server, gateway connections
│   │   └── src/         #   React renderer (routes, components, hooks)
│   └── docs/            # Documentation site (Fumadocs + TanStack Start)
├── .moon/               # Moon workspace, toolchain, and task config
├── .prototools          # Pinned tool versions (bun, moon)
├── .prettierrc          # Shared Prettier config
└── package.json         # Workspace root
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, enforced lint rules, and PR guidelines.

A pre-commit hook runs lint and typecheck on staged files automatically — if it fails, fix before committing.

## License

[MIT](LICENSE)
