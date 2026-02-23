import { z } from 'zod/v4'

// ============================================================
// Primitives (from primitives.d.ts)
// ============================================================

export const GatewayClientIdSchema = z.enum([
  'cli',
  'test',
  'webchat-ui',
  'openclaw-control-ui',
  'webchat',
  'gateway-client',
  'openclaw-macos',
  'openclaw-ios',
  'openclaw-android',
  'node-host',
  'fingerprint',
  'openclaw-probe',
])

export const GatewayClientModeSchema = z.enum([
  'cli',
  'node',
  'ui',
  'test',
  'webchat',
  'backend',
  'probe',
])

// ============================================================
// Error Shape (from frames.d.ts)
// ============================================================

export const ErrorShapeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  retryable: z.boolean().optional(),
  retryAfterMs: z.number().optional(),
})

// ============================================================
// WS Frames (from frames.d.ts)
// ============================================================

export const RequestFrameSchema = z.object({
  type: z.literal('req'),
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
})

export const ResponseFrameSchema = z.object({
  type: z.literal('res'),
  id: z.string(),
  ok: z.boolean(),
  payload: z.unknown().optional(),
  error: ErrorShapeSchema.optional(),
})

export const EventFrameSchema = z.object({
  type: z.literal('event'),
  event: z.string(),
  payload: z.unknown().optional(),
  seq: z.number().optional(),
  stateVersion: z
    .object({
      presence: z.number(),
      health: z.number(),
    })
    .optional(),
})

export const GatewayFrameSchema = z.discriminatedUnion('type', [
  RequestFrameSchema,
  ResponseFrameSchema,
  EventFrameSchema,
])

// ============================================================
// Connect / HelloOk (from frames.d.ts)
// ============================================================

export const ConnectParamsSchema = z.object({
  minProtocol: z.number().optional(),
  maxProtocol: z.number().optional(),
  client: z.object({
    id: GatewayClientIdSchema,
    version: z.string().optional(),
    platform: z.string().optional(),
    mode: GatewayClientModeSchema.optional(),
    instanceId: z.string().optional(),
  }),
  device: z
    .object({
      id: z.string(),
      publicKey: z.string(),
      signature: z.string(),
      signedAt: z.number(),
      nonce: z.string(),
    })
    .optional(),
  auth: z
    .object({
      token: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  role: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  caps: z.array(z.string()).optional(),
  locale: z.string().optional(),
  userAgent: z.string().optional(),
})

export const ChallengeEventSchema = z.object({
  nonce: z.string(),
})

// ============================================================
// Snapshot / Presence (from snapshot.d.ts)
// ============================================================

export const PresenceEntrySchema = z.object({
  host: z.string().optional(),
  ip: z.string().optional(),
  version: z.string().optional(),
  platform: z.string().optional(),
  deviceFamily: z.string().optional(),
  modelIdentifier: z.string().optional(),
  mode: z.string().optional(),
  lastInputSeconds: z.number().optional(),
  reason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  text: z.string().optional(),
  ts: z.number(),
  deviceId: z.string().optional(),
  roles: z.array(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
  instanceId: z.string().optional(),
})

export const StateVersionSchema = z.object({
  presence: z.number(),
  health: z.number(),
})

export const SessionDefaultsSchema = z.object({
  defaultAgentId: z.string().optional(),
  mainKey: z.string().optional(),
  mainSessionKey: z.string().optional(),
  scope: z.string().optional(),
})

export const SnapshotSchema = z.object({
  presence: z.array(PresenceEntrySchema),
  health: z.unknown(),
  stateVersion: StateVersionSchema,
  uptimeMs: z.number(),
  configPath: z.string().optional(),
  stateDir: z.string().optional(),
  sessionDefaults: SessionDefaultsSchema.optional(),
  authMode: z.enum(['none', 'token', 'password', 'trusted-proxy']).optional(),
})

export const HelloOkSchema = z.object({
  type: z.literal('hello-ok'),
  protocol: z.number(),
  server: z.object({
    version: z.string(),
    commit: z.string().optional(),
    host: z.string(),
    connId: z.string(),
  }),
  features: z
    .object({
      methods: z.array(z.string()).optional(),
      events: z.array(z.string()).optional(),
    })
    .optional(),
  snapshot: SnapshotSchema.optional(),
  auth: z
    .object({
      deviceToken: z.string().optional(),
      role: z.string().optional(),
      scopes: z.array(z.string()).optional(),
      issuedAtMs: z.number().optional(),
    })
    .optional(),
  policy: z
    .object({
      maxPayload: z.number().optional(),
      maxBufferedBytes: z.number().optional(),
      tickIntervalMs: z.number().optional(),
    })
    .optional(),
})
