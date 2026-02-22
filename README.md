# openclaw-swarm

Monorepo for OpenClaw Swarm desktop app and tooling. Uses [moon](https://moonrepo.dev/) for task orchestration and [Bun](https://bun.sh/) workspaces for dependency management.

## Apps

| App | Description |
|---|---|
| [`apps/swarm`](apps/swarm) | Electron desktop app (macOS) for managing a swarm of [OpenClaw Gateway](https://github.com/kddige/openclaw-gateway) instances |
| [`apps/docs`](apps/docs) | Documentation site (Fumadocs + TanStack Start) |

## Requirements

- Node 22+
- macOS (vibrancy and native titlebar features are macOS-only)
- [Bun](https://bun.sh/)
- [moon](https://moonrepo.dev/docs/install) (task runner)

## Getting started

```bash
bun install              # Install all workspace dependencies
moon run swarm:dev       # Start the Swarm app in dev mode
```

## Common tasks

```bash
moon run swarm:dev       # Start Swarm desktop app
moon run docs:dev        # Start docs site (localhost:3001)
moon run swarm:build     # Build the Swarm app
moon run swarm:lint      # Lint
moon run swarm:typecheck # Type-check
moon ci                  # Run all affected tasks (CI mode)
moon run root:format     # Format all files (Prettier)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and PR guidelines.

## Repository structure

```
├── .moon/
│   ├── workspace.yml    # Moon workspace config (projects, VCS)
│   ├── toolchains.yml   # Moon toolchain config (bun)
│   └── tasks/           # Inherited tasks (lint, typecheck)
├── apps/
│   ├── swarm/           # OpenClaw Swarm desktop app
│   └── docs/            # Documentation site (Fumadocs + TanStack Start)
├── .prettierrc          # Shared Prettier config
├── moon.yml             # Root project (format task)
├── package.json         # Workspace root (bun workspaces)
└── CLAUDE.md            # AI coding guidelines
```
