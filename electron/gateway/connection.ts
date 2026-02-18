import { EventEmitter } from 'node:events'
import WebSocket from 'ws'
import {
  decodeFrame,
  encodeFrame,
  createReqFrame,
  buildConnectFrame,
} from './protocol'
import type {
  DeviceIdentity,
  GatewayConnectionStatus,
  WsResFrame,
  WsEventFrame,
  WsReqFrame,
  GatewayStatusPayload,
  HealthPayload,
} from '../api/types'
import { createDebugLogger } from '../lib/debug'

const debug = createDebugLogger('gw:conn')

interface PairingError extends Error {
  code?: string
  requestId?: string
}

interface PendingRequest {
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface GatewayConnectionConfig {
  id: string
  url: string
  label: string
  token: string
  identity: DeviceIdentity
  appVersion: string
  platform: string
}

export class GatewayConnection extends EventEmitter {
  readonly id: string
  label: string

  private _url: string
  private token: string
  private identity: DeviceIdentity
  private appVersion: string
  private platform: string

  private ws: WebSocket | null = null
  private status: GatewayConnectionStatus = 'disconnected'
  private lastConnectedAt: number | null = null
  private lastError: string | null = null
  private lastSeq: number | null = null
  private reconnectBackoff = 800
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private destroyed = false

  private cachedStatus: GatewayStatusPayload | null = null
  private cachedHealth: HealthPayload | null = null
  private statusPollTimer: ReturnType<typeof setInterval> | null = null
  private _pairingRequestId: string | null = null

  constructor(config: GatewayConnectionConfig) {
    super()
    this.id = config.id
    this._url = config.url
    this.label = config.label
    this.token = config.token
    this.identity = config.identity
    this.appVersion = config.appVersion
    this.platform = config.platform
  }

  get url(): string {
    return this._url
  }

  getStatus(): GatewayConnectionStatus {
    return this.status
  }
  getLastConnectedAt(): number | null {
    return this.lastConnectedAt
  }
  getLastError(): string | null {
    return this.lastError
  }
  getCachedStatus(): GatewayStatusPayload | null {
    return this.cachedStatus
  }
  getCachedHealth(): HealthPayload | null {
    return this.cachedHealth
  }
  getPairingRequestId(): string | null {
    return this._pairingRequestId
  }

  connect(): void {
    if (this.destroyed) return
    debug.log(`[${this.id}] connecting to ${this._url}`)
    this.setStatus('connecting')
    this.lastError = null
    this._pairingRequestId = null

    try {
      this.ws = new WebSocket(this._url)
    } catch (err) {
      debug.error(`[${this.id}] WebSocket constructor threw:`, err)
      this.lastError = String(err)
      this.setStatus('disconnected')
      this.scheduleReconnect()
      return
    }

    this.ws.on('open', () => {
      debug.log(`[${this.id}] WebSocket open, waiting for challenge...`)
    })

    this.ws.on('message', (data: WebSocket.RawData) => {
      const raw = data.toString()
      debug.log(`[${this.id}] << recv`, raw.slice(0, 300))
      this.handleMessage(raw)
    })

    this.ws.on('error', (err: Error) => {
      debug.error(`[${this.id}] WebSocket error:`, err.message)
      this.lastError = err.message
    })

    this.ws.on('close', (code: number, reason: Buffer) => {
      debug.warn(
        `[${this.id}] WebSocket closed: code=${code} reason=${reason.toString() || '(none)'}`,
      )
      this.cleanup()
      if (!this.destroyed) {
        this.setStatus('disconnected')
        this.scheduleReconnect()
      }
    })
  }

  private handleMessage(data: string): void {
    let frame
    try {
      frame = decodeFrame(data)
    } catch (err) {
      debug.error(`[${this.id}] failed to decode frame:`, err, data.slice(0, 200))
      return
    }

    if (frame.type === 'event') {
      debug.log(`[${this.id}] event: ${(frame as WsEventFrame).event}`)
      this.handleEvent(frame as WsEventFrame)
    } else if (frame.type === 'res') {
      const res = frame as WsResFrame
      debug.log(`[${this.id}] response: id=${res.id} ok=${res.ok}`)
      this.handleResponse(res)
    } else {
      debug.warn(`[${this.id}] unknown frame type:`, frame)
    }
  }

