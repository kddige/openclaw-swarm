import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/lib/layout.shared'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="mb-2 text-3xl font-bold">OpenClaw</h1>
        <p className="mb-8 max-w-md text-fd-muted-foreground">
          Fleet management for OpenClaw Gateway instances. Monitor sessions,
          stream logs, and manage security across your AI agent infrastructure.
        </p>
        <Link
          to="/docs/$"
          params={{ _splat: '' }}
          className="mx-auto rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        >
          Read the Docs
        </Link>
      </div>
    </HomeLayout>
  )
}
