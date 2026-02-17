import crypto from 'node:crypto'
import { store } from './store'
import type { DeviceIdentity } from './api/types'

export function getOrCreateDeviceIdentity(): DeviceIdentity {
  const existing = store.get('deviceIdentity')
  if (existing) return existing

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  const deviceId = crypto.createHash('sha256').update(publicKey).digest('hex')

  const identity: DeviceIdentity = {
    deviceId,
    publicKeyDer: publicKey.toString('base64'),
    privateKeyDer: privateKey.toString('base64'),
    publicKeyBase64url: publicKey.toString('base64url'),
  }

  store.set('deviceIdentity', identity)
  return identity
}

export function signChallenge(
  identity: DeviceIdentity,
  params: {
    token: string
    nonce: string
    signedAtMs: number
    role: string
    scopes: string[]
  },
): string {
  const privateKeyDer = Buffer.from(identity.privateKeyDer, 'base64')
  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: 'der',
    type: 'pkcs8',
  })

  // Signing payload per TRD Appendix B:
  // v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce
  const payload = [
    'v2',
    identity.deviceId,
    'fleet-manager',
    'operator',
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token,
    params.nonce,
  ].join('|')

  const signature = crypto.sign(null, Buffer.from(payload), privateKey)
  return signature.toString('base64url')
}
