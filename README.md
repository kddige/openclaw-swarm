# hucomm-fleet

Electron desktop app (macOS) for managing a fleet of [OpenClaw Gateway](https://github.com/hucomm/openclaw-gateway) instances.

## What is this?

hucomm-fleet is a native macOS desktop application that gives you a single pane of glass across all your OpenClaw Gateway deployments. Think Portainer, but for AI agent infrastructure.

**Features:**

- **Multi-gateway management** — connect to and monitor any number of gateway instances simultaneously
- **Session monitoring** — live view of active agent sessions across the fleet
- **Real-time logs** — streaming log output per gateway, with filtering
- **Usage & cost charts** — token usage and cost breakdowns over time (Recharts)
- **Security config** — execute security configuration changes fleet-wide
- **Fleet-wide search** — `Cmd+K` command palette for jumping between gateways, sessions, and actions
- **Presence view** — see which agents are connected and active right now

## Stack

| Layer | Technology |
|---|---|
| Shell | Electron (macOS — vibrancy + hidden titlebar) |
| Frontend | React 19 |
| Routing | TanStack Router (file-based, memory history) |
| Server state | TanStack Query |
| IPC | oRPC over MessagePort |
| UI components | shadcn/ui (base-mira style) + Base UI primitives |
| Styling | Tailwind CSS 4, CVA |
| Persistence | electron-store (safeStorage encryption) |
| Package manager | Bun |

## Requirements

- Node 22+
- macOS (vibrancy and native titlebar features are macOS-only)
- [Bun](https://bun.sh/)

## Dev setup

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

This runs `tsc` + Vite build + `electron-builder` and produces a distributable macOS app in `release/`.

## Architecture

The main process owns all WebSocket connections to remote gateways via `GatewayManager`. The renderer never talks to the network directly. Instead it communicates with the main process through oRPC procedures exposed over a `MessagePort` (established at startup via the preload script).

```
Renderer (React)
  └── oRPC client (MessagePort)
        └── Main process (oRPC server)
              └── GatewayManager
                    └── WebSocket connections → OpenClaw Gateways
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture notes, conventions, and code patterns.
