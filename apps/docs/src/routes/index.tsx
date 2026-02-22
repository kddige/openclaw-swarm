import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/lib/layout.shared'
import {
  Monitor,
  Activity,
  Shield,
  Search,
  Terminal,
  Zap,
  GitBranch,
  ArrowRight,
  Radio,
  Users,
} from 'lucide-react'
import logo from '../../assets/logo.png'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div
        className="noise relative bg-fd-background text-fd-foreground"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Hero />
        <div className="hr-glow mx-auto max-w-5xl" />
        <Features />
        <div className="hr-glow mx-auto max-w-5xl" />
        <TerminalDemo />
        <div className="hr-glow mx-auto max-w-5xl" />
        <Architecture />
        <GetStarted />
      </div>
    </HomeLayout>
  )
}

/* ── Hero ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="landing-grid relative overflow-hidden">
      <div className="landing-glow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-32">
        {/* Logo */}
        <img
          src={logo}
          alt="OpenClaw Swarm"
          className="animate-fade-up mb-8 size-16 drop-shadow-lg md:size-20"
          style={{ animationDelay: '0s' }}
        />

        {/* Status bar */}
        <div
          className="animate-fade-up mb-10 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-1.5"
          style={{
            animationDelay: '0.05s',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
          }}
        >
          <span
            className="pulse-dot inline-block size-2 rounded-full"
            style={{ background: '#22c55e' }}
          />
          <span className="text-fd-muted-foreground">
            v0.1.0 &middot; Open Source
          </span>
        </div>

        {/* Title */}
        <h1
          className="animate-fade-up mb-6 text-6xl font-extrabold leading-[1.05] tracking-tight md:text-8xl"
          style={{
            animationDelay: '0.1s',
            fontFamily: 'var(--font-display)',
          }}
        >
          Your AI swarm.
          <br />
          <span className="text-gradient">One command center.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up mb-12 max-w-xl text-lg leading-relaxed text-fd-muted-foreground md:text-xl"
          style={{ animationDelay: '0.2s' }}
        >
          A native macOS desktop app to monitor sessions, stream logs, and
          manage security across every OpenClaw Gateway in your
          infrastructure. Think{' '}
          <strong className="text-fd-foreground">Portainer</strong>,
          but for AI agent swarms.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up flex flex-wrap gap-4"
          style={{ animationDelay: '0.3s' }}
        >
          <a
            href="https://github.com/kddige/openclaw-swarm/releases"
            className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ background: 'var(--landing-accent)' }}
          >
            Download for macOS
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            to="/docs/$"
            params={{ _splat: 'guide' }}
            className="glow-border inline-flex items-center gap-2 rounded-lg border border-fd-border px-6 py-3 text-sm font-medium text-fd-muted-foreground transition-colors"
          >
            Read the Docs
          </Link>
        </div>

        {/* Swarm preview */}
        <div
          className="animate-fade-up mt-20 overflow-hidden rounded-xl border border-fd-border bg-fd-card"
          style={{ animationDelay: '0.5s' }}
        >
          <SwarmPreview />
        </div>
      </div>
    </section>
  )
}

/* ── Swarm Preview (mock UI) ──────────────────────────────────────── */