  private handleEvent(frame: WsEventFrame): void {
    if (frame.seq != null) {
      if (this.lastSeq != null && frame.seq > this.lastSeq + 1) {
        this.emit('seq-gap', {
          expected: this.lastSeq + 1,
          received: frame.seq,
        })
        this.refreshState()
      }
      this.lastSeq = frame.seq
    }

    if (frame.event === 'connect.challenge') {
      this.handleChallenge(frame.payload as { nonce: string })
      return
    }

    this.emit('gateway-event', {
      gatewayId: this.id,
      type: frame.event,
      payload: frame.payload,
      timestamp: Date.now(),
    })
  }

  private handleChallenge(payload: { nonce: string }): void {
    debug.log(`[${this.id}] received challenge, nonce=${payload.nonce.slice(0, 16)}...`)

    const frame = buildConnectFrame({
      identity: this.identity,
      token: this.token,
      nonce: payload.nonce,
      appVersion: this.appVersion,
      platform: this.platform,
    })

    debug.log(`[${this.id}] sending connect request id=${frame.id}`)
    debug.log(`[${this.id}] connect params:`, JSON.stringify(frame.params, null, 2).slice(0, 500))

    this.sendRequest(frame)
      .then((res) => {
        const resPayload = res as Record<string, unknown>
        debug.log(`[${this.id}] connect response:`, JSON.stringify(resPayload).slice(0, 500))

        if (resPayload.type === 'hello-ok') {
          debug.log(`[${this.id}] handshake SUCCESS`)
          this.setStatus('connected')
          this.lastConnectedAt = Date.now()
          this.reconnectBackoff = 800
          this.lastSeq = null

          const auth = resPayload.auth as
            | { deviceToken?: string }
            | undefined
          if (auth?.deviceToken) {
            debug.log(`[${this.id}] received device token`)
            this.emit('device-token', {
              gatewayId: this.id,
              deviceToken: auth.deviceToken,
            })
          }

          const policy = resPayload.policy as
            | { tickIntervalMs?: number }
            | undefined
          if (policy?.tickIntervalMs) {
            debug.log(`[${this.id}] tick interval: ${policy.tickIntervalMs}ms`)
            this.startTick(policy.tickIntervalMs)
          }

          this.refreshState()
          this.startStatusPolling()
        } else {
          debug.warn(`[${this.id}] unexpected connect response type: ${resPayload.type}`)
        }
      })
      .catch((err: PairingError | Error) => {
        debug.error(`[${this.id}] connect request FAILED:`, err.message)
        this.lastError = err.message

        if (
          err.message.includes('auth') ||
          err.message.includes('unauthorized') ||
          err.message.includes('forbidden')
        ) {
          this.setStatus('auth-failed')
          return
        }
        if (
          err.message.includes('pairing') ||
          ('code' in err && err.code === 'DEVICE_PAIRING_REQUIRED')
        ) {
          if ('requestId' in err && err.requestId) {
            this._pairingRequestId = err.requestId
            debug.log(`[${this.id}] pairing required, requestId=${err.requestId}`)
          }
          this.setStatus('pairing')
          // Do NOT auto-reconnect while pairing — user must retry manually
          return
        }

        this.setStatus('disconnected')
        this.scheduleReconnect()
      })
  }

  async request(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (this.status !== 'connected' || !this.ws) {
      throw new Error(
        `Gateway ${this.id} is not connected (status: ${this.status})`,
      )
    }
    const frame = createReqFrame(method, params)
    return this.sendRequest(frame)
  }

