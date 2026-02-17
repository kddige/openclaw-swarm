import crypto from 'node:crypto'
import { app } from 'electron'
import { EventPublisher } from '@orpc/shared'
import {
  GatewayConnection,
  type GatewayConnectionConfig,
} from './connection'
import { store } from '../store'
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
      token: gw.token,
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
      token: params.token,
      addedAt: Date.now(),
      sortOrder: gateways.length,
    }
    gateways.push(stored)
    store.set('gateways', gateways)

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

    const gateways = store.get('gateways').map((g) => {
      if (g.id !== id) return g
      return { ...g, ...updates }
    })
    store.set('gateways', gateways)

    return this.getRuntimeState(conn)
  }

  async testConnection(params: {
    url: string
    token: string
  }): Promise<{ ok: boolean; error?: string }> {
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
          tempConn.destroy()
          resolve({ ok: false, error: 'Device pairing required' })
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
    return (result.sessions ?? result) as SessionEntry[]
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

  async getAgents(gatewayId: string): Promise<AgentEntry[]> {
    const conn = this.getConnection(gatewayId)
    return (await conn.request('agents.list', {})) as AgentEntry[]
  }

  async getPresence(gatewayId: string): Promise<PresenceEntry[]> {
    const conn = this.getConnection(gatewayId)
    const result = (await conn.request(
      'system-presence',
      {},
    )) as Record<string, unknown>
    return (result.presence ?? result) as PresenceEntry[]
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

  // ── Fleet Aggregation ─────────────────────────────────

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
        totalActiveSessions += conn.getCachedStatus()?.activeSessions ?? 0
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
