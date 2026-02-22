import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import { ChatPanel } from '@/components/chat-panel'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/chat')({
  component: ChatPage,
  errorComponent: RouteErrorFallback,
})

const MAINTENANCE_SESSION_KEY = 'swarm-maintenance'

function ChatPage() {
  const { gatewayId } = Route.useParams()

  return (
    <ChatPanel
      gatewayId={gatewayId}
      sessionKey={MAINTENANCE_SESSION_KEY}
      className="pt-2"
      style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}
    />
  )
}
