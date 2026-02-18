// ============================================================
// Gateway Config (persisted in electron-store)
// ============================================================

export interface StoredGateway {
  id: string
  url: string
  label: string
  token: string
  addedAt: number
  sortOrder: number
}

export interface DeviceIdentity {
  deviceId: string // SHA-256 hex of raw 32-byte public key
  publicKeyRaw: string // base64-encoded raw 32-byte Ed25519 public key
  privateKeyDer: string // base64-encoded PKCS8 DER private key (for crypto.createPrivateKey)
  publicKeyBase64url: string // base64url-encoded raw 32-byte public key (for connect frame)
}

export interface StoredDeviceToken {
  token: string
  scopes: string[]
  updatedAt: number
}

export interface FleetStore {
  gateways: StoredGateway[]
  deviceIdentity: DeviceIdentity | null
  deviceTokens: Record<string, StoredDeviceToken>
}

// ============================================================
// WS Protocol Types
// ============================================================

export interface WsReqFrame {
  type: 'req'
  id: string
  method: string
  params: Record<string, unknown>
}

export interface WsResFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: Record<string, unknown>
  error?: { code: string; message: string; data?: unknown }
}

export interface WsEventFrame {
  type: 'event'
  event: string
  payload: Record<string, unknown>
  seq?: number
}

export type WsFrame = WsReqFrame | WsResFrame | WsEventFrame

// ============================================================
// Gateway Runtime State
// ============================================================

export type GatewayConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'pairing'
  | 'auth-failed'

export interface GatewayRuntimeState {
  id: string
  label: string
  url: string
  status: GatewayConnectionStatus
  lastConnectedAt: number | null
  lastError: string | null
  pairingRequestId: string | null
  gatewayStatus: GatewayStatusPayload | null
  health: HealthPayload | null
}

export interface GatewayStatusPayload {
  version: string
  uptime: number
  boundAddress: string
  authMode: string
  modelProvider: string
  activeSessions: number
  totalSessions: number
  defaultAgent: string | null
  defaultModel: string | null
}

export interface HealthPayload {
  ok: boolean
  channels: ChannelHealth[]
  modelAuth: { ok: boolean; provider: string; error: string | null }
  agents: { name: string; ok: boolean }[]
}

export interface ChannelHealth {
  name: string
  type: string
  connected: boolean
  error: string | null
}

// ============================================================
// Session Types
// ============================================================

export interface SessionEntry {
  key: string
  label: string | null
  agent: string
  channel: string | null
  chatType: string | null
  createdAt: number
  lastActiveAt: number
  tokensIn: number
  tokensOut: number
  cost: number
  model: string | null
}

export interface SessionUsage {
  tokensIn: number
  tokensOut: number
  cost: number
  modelBreakdown: {
    model: string
    tokensIn: number
    tokensOut: number
    cost: number
  }[]
}

export interface SessionUsageLog {
  timestamp: number
  role: string
  model: string
  tokensIn: number
  tokensOut: number
  cost: number
}

// ============================================================
// Chat Types
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  model?: string
  tokensIn?: number
  tokensOut?: number
}

// ============================================================
// Agent Types
// ============================================================

export interface AgentEntry {
  id: string
  name: string
  isDefault: boolean
  avatar: string | null
}

// ============================================================
// Presence Types
// ============================================================

export interface PresenceEntry {
  deviceId: string
  clientId: string
  role: string
  connectedAt: number
  platform: string
  version: string
}

// ============================================================
// Cost Types
// ============================================================

export interface CostSummary {
  totalCost: number
  period: { start: number; end: number }
  byModel: { model: string; cost: number }[]
  bySession: { key: string; label: string | null; cost: number }[]
}

// ============================================================
// Event Streaming
// ============================================================

export interface GatewayEvent {
  gatewayId: string
  type:
    | 'status-change'
    | 'status-update'
    | 'health-update'
    | 'presence-update'
    | 'session-activity'
  payload: unknown
  timestamp: number
}