  private sendRequest(frame: WsReqFrame): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        debug.error(
          `[${this.id}] request TIMED OUT after 15s: method=${frame.method} id=${frame.id}`,
        )
        this.pendingRequests.delete(frame.id)
        reject(new Error(`Request ${frame.id} timed out`))
      }, 15_000)

      this.pendingRequests.set(frame.id, { resolve, reject, timer })

      const encoded = encodeFrame(frame)
      debug.log(`[${this.id}] >> send`, encoded.slice(0, 300))
      this.ws!.send(encoded)
    })
  }

  private handleResponse(frame: WsResFrame): void {
    const pending = this.pendingRequests.get(frame.id)
    if (!pending) return

    clearTimeout(pending.timer)
    this.pendingRequests.delete(frame.id)

    if (frame.ok) {
      pending.resolve(frame.payload)
    } else {
      const err = new Error(
        frame.error?.message ?? 'Unknown gateway error',
      ) as PairingError
      if (frame.error?.code) err.code = frame.error.code
      if (
        frame.error?.code === 'DEVICE_PAIRING_REQUIRED' &&
        frame.error.data &&
        typeof frame.error.data === 'object' &&
        'requestId' in frame.error.data
      ) {
        err.requestId = (frame.error.data as { requestId: string }).requestId
      }
      // Also check top-level error for requestId (some gateway versions)
      if (
        frame.error?.code === 'DEVICE_PAIRING_REQUIRED' &&
        'requestId' in (frame.error as Record<string, unknown>)
      ) {
        err.requestId =
          err.requestId ??
          (frame.error as unknown as { requestId: string }).requestId
      }
      pending.reject(err)
    }
  }

  private async refreshState(): Promise<void> {
    try {
      const [statusRes, healthRes] = await Promise.allSettled([
        this.request('status', {}),
        this.request('health', {}),
      ])
      if (statusRes.status === 'fulfilled') {
        this.cachedStatus = statusRes.value as GatewayStatusPayload
        this.emit('status-updated', {
          gatewayId: this.id,
          status: this.cachedStatus,
        })
      }
      if (healthRes.status === 'fulfilled') {
        this.cachedHealth = healthRes.value as HealthPayload
        this.emit('health-updated', {
          gatewayId: this.id,
          health: this.cachedHealth,
        })
      }
    } catch {
      // next poll will retry
    }
  }

  private startStatusPolling(): void {
    this.stopStatusPolling()
    this.statusPollTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.refreshState()
      }
    }, 10_000)
  }

  private stopStatusPolling(): void {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer)
      this.statusPollTimer = null
    }
  }

  private startTick(intervalMs: number): void {
    this.stopTick()
    this.tickTimer = setInterval(() => {
      if (this.ws && this.status === 'connected') {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }))
        } catch {
          // will be caught by onerror/onclose
        }
      }
    }, intervalMs)
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.status === 'auth-failed' || this.status === 'pairing') return
    debug.log(`[${this.id}] scheduling reconnect in ${Math.round(this.reconnectBackoff)}ms`)
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectBackoff)
    this.reconnectBackoff = Math.min(this.reconnectBackoff * 1.7, 15_000)
  }

  private setStatus(s: GatewayConnectionStatus): void {
    const prev = this.status
    this.status = s
    if (prev !== s) {
      debug.log(`[${this.id}] status: ${prev} -> ${s}`)
      this.emit('status-change', {
        gatewayId: this.id,
        status: s,
        previous: prev,
      })
    }
  }

  private cleanup(): void {
    this.stopTick()
    this.stopStatusPolling()
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Connection closed'))
      this.pendingRequests.delete(id)
    }
  }

  updateConfig(updates: {
    label?: string
    token?: string
    url?: string
  }): void {
    if (updates.label) this.label = updates.label
    if (updates.token) this.token = updates.token
    if (updates.url && updates.url !== this._url) {
      this.disconnect()
      this._url = updates.url
      this.connect()
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanup()
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  destroy(): void {
    this.destroyed = true
    this.disconnect()
    this.removeAllListeners()
  }
}
