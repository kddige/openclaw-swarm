# openclaw

Monorepo for OpenClaw desktop and tooling.

## Apps

| App | Description |
|---|---|
| [`apps/fleet`](apps/fleet) | Electron desktop app (macOS) for managing a fleet of [OpenClaw Gateway](https://github.com/kddige/openclaw-gateway) instances |

## Requirements

- Node 22+
- macOS (vibrancy and native titlebar features are macOS-only)
- [Bun](https://bun.sh/)

## Getting started

```bash
bun install          # Install all workspace dependencies
bun run --cwd apps/fleet dev   # Start the Fleet app in dev mode
```

## Formatting

Prettier is configured at the workspace root:

```bash
bun run format       # Format all files across the monorepo
```

## Repository structure

```
├── apps/
│   └── fleet/       # OpenClaw Fleet desktop app
├── .prettierrc      # Shared Prettier config
├── package.json     # Workspace root (bun workspaces)
└── CLAUDE.md        # AI coding guidelines
```
