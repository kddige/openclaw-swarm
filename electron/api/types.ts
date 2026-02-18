import type { z } from 'zod/v4'
import type {
  RequestFrameSchema,
  ResponseFrameSchema,
  EventFrameSchema,
  GatewayFrameSchema,
  ErrorShapeSchema,
  ConnectParamsSchema,
  HelloOkSchema,
  PresenceEntrySchema as PresenceEntryZod,
  SnapshotSchema,
  StateVersionSchema,
  ChallengeEventSchema,
} from '../gateway/schemas'

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
// WS Protocol Types (derived from Zod schemas)
// ============================================================

export type WsReqFrame = z.infer<typeof RequestFrameSchema>
export type WsResFrame = z.infer<typeof ResponseFrameSchema>
export type WsEventFrame = z.infer<typeof EventFrameSchema>
export type WsFrame = z.infer<typeof GatewayFrameSchema>
export type ErrorShape = z.infer<typeof ErrorShapeSchema>
export type ConnectParams = z.infer<typeof ConnectParamsSchema>
export type HelloOk = z.infer<typeof HelloOkSchema>
export type Snapshot = z.infer<typeof SnapshotSchema>
export type StateVersion = z.infer<typeof StateVersionSchema>
export type ChallengeEvent = z.infer<typeof ChallengeEventSchema>

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
  serverInfo: ServerInfo | null
  gatewayStatus: GatewayStatusPayload | null
  health: HealthPayload | null
}

/** Extracted from hello-ok.server in the WS handshake */
export interface ServerInfo {
  version: string
  host: string
  connId: string
}

/** The real payload returned by the `status` WS method */
export interface GatewayStatusPayload {
  heartbeat?: {
    defaultAgentId: string
    agents: {
      agentId: string
      enabled: boolean
      every: string
      everyMs: number
    }[]
  }
  channelSummary?: string[]
  sessions?: Record<string, unknown>
  [key: string]: unknown
}

/** The real payload returned by the `health` WS method */
export interface HealthPayload {
  ok: boolean
  ts?: number
  durationMs?: number
  channels: Record<string, ChannelHealthDetail>
}

export interface ChannelHealthDetail {
  configured: boolean
  tokenSource?: string
  running: boolean
  lastStartAt: number | null
  lastStopAt: number | null
  lastError: string | null
  probe?: {
    ok: boolean
    status: string | null
    error: string | null
    elapsedMs?: number
  }
}

// ============================================================
// Session Types
// ============================================================

/** Normalised session — adapted from the gateway's sessions.list response */
export interface SessionEntry {
  key: string
  displayName: string | null
  kind: string | null
  agent: string | null
  channel: string | null
  createdAt: number | null
  lastActiveAt: number | null
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
  isDefault: boolean
}

// ============================================================
// Presence Types (derived from Zod schema)
// ============================================================

export type PresenceEntry = z.infer<typeof PresenceEntryZod>

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
// Exec Approvals Types
// ============================================================

export interface ExecAllowlistEntry {
  id?: string
  pattern: string
  lastUsedAt?: number
  lastUsedCommand?: string
  lastResolvedPath?: string
}

export interface ExecAgentConfig {
  security?: string
  ask?: string
  askFallback?: string
  autoAllowSkills?: boolean
  allowlist?: ExecAllowlistEntry[]
}

export interface ExecApprovalsDefaults {
  security?: string
  ask?: string
  askFallback?: string
  autoAllowSkills?: boolean
}

export interface ExecApprovalsFile {
  version: 1
  defaults?: ExecApprovalsDefaults
  agents?: Record<string, ExecAgentConfig>
}

export interface ExecApprovalsSnapshot {
  path: string
  exists: boolean
  hash: string
  file: ExecApprovalsFile
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
