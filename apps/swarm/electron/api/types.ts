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

export interface SwarmStore {
  gateways: StoredGateway[]
  deviceIdentity: DeviceIdentity | null
  deviceTokens: Record<string, StoredDeviceToken>
}

// ============================================================
// Gateway Config Response
// ============================================================

export interface GatewayConfigResponse {
  path?: string
  exists?: boolean
  raw: string
  parsed?: unknown
  resolved?: unknown
  config?: unknown
  hash?: string
  issues?: unknown[]
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
  name?: string
  identity?: {
    name?: string
    theme?: string
    emoji?: string
    avatar?: string
    avatarUrl?: string
  }
}

export interface AgentFileEntry {
  name: string
  size: number
  modifiedAt?: number
  content?: string
}

// ============================================================
// Model Types
// ============================================================

export interface ModelEntry {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
}

// ============================================================
// Device Pairing Types
// ============================================================

export interface PairedDevice {
  deviceId: string
  displayName?: string
  platform?: string
  clientId?: string
  clientMode?: string
  role?: string
  roles?: string[]
  scopes?: string[]
  remoteIp?: string
  pairedAt?: number
  lastSeenAt?: number
}

export interface PendingPairRequest {
  requestId: string
  deviceId: string
  publicKey?: string
  displayName?: string
  platform?: string
  clientId?: string
  clientMode?: string
  role?: string
  roles?: string[]
  scopes?: string[]
  remoteIp?: string
  silent?: boolean
  isRepair?: boolean
  ts: number
}

export interface DevicePairList {
  pending: PendingPairRequest[]
  paired: PairedDevice[]
}

// ============================================================
// Node Types
// ============================================================

export interface NodeEntry {
  nodeId: string
  displayName?: string
  platform?: string
  version?: string
  caps?: string[]
  commands?: string[]
  paired: boolean
  connected: boolean
  lastSeenAt?: number
}

// ============================================================
// Cron Types
// ============================================================

export interface CronSchedule {
  type: 'at' | 'every' | 'cron'
  at?: string
  everyMs?: number
  expr?: string
  tz?: string
  staggerMs?: number
}

export interface CronPayload {
  type: 'systemEvent' | 'agentTurn'
  message?: string
  agentId?: string
  sessionKey?: string
}

export interface CronDelivery {
  mode: 'none' | 'announce' | 'webhook'
  destination?: string
}

export interface CronJob {
  id: string
  name: string
  description?: string
  enabled: boolean
  deleteAfterRun?: boolean
  schedule: CronSchedule
  sessionTarget?: string
  wakeMode?: string
  payload: CronPayload
  delivery?: CronDelivery
  agentId?: string
  sessionKey?: string
  createdAtMs?: number
  updatedAtMs?: number
  nextRunAtMs?: number
  runningAtMs?: number
  lastRunAtMs?: number
  lastStatus?: string
  lastError?: string
  consecutiveErrors?: number
}

export interface CronRunLogEntry {
  ts: number
  status: string
  durationMs?: number
  error?: string
}

// ============================================================
// Skill Types
// ============================================================

export interface SkillEntry {
  key: string
  name: string
  enabled: boolean
  installed: boolean
  hasApiKey?: boolean
  env?: Record<string, string>
}

// ============================================================
// Channel Status Types
// ============================================================

export interface ChannelsStatusResponse {
  ts: number
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  channels: Record<string, ChannelHealthDetail>
  channelAccounts?: Record<string, unknown[]>
  channelDefaultAccountId?: Record<string, string>
}

// ============================================================
// Session Preview Types
// ============================================================

export interface SessionPreview {
  key: string
  messages: { role: string; content: string; ts?: number }[]
}

// ============================================================
// Presence Types (derived from Zod schema)
// ============================================================

export type PresenceEntry = z.infer<typeof PresenceEntryZod>

// ============================================================
// Cost Types
// ============================================================

export interface CostDay {
  date: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  totalCost: number
  inputCost: number
  outputCost: number
  cacheReadCost: number
  cacheWriteCost: number
}

export interface CostSummary {
  updatedAt: number
  days: number
  daily: CostDay[]
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
// Exec Approval Requests (real-time)
// ============================================================

export interface ExecApprovalRequest {
  id: string
  request: {
    command: string
    cwd?: string | null
    host?: string | null
    security?: string | null
    ask?: string | null
    agentId?: string | null
    resolvedPath?: string | null
    sessionKey?: string | null
  }
  createdAtMs: number
  expiresAtMs: number
}

export type ExecApprovalDecision = 'allow-once' | 'allow-always' | 'deny'

export interface ExecApprovalResolved {
  id: string
  decision: ExecApprovalDecision
  resolvedBy: string | null
  ts: number
}

// ============================================================
// Event Streaming
// ============================================================

export interface GatewayEvent {
  gatewayId: string
  type: 'status-change' | 'status-update' | 'health-update' | 'presence-update' | 'session-activity'
  payload: unknown
  timestamp: number
}
