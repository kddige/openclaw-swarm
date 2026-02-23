import crypto from 'node:crypto'
import { store } from './store'
import type { DeviceIdentity } from './api/types'

// Ed25519 SPKI DER has a 12-byte header before the raw 32-byte public key
const SPKI_ED25519_HEADER_LENGTH = 12

function extractRawPublicKey(spkiDer: Buffer): Buffer {
  return spkiDer.subarray(SPKI_ED25519_HEADER_LENGTH)
}

export function getOrCreateDeviceIdentity(): DeviceIdentity {
  const existing = store.get('deviceIdentity')
  // Migrate: old identities used SPKI-wrapped keys, new ones use raw keys
  if (existing && existing.publicKeyRaw) return existing
  // Clear stale identity with old format
  if (existing) store.delete('deviceIdentity')

  const { publicKey: spkiDer, privateKey: pkcs8Der } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  // Extract raw 32-byte Ed25519 public key from SPKI DER wrapper
  const rawPublicKey = extractRawPublicKey(spkiDer)

  // deviceId = SHA-256 hex of the raw public key (matches gateway behavior)
  const deviceId = crypto.createHash('sha256').update(rawPublicKey).digest('hex')

  const identity: DeviceIdentity = {
    deviceId,
    publicKeyRaw: rawPublicKey.toString('base64'),
    privateKeyDer: pkcs8Der.toString('base64'),
    publicKeyBase64url: rawPublicKey.toString('base64url'),
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
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(identity.privateKeyDer, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })

  // Signing payload per gateway source:
  // v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce
  const payload = [
    'v2',
    identity.deviceId,
    'gateway-client',
    'ui',
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token,
    params.nonce,
  ].join('|')

  const signature = crypto.sign(null, Buffer.from(payload), privateKey)
  return signature.toString('base64url')
}