function SwarmPreview() {
  const gateways = [
    { name: 'gw-prod-us-east', status: 'connected', sessions: 47, agents: 12 },
    { name: 'gw-prod-eu-west', status: 'connected', sessions: 31, agents: 8 },
    { name: 'gw-staging', status: 'connecting', sessions: 3, agents: 2 },
    { name: 'gw-dev-local', status: 'disconnected', sessions: 0, agents: 0 },
  ]

  const statusColor: Record<string, string> = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    disconnected: '#71717a',
  }

  return (
    <div className="scan-line relative">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-fd-border px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-red-500/80" />
          <span className="size-3 rounded-full bg-yellow-500/80" />
          <span className="size-3 rounded-full bg-green-500/80" />
        </div>
        <span
          className="ml-2 text-xs text-fd-muted-foreground"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          OpenClaw Swarm &mdash; 4 gateways
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className="border-b border-fd-border text-fd-muted-foreground"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
              }}
            >
              <th className="px-4 py-3 font-medium uppercase tracking-wider">Gateway</th>
              <th className="px-4 py-3 font-medium uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wider">Sessions</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wider">Agents</th>
            </tr>
          </thead>
          <tbody>
            {gateways.map((gw) => (
              <tr
                key={gw.name}
                className="border-b border-fd-border/50 transition-colors"
              >
                <td
                  className="px-4 py-3 text-fd-foreground"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                >
                  {gw.name}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span
                      className={`inline-block size-1.5 rounded-full ${gw.status === 'connected' ? 'pulse-dot' : ''}`}
                      style={{ background: statusColor[gw.status] }}
                    />
                    <span className="text-fd-muted-foreground">
                      {gw.status}
                    </span>
                  </span>
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums text-fd-foreground"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                >
                  {gw.sessions}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums text-fd-foreground"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                >
                  {gw.agents}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Features ──────────────────────────────────────────────────────── */

const features = [
  {
    icon: Monitor,
    title: 'Multi-Gateway Management',
    description:
      'Connect to any number of OpenClaw Gateway instances from a single desktop app. Switch between deployments instantly.',
  },
  {
    icon: Activity,
    title: 'Live Session Monitoring',
    description:
      'Real-time view of every active agent session. Token usage, cost breakdowns, and chat history at a glance.',
  },
  {
    icon: Terminal,
    title: 'Streaming Logs',
    description:
      'Tail logs from any gateway in real-time with powerful filtering. No more SSH-ing into individual machines.',
  },
  {
    icon: Shield,
    title: 'Security Configuration',
    description:
      'Push security policy changes across your entire swarm. Rate limits, allowed models, and access controls.',
  },
  {
    icon: Search,
    title: 'Swarm-Wide Search',
    description:
      'Cmd+K command palette for jumping between gateways, sessions, and actions across your entire infrastructure.',
  },
  {
    icon: Users,
    title: 'Presence View',
    description:
      'See which agents are connected and active right now. Real-time presence powered by WebSocket event streaming.',
  },
]

function Features() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 max-w-2xl">
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{
            color: 'var(--landing-accent)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Features
        </p>
        <h2
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Everything you need to
          <br />
          manage your swarm
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glow-border dot-grid group relative overflow-hidden rounded-xl border border-fd-border bg-fd-card p-6"
          >
            <div className="mb-4 inline-flex rounded-lg border border-fd-border bg-fd-muted p-2.5">
              <f.icon
                className="size-5"
                style={{ color: 'var(--landing-accent)' }}
              />
            </div>
            <h3
              className="mb-2 text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-fd-muted-foreground">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Terminal Demo ─────────────────────────────────────────────────── */

function TerminalDemo() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p
            className="mb-3 text-xs font-medium uppercase tracking-widest"
            style={{
              color: 'var(--landing-accent)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Developer experience
          </p>
          <h2
            className="mb-6 text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Up and running
            <br />
            in 30 seconds
          </h2>
          <p className="mb-8 max-w-md leading-relaxed text-fd-muted-foreground">
            Clone, install, run. The monorepo uses{' '}
            <strong className="text-fd-foreground">proto</strong> to pin exact
            versions of bun and moon, so every contributor gets an identical
            setup.
          </p>

          <div className="flex flex-wrap gap-6">
            <Stat label="Package Manager" value="Bun" />
            <Stat label="Task Runner" value="moon" />
            <Stat label="Framework" value="React 19" />
          </div>
        </div>

        {/* Terminal */}
        <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          <div className="flex items-center gap-2 border-b border-fd-border px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
            </div>
            <span
              className="ml-2 text-xs text-fd-muted-foreground"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              terminal
            </span>
          </div>
          <div
            className="p-5 text-sm leading-7 text-fd-foreground"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
          >
            <Line prompt text="git clone https://github.com/kddige/openclaw-swarm.git" />
            <Line prompt text="cd openclaw-swarm" />
            <Line prompt text="proto use" />
            <Line muted text="  moon 2.0.1 installed" />
            <Line muted text="  bun 1.3.9 installed" />
            <Line prompt text="bun install" />
            <Line prompt text="moon run swarm:dev" />
            <div style={{ color: '#22c55e' }}>
              {'  '}VITE v7.3.1{'  '}ready in 826ms
            </div>
            <span
              className="cursor-blink inline-block"
              style={{
                width: '8px',
                height: '16px',
                background: 'var(--landing-accent)',
                verticalAlign: 'middle',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function Line({
  prompt,
  muted,
  text,
}: {
  prompt?: boolean
  muted?: boolean
  text: string
}) {
  return (
    <div className={muted ? 'text-fd-muted-foreground' : ''}>
      {prompt && (
        <span style={{ color: 'var(--landing-accent)' }}>$ </span>
      )}
      {text}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-fd-muted-foreground"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-lg font-bold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </div>
    </div>
  )
}

/* ── Architecture ──────────────────────────────────────────────────── */

function Architecture() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 text-center">
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{
            color: 'var(--landing-accent)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Architecture
        </p>
        <h2
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Built on oRPC over MessagePort
        </h2>
      </div>

      <div className="flex justify-center">
        <div className="grid gap-4 md:grid-cols-3">
          <ArchCard
            icon={<Zap className="size-5" />}
            title="Renderer"
            subtitle="React 19 SPA"
            items={['TanStack Router', 'TanStack Query', 'oRPC Client', 'shadcn/ui']}
          />
          <ArchCard
            icon={<Radio className="size-5" />}
            title="IPC Layer"
            subtitle="MessagePort"
            items={['oRPC over MessagePort', 'Type-safe procedures', 'Event streaming', 'Zod v4 validation']}
            accent
          />
          <ArchCard
            icon={<Shield className="size-5" />}
            title="Main Process"
            subtitle="Electron + Node.js"
            items={['GatewayManager', 'WebSocket connections', 'electron-store', 'Ed25519 identity']}
          />
        </div>
      </div>
    </section>
  )
}

function ArchCard({
  icon,
  title,
  subtitle,
  items,
  accent,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  items: string[]
  accent?: boolean
}) {
  return (
    <div
      className="glow-border rounded-xl border p-6"
      style={{
        borderColor: accent
          ? 'var(--landing-accent-dim)'
          : 'var(--color-fd-border)',
        background: accent
          ? 'color-mix(in srgb, var(--landing-accent) 5%, var(--color-fd-card))'
          : 'var(--color-fd-card)',
      }}
    >
      <div
        className="mb-4 inline-flex rounded-lg border p-2.5"
        style={{
          borderColor: accent
            ? 'var(--landing-accent-dim)'
            : 'var(--color-fd-border)',
          background: accent
            ? 'color-mix(in srgb, var(--landing-accent) 10%, var(--color-fd-muted))'
            : 'var(--color-fd-muted)',
          color: 'var(--landing-accent)',
        }}
      >
        {icon}
      </div>
      <h3
        className="text-sm font-semibold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      <p
        className="mb-4 text-xs text-fd-muted-foreground"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {subtitle}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm text-fd-muted-foreground"
          >
            <span
              className="inline-block size-1 rounded-full"
              style={{ background: 'var(--landing-accent)' }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Get Started CTA ───────────────────────────────────────────────── */

function GetStarted() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-32 pt-24">
      <div className="glow-border relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card p-12 text-center md:p-16">
        <div className="landing-glow pointer-events-none absolute inset-0" />

        <div className="relative">
          <h2
            className="mb-4 text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to take control?
          </h2>
          <p className="mx-auto mb-8 max-w-md leading-relaxed text-fd-muted-foreground">
            OpenClaw Swarm is open source and free. Download the app or start
            contributing to the codebase.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/kddige/openclaw-swarm/releases"
              className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'var(--landing-accent)' }}
            >
              Download for macOS
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link
              to="/docs/$"
              params={{ _splat: 'developers' }}
              className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-6 py-3 text-sm font-medium text-fd-muted-foreground transition-colors"
            >
              <GitBranch className="size-4" />
              Start Contributing
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
