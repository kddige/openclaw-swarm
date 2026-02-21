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

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div
        className="noise relative"
        style={{
          background: 'var(--landing-bg)',
          color: 'var(--landing-text)',
          fontFamily: 'var(--font-body)',
        }}
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
        {/* Status bar */}
        <div
          className="animate-fade-up mb-10 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{
            animationDelay: '0s',
            borderColor: 'var(--landing-border)',
            background: 'var(--landing-surface)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
          }}
        >
          <span
            className="pulse-dot inline-block size-2 rounded-full"
            style={{ background: '#22c55e' }}
          />
          <span style={{ color: 'var(--landing-text-muted)' }}>
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
          Your AI fleet.
          <br />
          <span className="text-gradient">One command center.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up mb-12 max-w-xl text-lg leading-relaxed md:text-xl"
          style={{
            animationDelay: '0.2s',
            color: 'var(--landing-text-muted)',
          }}
        >
          Monitor sessions, stream logs, and manage security across every
          OpenClaw Gateway in your infrastructure. Think{' '}
          <strong style={{ color: 'var(--landing-text)' }}>Portainer</strong>,
          but for AI agent fleets.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up flex flex-wrap gap-4"
          style={{ animationDelay: '0.3s' }}
        >
          <Link
            to="/docs/$"
            params={{ _splat: '' }}
            className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:brightness-110"
            style={{
              background: 'var(--landing-accent)',
              color: 'var(--landing-bg)',
            }}
          >
            Get Started
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/kddige/openclaw-fleet"
            className="glow-border inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
            style={{
              borderColor: 'var(--landing-border)',
              color: 'var(--landing-text-muted)',
            }}
          >
            <GitBranch className="size-4" />
            View on GitHub
          </a>
        </div>

        {/* Fleet preview */}
        <div
          className="animate-fade-up mt-20 overflow-hidden rounded-xl border"
          style={{
            animationDelay: '0.5s',
            borderColor: 'var(--landing-border)',
            background: 'var(--landing-surface)',
          }}
        >
          <FleetPreview />
        </div>
      </div>
    </section>
  )
}

/* ── Fleet Preview (mock UI) ──────────────────────────────────────── */

function FleetPreview() {
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
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--landing-border)' }}
      >
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-red-500/80" />
          <span className="size-3 rounded-full bg-yellow-500/80" />
          <span className="size-3 rounded-full bg-green-500/80" />
        </div>
        <span
          className="ml-2 text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--landing-text-muted)',
          }}
        >
          OpenClaw Fleet &mdash; 4 gateways
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className="border-b text-xs uppercase tracking-wider"
              style={{
                borderColor: 'var(--landing-border)',
                color: 'var(--landing-text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
              }}
            >
              <th className="px-4 py-3 font-medium">Gateway</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Sessions</th>
              <th className="px-4 py-3 text-right font-medium">Agents</th>
            </tr>
          </thead>
          <tbody>
            {gateways.map((gw) => (
              <tr
                key={gw.name}
                className="border-b transition-colors"
                style={{
                  borderColor: 'rgba(63, 63, 70, 0.5)',
                }}
              >
                <td
                  className="px-4 py-3"
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
                    <span style={{ color: 'var(--landing-text-muted)' }}>
                      {gw.status}
                    </span>
                  </span>
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {gw.sessions}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                  }}
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
      'Push security policy changes across your entire fleet. Rate limits, allowed models, and access controls.',
  },
  {
    icon: Search,
    title: 'Fleet-Wide Search',
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
          manage your fleet
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="glow-border dot-grid group relative overflow-hidden rounded-xl border p-6"
            style={{
              borderColor: 'var(--landing-border)',
              background: 'var(--landing-surface)',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            <div
              className="mb-4 inline-flex rounded-lg border p-2.5"
              style={{
                borderColor: 'var(--landing-border)',
                background: 'var(--landing-surface-2)',
              }}
            >
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
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--landing-text-muted)' }}
            >
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
          <p
            className="mb-8 max-w-md leading-relaxed"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            Clone, install, run. The monorepo uses{' '}
            <strong style={{ color: 'var(--landing-text)' }}>proto</strong> to
            pin exact versions of bun and moon, so every contributor gets an
            identical setup.
          </p>

          <div className="flex flex-wrap gap-6">
            <Stat label="Package Manager" value="Bun" />
            <Stat label="Task Runner" value="moon" />
            <Stat label="Framework" value="React 19" />
          </div>
        </div>

        {/* Terminal */}
        <div
          className="overflow-hidden rounded-xl border"
          style={{
            borderColor: 'var(--landing-border)',
            background: 'var(--landing-surface)',
          }}
        >
          <div
            className="flex items-center gap-2 border-b px-4 py-3"
            style={{ borderColor: 'var(--landing-border)' }}
          >
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
            </div>
            <span
              className="ml-2 text-xs"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--landing-text-muted)',
              }}
            >
              terminal
            </span>
          </div>
          <div
            className="p-5 text-sm leading-7"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
            }}
          >
            <Line prompt text="git clone https://github.com/kddige/openclaw-fleet.git" />
            <Line prompt text="cd openclaw-fleet" />
            <Line prompt text="proto use" />
            <Line
              style={{ color: 'var(--landing-text-muted)' }}
              text="  moon 2.0.1 installed"
            />
            <Line
              style={{ color: 'var(--landing-text-muted)' }}
              text="  bun 1.3.9 installed"
            />
            <Line prompt text="bun install" />
            <Line prompt text="moon run fleet:dev" />
            <Line
              style={{ color: '#22c55e' }}
              text="  VITE v7.3.1  ready in 826ms"
            />
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
  text,
  style,
}: {
  prompt?: boolean
  text: string
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
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
        className="text-xs uppercase tracking-wider"
        style={{
          color: 'var(--landing-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
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
        borderColor: accent ? 'var(--landing-accent-dim)' : 'var(--landing-border)',
        background: accent ? 'rgba(249, 115, 22, 0.05)' : 'var(--landing-surface)',
      }}
    >
      <div
        className="mb-4 inline-flex rounded-lg border p-2.5"
        style={{
          borderColor: accent ? 'var(--landing-accent-dim)' : 'var(--landing-border)',
          background: accent ? 'rgba(249, 115, 22, 0.1)' : 'var(--landing-surface-2)',
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
        className="mb-4 text-xs"
        style={{
          color: 'var(--landing-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {subtitle}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--landing-text-muted)' }}
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
      <div
        className="glow-border relative overflow-hidden rounded-2xl border p-12 text-center md:p-16"
        style={{
          borderColor: 'var(--landing-border)',
          background: 'var(--landing-surface)',
        }}
      >
        <div className="landing-glow pointer-events-none absolute inset-0" />

        <div className="relative">
          <h2
            className="mb-4 text-3xl font-bold tracking-tight md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to take control?
          </h2>
          <p
            className="mx-auto mb-8 max-w-md leading-relaxed"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            OpenClaw Fleet is open source and free. Start managing your AI agent
            infrastructure today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/docs/$"
              params={{ _splat: '' }}
              className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: 'var(--landing-accent)',
                color: 'var(--landing-bg)',
              }}
            >
              Read the Docs
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/kddige/openclaw-fleet"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: 'var(--landing-border)',
                color: 'var(--landing-text-muted)',
              }}
            >
              <GitBranch className="size-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
