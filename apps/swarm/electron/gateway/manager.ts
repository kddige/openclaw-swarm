import crypto from 'node:crypto'
import { app } from 'electron'
import { EventPublisher } from '@orpc/shared'
import { GatewayConnection, type GatewayConnectionConfig } from './connection'
import { store, encryptToken, decryptToken } from '../store'
import { getOrCreateDeviceIdentity } from '../device-identity'
import { gatewayPublisher } from './publisher'
import type { Logger } from '../logger'
import type {
  StoredGateway,
  GatewayRuntimeState,
  GatewayEvent,
  SessionEntry,
  SessionUsage,
  SessionUsageLog,
  ChatMessage,
  AgentEntry,
  AgentFileEntry,
  PresenceEntry,
  CostSummary,
  ExecApprovalsSnapshot,
  ExecApprovalsFile,
  ExecApprovalRequest,
  ExecApprovalResolved,
  ExecApprovalDecision,
  GatewayConfigResponse,
  ModelEntry,
  DevicePairList,
  NodeEntry,
  CronJob,
  CronRunLogEntry,
  ChannelsStatusResponse,
  SessionPreview,
} from '../api/types'

export class GatewayManager {
  private connections = new Map<string, GatewayConnection>()
  private identity = getOrCreateDeviceIdentity()
  readonly events = new EventPublisher<{ gatewayEvent: GatewayEvent }>()
  private readonly logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
    const gateways = store.get('gateways')
    this.logger.info(`restoring ${gateways.length} gateways from store`)
    for (const gw of gateways) {
      this.initConnection(gw)
    }
  }

  private initConnection(gw: StoredGateway): GatewayConnection {
    const config: GatewayConnectionConfig = {
      id: gw.id,
      url: gw.url,
      label: gw.label,
      token: decryptToken(gw.token),
      identity: this.identity,
      appVersion: app.getVersion(),
      platform: process.platform,
      logger: this.logger.child('conn'),
    }

    const conn = new GatewayConnection(config)

    conn.on('status-change', (event) => {
      this.publishEvent({
        gatewayId: event.gatewayId,
        type: 'status-change',
        payload: event,
        timestamp: Date.now(),
      })
    })

    conn.on('status-updated', (event) => {
      this.publishEvent({
        gatewayId: event.gatewayId,
        type: 'status-update',
        payload: event.status,
        timestamp: Date.now(),
      })
    })

    conn.on('health-updated', (event) => {
      this.publishEvent({
        gatewayId: event.gatewayId,
        type: 'health-update',
        payload: event.health,
        timestamp: Date.now(),
      })
      if (event.health) {
        gatewayPublisher
          .publish('health', {
            gatewayId: event.gatewayId,
            ok: event.health.ok,
            ts: event.health.ts ?? Date.now(),
          })
          .catch(() => {})
      }
    })

    conn.on('gateway-event', (event) => {
      if (event.type === 'presence') {
        this.publishEvent({
          gatewayId: event.gatewayId,
          type: 'presence-update',
          payload: event.payload,
          timestamp: Date.now(),
        })
      }
      if (event.type === 'chat') {
        const payload = event.payload as {
          sessionKey: string
          state: 'delta' | 'final'
          message: ChatMessage
        }
        this.logger.info('[chat-forward] got chat event', {
          sessionKey: payload.sessionKey,
          state: payload.state,
          hasMessage: !!payload.message,
        })
        if (payload.sessionKey && payload.message) {
          gatewayPublisher
            .publish('chat', {
              gatewayId: event.gatewayId,
              sessionKey: payload.sessionKey,
              state: payload.state,
              message: {
                role: payload.message.role,
                content: payload.message.content,
                timestamp: payload.message.timestamp ?? Date.now(),
                model: payload.message.model,
                tokensIn: payload.message.tokensIn,
                tokensOut: payload.message.tokensOut,
              },
            })
            .then(() => {
              this.logger.info('[chat-forward] published to gatewayPublisher')
            })
            .catch((err) => {
              this.logger.error('[chat-forward] publish failed', err)
            })
        }
      }
      if (event.type === 'exec.approval.requested') {
        const payload = event.payload as ExecApprovalRequest
        this.logger.info('[exec-approval] requested', {
          id: payload.id,
          command: payload.request?.command,
        })
        gatewayPublisher
          .publish('execApproval', {
            gatewayId: event.gatewayId,
            type: 'requested',
            requested: payload,
          })
          .catch(() => {})
      }
      if (event.type === 'exec.approval.resolved') {
        const payload = event.payload as ExecApprovalResolved
        this.logger.info('[exec-approval] resolved', { id: payload.id, decision: payload.decision })
        gatewayPublisher
          .publish('execApproval', {
            gatewayId: event.gatewayId,
            type: 'resolved',
            resolved: payload,
          })
          .catch(() => {})
      }
    })

    conn.on('device-token', (event) => {
      const key = `${event.gatewayId}:operator`
      const tokens = store.get('deviceTokens')
      tokens[key] = {
        token: event.deviceToken,
        scopes: ['operator.read'],
        updatedAt: Date.now(),
      }
      store.set('deviceTokens', tokens)
    })

    this.connections.set(gw.id, conn)
    conn.connect()
    return conn
  }

  private publishEvent(event: GatewayEvent): void {
    this.events.publish('gatewayEvent', event)
  }

  // ── CRUD ──────────────────────────────────────────────

  addGateway(params: { url: string; token: string; label: string }): GatewayRuntimeState {
    const id = crypto.randomUUID()
    const gateways = store.get('gateways')
    const stored: StoredGateway = {
      id,
      url: params.url,
      label: params.label,
      token: encryptToken(params.token),
      addedAt: Date.now(),
      sortOrder: gateways.length,
    }
    gateways.push(stored)
    store.set('gateways', gateways)

    // initConnection decrypts the token; pass stored (encrypted) record
    const conn = this.initConnection(stored)
    return this.getRuntimeState(conn)
  }

  removeGateway(id: string): void {
    const conn = this.connections.get(id)
    if (conn) {
      conn.destroy()
      this.connections.delete(id)
    }
    const gateways = store.get('gateways').filter((g) => g.id !== id)
    store.set('gateways', gateways)

    const tokens = store.get('deviceTokens')
    for (const key of Object.keys(tokens)) {
      if (key.startsWith(id + ':')) {
        delete tokens[key]
      }
    }
    store.set('deviceTokens', tokens)
  }

  updateGateway(
    id: string,
    updates: { label?: string; token?: string; url?: string },
  ): GatewayRuntimeState {
    const conn = this.connections.get(id)
    if (!conn) throw new Error(`Gateway ${id} not found`)

    conn.updateConfig(updates)

    const storedUpdates = {
      ...updates,
      ...(updates.token !== undefined && { token: encryptToken(updates.token) }),
    }
    const gateways = store.get('gateways').map((g) => {
      if (g.id !== id) return g
      return { ...g, ...storedUpdates }
    })
    store.set('gateways', gateways)

    return this.getRuntimeState(conn)
  }

  async testConnection(params: { url: string; token: string }): Promise<{
    ok: boolean
    error?: string
    pairingRequestId?: string
  }> {
    this.logger.debug(`testConnection: url=${params.url}`)
    const tempConn = new GatewayConnection({
      id: 'test-' + crypto.randomUUID(),
      url: params.url,
      label: 'test',
      token: params.token,
      identity: this.identity,
      appVersion: app.getVersion(),
      platform: process.platform,
      logger: this.logger.child('conn'),
    })

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.error(
          `testConnection: TIMED OUT after 10s — last error: ${tempConn.getLastError() ?? 'none'}`,
        )
        tempConn.destroy()
        resolve({
          ok: false,
          error: tempConn.getLastError() ?? 'Connection timed out',
        })
      }, 10_000)

      tempConn.on('status-change', ({ status }: { status: string }) => {
        this.logger.debug(`testConnection: status changed to ${status}`)
        if (status === 'connected') {
          clearTimeout(timeout)
          tempConn.destroy()
          resolve({ ok: true })
        } else if (status === 'auth-failed') {
          clearTimeout(timeout)
          tempConn.destroy()
          resolve({ ok: false, error: 'Authentication failed' })
        } else if (status === 'pairing') {
          clearTimeout(timeout)
          const requestId = tempConn.getPairingRequestId() ?? undefined
          tempConn.destroy()
          resolve({
            ok: false,
            error: 'Device pairing required',
            pairingRequestId: requestId,
          })
        }
      })

      tempConn.connect()
    })
  }

  reconnectGateway(id: string): void {
    const conn = this.connections.get(id)
    if (!conn) throw new Error(`Gateway ${id} not found`)
    conn.disconnect()
    conn.connect()
  }

  // ── Queries ───────────────────────────────────────────

  listGateways(): GatewayRuntimeState[] {
    return Array.from(this.connections.values()).map((conn) => this.getRuntimeState(conn))
  }

  getGateway(id: string): GatewayRuntimeState {
    const conn = this.connections.get(id)
    if (!conn) throw new Error(`Gateway ${id} not found`)
    return this.getRuntimeState(conn)
  }

  async getGatewaySessions(id: string): Promise<SessionEntry[]> {
    const conn = this.getConnection(id)
    const result = (await conn.request('sessions.list', {
      includeGlobal: true,
    })) as Record<string, unknown>
    const raw = (result.sessions ?? result) as Record<string, unknown>[]
    const sessions = raw.map((s) => ({
      key: String(s.key ?? ''),
      displayName: (s.displayName as string) ?? (s.label as string) ?? null,
      kind: (s.kind as string) ?? null,
      agent: (s.agent as string) ?? (s.agentId as string) ?? null,
      channel: (s.channel as string) ?? null,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : null,
      lastActiveAt:
        typeof s.lastActiveAt === 'number'
          ? s.lastActiveAt
          : typeof s.lastActivity === 'number'
            ? s.lastActivity
            : null,
      tokensIn: Number(s.tokensIn ?? 0),
      tokensOut: Number(s.tokensOut ?? 0),
      cost: Number(s.cost ?? 0),
      model: (s.model as string) ?? null,
    }))
    gatewayPublisher.publish('sessions', { gatewayId: id, sessions }).catch(() => {})
    return sessions
  }

  async getSessionUsage(gatewayId: string, sessionKey: string): Promise<SessionUsage> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('sessions.usage', {
      key: sessionKey,
    })) as SessionUsage
  }

  async getSessionUsageLogs(
    gatewayId: string,
    sessionKey: string,
    limit = 100,
  ): Promise<SessionUsageLog[]> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('sessions.usage.logs', {
      key: sessionKey,
      limit,
    })) as SessionUsageLog[]
  }

  async getChatHistory(gatewayId: string, sessionKey: string, limit = 100): Promise<ChatMessage[]> {
    const conn = this.getConnection(gatewayId)
    const res = (await conn.request('chat.history', {
      sessionKey,
      limit,
    })) as { messages: ChatMessage[] } | ChatMessage[]
    // Gateway returns { sessionKey, messages: [...], thinkingLevel }
    if (Array.isArray(res)) return res
    return (res as { messages: ChatMessage[] }).messages ?? []
  }

  async sendChatMessage(gatewayId: string, sessionKey: string, message: string): Promise<void> {
    const conn = this.getConnection(gatewayId)
    // Publish the user message to the stream immediately
    gatewayPublisher
      .publish('chat', {
        gatewayId,
        sessionKey,
        state: 'final',
        message: {
          role: 'user',
          content: message,
          timestamp: Date.now(),
        },
      })
      .catch(() => {})
    await conn.request('chat.send', {
      sessionKey,
      message,
      idempotencyKey: crypto.randomUUID(),
    })
  }

  async resetSession(
    gatewayId: string,
    sessionKey: string,
    reason?: 'new' | 'reset',
  ): Promise<void> {
    const conn = this.getConnection(gatewayId)
    await conn.request('sessions.reset', { key: sessionKey, reason })
  }

  async deleteSession(
    gatewayId: string,
    sessionKey: string,
    deleteTranscript?: boolean,
  ): Promise<void> {
    const conn = this.getConnection(gatewayId)
    await conn.request('sessions.delete', { key: sessionKey, deleteTranscript })
  }

  async compactSession(gatewayId: string, sessionKey: string, maxLines?: number): Promise<void> {
    const conn = this.getConnection(gatewayId)
    await conn.request('sessions.compact', { key: sessionKey, maxLines })
  }

  async patchSession(
    gatewayId: string,
    sessionKey: string,
    patch: { label?: string; model?: string },
  ): Promise<void> {
    const conn = this.getConnection(gatewayId)
    await conn.request('sessions.patch', { key: sessionKey, ...patch })
  }

  async getAgents(gatewayId: string): Promise<AgentEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('agents.list', {})) as Record<string, unknown>
    const defaultId = result.defaultId as string | undefined
    const raw = (result.agents ?? result) as {
      id: string
      name?: string
      identity?: AgentEntry['identity']
    }[]
    return raw.map((a) => ({
      id: a.id,
      isDefault: a.id === defaultId,
      name: a.name,
      identity: a.identity,
    }))
  }

  async createAgent(
    gatewayId: string,
    params: { name: string; workspace?: string; emoji?: string; avatar?: string },
  ): Promise<{ ok: true; agentId: string }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('agents.create', params)) as { ok: true; agentId: string }
  }

  async updateAgent(
    gatewayId: string,
    params: { agentId: string; name?: string; workspace?: string; model?: string; avatar?: string },
  ): Promise<{ ok: true; agentId: string }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('agents.update', params)) as { ok: true; agentId: string }
  }

  async deleteAgent(
    gatewayId: string,
    agentId: string,
    deleteFiles?: boolean,
  ): Promise<{ ok: true; agentId: string }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('agents.delete', { agentId, deleteFiles })) as {
      ok: true
      agentId: string
    }
  }

  async getAgentFiles(gatewayId: string, agentId: string): Promise<AgentFileEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('agents.files.list', { agentId })) as {
      files: AgentFileEntry[]
    }
    return result.files ?? []
  }

  async getAgentFile(gatewayId: string, agentId: string, name: string): Promise<AgentFileEntry> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('agents.files.get', { agentId, name })) as {
      file: AgentFileEntry
    }
    return result.file
  }

  async setAgentFile(
    gatewayId: string,
    agentId: string,
    name: string,
    content: string,
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('agents.files.set', { agentId, name, content })
    return { ok: true }
  }

  async getPresence(gatewayId: string): Promise<PresenceEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = await conn.request('system-presence', {})
    // Response may be a bare array or { presence: [...] }
    const raw = Array.isArray(result)
      ? result
      : ((result as Record<string, unknown>).presence ?? [])
    const devices = raw as PresenceEntry[]
    gatewayPublisher.publish('presence', { gatewayId, devices }).catch(() => {})
    return devices
  }

  async getCost(gatewayId: string, startDate?: string, endDate?: string): Promise<CostSummary> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('usage.cost', {
      startDate,
      endDate,
    })) as CostSummary
  }

  async getExecApprovals(gatewayId: string): Promise<ExecApprovalsSnapshot> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('exec.approvals.get', {})) as ExecApprovalsSnapshot
  }

  async getConfig(gatewayId: string): Promise<GatewayConfigResponse> {
    const conn = this.getConnection(gatewayId)
    return conn.request('config.get', {}) as Promise<GatewayConfigResponse>
  }

  async getConfigSchema(gatewayId: string): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('config.schema', {})
  }

  async patchConfig(gatewayId: string, raw: string, baseHash?: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('config.patch', { raw, ...(baseHash ? { baseHash } : {}) })
    return { ok: true }
  }

  async applyConfig(gatewayId: string, raw: string, baseHash?: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('config.apply', { raw, ...(baseHash ? { baseHash } : {}) })
    return { ok: true }
  }

  // ── Tier 1: Chat Abort ───────────────────────────────

  async abortChat(
    gatewayId: string,
    sessionKey: string,
    runId?: string,
  ): Promise<{ ok: true; aborted: boolean; runIds?: string[] }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('chat.abort', {
      sessionKey,
      ...(runId ? { runId } : {}),
    })) as { ok: true; aborted: boolean; runIds?: string[] }
  }

  // ── Tier 1: Models ─────────────────────────────────────

  async getModels(gatewayId: string): Promise<ModelEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('models.list', {})) as { models: ModelEntry[] }
    return result.models ?? []
  }

  // ── Tier 1: Device Pairing ─────────────────────────────

  async getDevicePairs(gatewayId: string): Promise<DevicePairList> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('device.pair.list', {})) as DevicePairList
  }

  async approveDevicePair(gatewayId: string, requestId: string): Promise<{ requestId: string }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('device.pair.approve', { requestId })) as {
      requestId: string
    }
  }

  async rejectDevicePair(gatewayId: string, requestId: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('device.pair.reject', { requestId })
    return { ok: true }
  }

  async removeDevicePair(gatewayId: string, deviceId: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('device.pair.remove', { deviceId })
    return { ok: true }
  }

  async rotateDeviceToken(
    gatewayId: string,
    deviceId: string,
    role: string,
    scopes?: string[],
  ): Promise<{ deviceId: string; token: string }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('device.token.rotate', {
      deviceId,
      role,
      ...(scopes ? { scopes } : {}),
    })) as { deviceId: string; token: string }
  }

  async revokeDeviceToken(
    gatewayId: string,
    deviceId: string,
    role: string,
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('device.token.revoke', { deviceId, role })
    return { ok: true }
  }

  // ── Tier 1: Exec Approvals Write ───────────────────────

  async setExecApprovals(
    gatewayId: string,
    file: ExecApprovalsFile,
    baseHash?: string,
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('exec.approvals.set', { file, ...(baseHash ? { baseHash } : {}) })
    return { ok: true }
  }

  async resolveExecApproval(
    gatewayId: string,
    id: string,
    decision: ExecApprovalDecision,
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('exec.approval.resolve', { id, decision })
    return { ok: true }
  }

  // ── Tier 1: Session Preview ────────────────────────────

  async getSessionPreviews(
    gatewayId: string,
    keys: string[],
    limit?: number,
  ): Promise<SessionPreview[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('sessions.preview', {
      keys,
      ...(limit ? { limit } : {}),
    })) as { previews: SessionPreview[] }
    return result.previews ?? []
  }

  // ── Tier 2: Cron ───────────────────────────────────────

  async getCronJobs(gatewayId: string, includeDisabled?: boolean): Promise<CronJob[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('cron.list', {
      ...(includeDisabled ? { includeDisabled } : {}),
    })) as { jobs: CronJob[] }
    return result.jobs ?? []
  }

  async getCronStatus(gatewayId: string): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('cron.status', {})
  }

  async addCronJob(
    gatewayId: string,
    params: {
      name: string
      schedule: CronJob['schedule']
      payload: CronJob['payload']
      sessionTarget?: string
      wakeMode?: string
      delivery?: CronJob['delivery']
      agentId?: string
      sessionKey?: string
      description?: string
      enabled?: boolean
      deleteAfterRun?: boolean
    },
  ): Promise<CronJob> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('cron.add', params)) as CronJob
  }

  async updateCronJob(
    gatewayId: string,
    jobId: string,
    patch: Partial<
      Pick<
        CronJob,
        'name' | 'schedule' | 'payload' | 'delivery' | 'enabled' | 'description' | 'deleteAfterRun'
      >
    >,
  ): Promise<CronJob> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('cron.update', { id: jobId, patch })) as CronJob
  }

  async removeCronJob(gatewayId: string, jobId: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('cron.remove', { id: jobId })
    return { ok: true }
  }

  async runCronJob(
    gatewayId: string,
    jobId: string,
    mode?: 'due' | 'force',
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('cron.run', { id: jobId, ...(mode ? { mode } : {}) })
    return { ok: true }
  }

  async getCronRuns(gatewayId: string, jobId: string, limit?: number): Promise<CronRunLogEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('cron.runs', {
      id: jobId,
      ...(limit ? { limit } : {}),
    })) as { entries: CronRunLogEntry[] }
    return result.entries ?? []
  }

  // ── Tier 2: Nodes ──────────────────────────────────────

  async getNodes(gatewayId: string): Promise<NodeEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request('node.list', {})) as { nodes: NodeEntry[] }
    return result.nodes ?? []
  }

  async describeNode(gatewayId: string, nodeId: string): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('node.describe', { nodeId })
  }

  async invokeNode(
    gatewayId: string,
    nodeId: string,
    command: string,
    params?: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('node.invoke', {
      nodeId,
      command,
      ...(params ? { params } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
      idempotencyKey: crypto.randomUUID(),
    })
  }

  // ── Tier 2: Gateway Update ─────────────────────────────

  async runUpdate(gatewayId: string): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('update.run', {})
    return { ok: true }
  }

  // ── Tier 3: Skills ─────────────────────────────────────

  async getSkillsStatus(gatewayId: string, agentId?: string): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('skills.status', { ...(agentId ? { agentId } : {}) })
  }

  async installSkill(gatewayId: string, name: string, installId: string): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('skills.install', { name, installId })
  }

  async updateSkill(
    gatewayId: string,
    skillKey: string,
    updates: { enabled?: boolean; apiKey?: string; env?: Record<string, string> },
  ): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('skills.update', { skillKey, ...updates })
  }

  // ── Tier 3: Channels ───────────────────────────────────

  async getChannelsStatus(gatewayId: string, probe?: boolean): Promise<ChannelsStatusResponse> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('channels.status', {
      ...(probe ? { probe } : {}),
    })) as ChannelsStatusResponse
  }

  async logoutChannel(
    gatewayId: string,
    channel: string,
    accountId?: string,
  ): Promise<{ ok: true }> {
    const conn = this.getConnection(gatewayId)
    await conn.request('channels.logout', { channel, ...(accountId ? { accountId } : {}) })
    return { ok: true }
  }

  // ── Tier 3: Send Message ───────────────────────────────

  async sendMessage(
    gatewayId: string,
    params: {
      to: string
      message?: string
      channel?: string
      accountId?: string
      threadId?: string
      sessionKey?: string
    },
  ): Promise<unknown> {
    const conn = this.getConnection(gatewayId)
    return conn.request('send', {
      ...params,
      idempotencyKey: crypto.randomUUID(),
    })
  }

  async getLogsTail(
    gatewayId: string,
    params: {
      limit?: number
      level?: string
      source?: string
      cursor?: number
    },
  ): Promise<{
    lines: Array<{
      ts: number
      level: string
      msg: string
      source?: string
    }>
    cursor?: number
  }> {
    const conn = this.getConnection(gatewayId)
    const raw = (await conn.request('logs.tail', params)) as {
      lines: string[]
      cursor?: number
    }
    const lines = (raw.lines ?? []).map((lineStr) => {
      try {
        const parsed = JSON.parse(lineStr)
        const meta = parsed._meta ?? {}
        const levelName: string = (meta.logLevelName ?? 'info').toLowerCase()
        const timeStr: string = meta.date ?? parsed.time ?? ''
        const t = timeStr ? new Date(timeStr).getTime() : NaN
        const ts = Number.isFinite(t) ? t : Date.now()
        const rawMsg = parsed['1'] ?? parsed.msg ?? ''
        const msg: string = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg)
        let source: string | undefined
        try {
          const sub = JSON.parse(parsed['0'] ?? '{}')
          source = sub.subsystem
        } catch {
          source = parsed['0']
        }
        return { ts, level: levelName, msg, source }
      } catch {
        return { ts: Date.now(), level: 'info', msg: lineStr, source: undefined }
      }
    })
    return { lines, cursor: raw.cursor }
  }

  // ── Swarm Aggregation ─────────────────────────────────

  async searchSwarm(query: string): Promise<{
    sessions: Array<{ gatewayId: string; gatewayLabel: string } & SessionEntry>
    agents: Array<{ gatewayId: string; gatewayLabel: string } & AgentEntry>
  }> {
    const q = query.toLowerCase()

    const perGateway = await this.aggregateConnected(async (id, conn) => {
      const [sessions, agents] = await Promise.allSettled([
        this.getGatewaySessions(id),
        this.getAgents(id),
      ])
      return {
        id,
        label: conn.label,
        sessions: sessions.status === 'fulfilled' ? sessions.value : [],
        agents: agents.status === 'fulfilled' ? agents.value : [],
      }
    })

    const matchedSessions: Array<{ gatewayId: string; gatewayLabel: string } & SessionEntry> = []
    const matchedAgents: Array<{ gatewayId: string; gatewayLabel: string } & AgentEntry> = []

    for (const { id, label, sessions, agents } of perGateway) {
      for (const session of sessions) {
        if (matchedSessions.length >= 60) break
        const haystack = [
          session.key,
          session.displayName,
          session.agent,
          session.model,
          session.channel,
          session.kind,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (haystack.includes(q)) {
          matchedSessions.push({ gatewayId: id, gatewayLabel: label, ...session })
        }
      }

      for (const agent of agents) {
        if (matchedAgents.length >= 60) break
        if (agent.id.toLowerCase().includes(q)) {
          matchedAgents.push({ gatewayId: id, gatewayLabel: label, ...agent })
        }
      }
    }

    return { sessions: matchedSessions, agents: matchedAgents }
  }

  async getSwarmPresence(): Promise<
    Array<{ gatewayId: string; gatewayLabel: string; devices: PresenceEntry[] }>
  > {
    return this.aggregateConnected(async (id, conn) => {
      const devices = await this.getPresence(id)
      return { gatewayId: id, gatewayLabel: conn.label, devices }
    })
  }

  async getSwarmCost(): Promise<{
    totalCost: number
    byGateway: { id: string; label: string; cost: number }[]
  }> {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const startDate = yesterday.toISOString()
    const endDate = now.toISOString()

    const byGateway = await this.aggregateConnected(async (id, conn) => {
      const summary = await this.getCost(id, startDate, endDate)
      const cost = summary.daily.reduce((sum, d) => sum + d.totalCost, 0)
      return { id, label: conn.label, cost }
    })

    const totalCost = byGateway.reduce((sum, g) => sum + g.cost, 0)
    return { totalCost, byGateway }
  }

  getSwarmOverview(): {
    totalGateways: number
    connectedGateways: number
    disconnectedGateways: number
    totalActiveSessions: number
  } {
    let connected = 0
    let disconnected = 0
    let totalActiveSessions = 0

    for (const conn of this.connections.values()) {
      if (conn.getStatus() === 'connected') {
        connected++
        // Session count from status.sessions (shape varies by gateway version)
        const sessions = conn.getCachedStatus()?.sessions as Record<string, unknown> | undefined
        if (sessions && typeof sessions.active === 'number') {
          totalActiveSessions += sessions.active
        }
      } else {
        disconnected++
      }
    }

    return {
      totalGateways: this.connections.size,
      connectedGateways: connected,
      disconnectedGateways: disconnected,
      totalActiveSessions,
    }
  }

  // ── Helpers ───────────────────────────────────────────

  private async aggregateConnected<T>(
    mapper: (id: string, conn: GatewayConnection) => Promise<T>,
  ): Promise<T[]> {
    const connected = Array.from(this.connections.entries()).filter(
      ([, conn]) => conn.getStatus() === 'connected',
    )
    const results = await Promise.allSettled(connected.map(([id, conn]) => mapper(id, conn)))
    const fulfilled: T[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') fulfilled.push(r.value)
    }
    return fulfilled
  }

  private getConnection(id: string): GatewayConnection {
    const conn = this.connections.get(id)
    if (!conn) throw new Error(`Gateway ${id} not found`)
    return conn
  }

  private getRuntimeState(conn: GatewayConnection): GatewayRuntimeState {
    return {
      id: conn.id,
      label: conn.label,
      url: conn.url,
      status: conn.getStatus(),
      lastConnectedAt: conn.getLastConnectedAt(),
      lastError: conn.getLastError(),
      pairingRequestId: conn.getPairingRequestId(),
      serverInfo: conn.getServerInfo(),
      gatewayStatus: conn.getCachedStatus(),
      health: conn.getCachedHealth(),
    }
  }

  getDeviceId(): string {
    return this.identity.deviceId
  }

  destroy(): void {
    for (const conn of this.connections.values()) {
      conn.destroy()
    }
    this.connections.clear()
  }
}
