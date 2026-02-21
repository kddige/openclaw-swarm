import crypto from 'node:crypto'
import type { WsFrame, WsReqFrame, DeviceIdentity } from '../api/types'
import { GatewayFrameSchema } from './schemas'
import { signChallenge } from '../device-identity'
import { createDebugLogger } from '../lib/debug'

const debug = createDebugLogger('gw:protocol')

export function encodeFrame(frame: WsReqFrame): string {
  return JSON.stringify(frame)
}

export function decodeFrame(data: string): WsFrame {
  const json = JSON.parse(data) as unknown
  const result = GatewayFrameSchema.safeParse(json)
  if (!result.success) {
    debug.warn('frame validation failed, passing through:', result.error.message)
    return json as WsFrame
  }
  return result.data
}

export function createReqFrame(
  method: string,
  params: Record<string, unknown>,
): WsReqFrame {
  return {
    type: 'req',
    id: crypto.randomUUID(),
    method,
    params,
  }
}

export function buildConnectFrame(opts: {
  identity: DeviceIdentity
  token: string
  nonce: string
  appVersion: string
  platform: string
}): WsReqFrame {
  const signedAt = Date.now()
  const scopes = [
    'operator.read',
    'operator.write',
    'operator.admin',
    'operator.approvals',
    'operator.pairing',
  ]

  const signature = signChallenge(opts.identity, {
    token: opts.token,
    nonce: opts.nonce,
    signedAtMs: signedAt,
    role: 'operator',
    scopes,
  })

  return createReqFrame('connect', {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'gateway-client',
      version: opts.appVersion,
      platform: opts.platform,
      mode: 'ui',
      instanceId: crypto.randomUUID(),
    },
    role: 'operator',
    scopes,
    caps: [],
    auth: { token: opts.token },
    device: {
      id: opts.identity.deviceId,
      publicKey: opts.identity.publicKeyBase64url,
      signature,
      signedAt,
      nonce: opts.nonce,
    },
    userAgent: `fleet-manager/${opts.appVersion}`,
    locale: 'en-US',
  })
}
