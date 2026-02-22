import { MemoryPublisher } from '@orpc/experimental-publisher/memory'
import type { SessionEntry, PresenceEntry, ChatMessage } from '../api/types'

export type GatewayEvents = {
  sessions: { gatewayId: string; sessions: SessionEntry[] }
  presence: { gatewayId: string; devices: PresenceEntry[] }
  health: { gatewayId: string; ok: boolean; ts: number }
  chat: {
    gatewayId: string
    sessionKey: string
    state: 'delta' | 'final'
    message: ChatMessage
  }
}

export const gatewayPublisher = new MemoryPublisher<GatewayEvents>()
