import crypto from 'node:crypto'
import { app } from 'electron'
import { EventPublisher } from '@orpc/shared'
import {
  GatewayConnection,
  type GatewayConnectionConfig,
} from './connection'
import { store, encryptToken, decryptToken } from '../store'
import { getOrCreateDeviceIdentity } from '../device-identity'
import { createDebugLogger } from '../lib/debug'
import type {
  StoredGateway,
  GatewayRuntimeState,
  GatewayEvent,
  SessionEntry,
  SessionUsage,
  SessionUsageLog,
  ChatMessage,
  AgentEntry,
  PresenceEntry,
  CostSummary,
  ExecApprovalsSnapshot,
} from '../api/types'

const debug = createDebugLogger('gw:manager')

export class GatewayManager {
  private connections = new Map<string, GatewayConnection>()
  private identity = getOrCreateDeviceIdentity()
  readonly events = new EventPublisher<{ gatewayEvent: GatewayEvent }>()

  constructor() {
    const gateways = store.get('gateways')
    debug.log(`restoring ${gateways.length} gateways from store`)
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

  addGateway(params: {
    url: string
    token: string
    label: string
  }): GatewayRuntimeState {
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

  async testConnection(params: {
    url: string
    token: string
  }): Promise<{
    ok: boolean
    error?: string
    pairingRequestId?: string
  }> {
    debug.log(`testConnection: url=${params.url}`)
    const tempConn = new GatewayConnection({
      id: 'test-' + crypto.randomUUID(),
      url: params.url,
      label: 'test',
      token: params.token,
      identity: this.identity,
      appVersion: app.getVersion(),
      platform: process.platform,
    })

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        debug.error(
          `testConnection: TIMED OUT after 10s — last error: ${tempConn.getLastError() ?? 'none'}`,
        )
        tempConn.destroy()
        resolve({
          ok: false,
          error: tempConn.getLastError() ?? 'Connection timed out',
        })
      }, 10_000)

      tempConn.on('status-change', ({ status }: { status: string }) => {
        debug.log(`testConnection: status changed to ${status}`)
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
    return Array.from(this.connections.values()).map((conn) =>
      this.getRuntimeState(conn),
    )
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
    return raw.map((s) => ({
      key: String(s.key ?? ''),
      displayName: (s.displayName as string) ?? (s.label as string) ?? null,
      kind: (s.kind as string) ?? null,
      agent: (s.agent as string) ?? (s.agentId as string) ?? null,
      channel: (s.channel as string) ?? null,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : null,
      lastActiveAt: typeof s.lastActiveAt === 'number'
        ? s.lastActiveAt
        : typeof s.lastActivity === 'number'
          ? s.lastActivity
          : null,
      tokensIn: Number(s.tokensIn ?? 0),
      tokensOut: Number(s.tokensOut ?? 0),
      cost: Number(s.cost ?? 0),
      model: (s.model as string) ?? null,
    }))
  }

  async getSessionUsage(
    gatewayId: string,
    sessionKey: string,
  ): Promise<SessionUsage> {
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

  async getChatHistory(
    gatewayId: string,
    sessionKey: string,
    limit = 100,
  ): Promise<ChatMessage[]> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('chat.history', {
      sessionKey,
      limit,
    })) as ChatMessage[]
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

  async compactSession(
    gatewayId: string,
    sessionKey: string,
    maxLines?: number,
  ): Promise<void> {
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
    const result = (await conn.request('agents.list', {})) as Record<
      string,
      unknown
    >
    const defaultId = result.defaultId as string | undefined
    const raw = (result.agents ?? result) as { id: string }[]
    return raw.map((a) => ({
      id: a.id,
      isDefault: a.id === defaultId,
    }))
  }

  async getPresence(gatewayId: string): Promise<PresenceEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = await conn.request('system-presence', {})
    // Response may be a bare array or { presence: [...] }
    const raw = Array.isArray(result)
      ? result
      : ((result as Record<string, unknown>).presence ?? [])
    return raw as PresenceEntry[]
  }

  async getCost(
    gatewayId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CostSummary> {
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
      [key: string]: unknown
    }>
    cursor?: number
  }> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('logs.tail', params)) as {
      lines: Array<{
        ts: number
        level: string
        msg: string
        source?: string
        [key: string]: unknown
      }>
      cursor?: number
    }
  }

  // ── Fleet Aggregation ─────────────────────────────────

  async searchFleet(query: string): Promise<{
    sessions: Array<{ gatewayId: string; gatewayLabel: string } & SessionEntry>
    agents: Array<{ gatewayId: string; gatewayLabel: string } & AgentEntry>
  }> {
    const q = query.toLowerCase()
    const connectedEntries = Array.from(this.connections.entries()).filter(
      ([, conn]) => conn.getStatus() === 'connected',
    )

    const results = await Promise.allSettled(
      connectedEntries.map(async ([id, conn]) => {
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
      }),
    )

    const matchedSessions: Array<{ gatewayId: string; gatewayLabel: string } & SessionEntry> = []
    const matchedAgents: Array<{ gatewayId: string; gatewayLabel: string } & AgentEntry> = []

    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const { id, label, sessions, agents } = result.value

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

  async getFleetPresence(): Promise<
    Array<{ gatewayId: string; gatewayLabel: string; devices: PresenceEntry[] }>
  > {
    const connectedEntries = Array.from(this.connections.entries()).filter(
      ([, conn]) => conn.getStatus() === 'connected',
    )

    const results = await Promise.allSettled(
      connectedEntries.map(async ([id, conn]) => {
        const devices = await this.getPresence(id)
        return { gatewayId: id, gatewayLabel: conn.label, devices }
      }),
    )

    const output: Array<{ gatewayId: string; gatewayLabel: string; devices: PresenceEntry[] }> = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        output.push(result.value)
      }
    }
    return output
  }

  async getFleetCost(): Promise<{
    totalCost: number
    byGateway: { id: string; label: string; cost: number }[]
  }> {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const startDate = yesterday.toISOString()
    const endDate = now.toISOString()

    const connectedEntries = Array.from(this.connections.entries()).filter(
      ([, conn]) => conn.getStatus() === 'connected',
    )

    const results = await Promise.allSettled(
      connectedEntries.map(async ([id, conn]) => {
        const summary = await this.getCost(id, startDate, endDate)
        return { id, label: conn.label, cost: summary.totalCost }
      }),
    )

    const byGateway: { id: string; label: string; cost: number }[] = []
    let totalCost = 0

    for (const result of results) {
      if (result.status === 'fulfilled') {
        byGateway.push(result.value)
        totalCost += result.value.cost
      }
    }

    return { totalCost, byGateway }
  }

  getFleetOverview(): {
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
        const sessions = conn.getCachedStatus()?.sessions as
          | Record<string, unknown>
          | undefined
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

  destroy(): void {
    for (const conn of this.connections.values()) {
      conn.destroy()
    }
    this.connections.clear()
  }
}
