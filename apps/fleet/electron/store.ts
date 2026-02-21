import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { FleetStore } from './api/types'

const store = new Store<FleetStore>({
  name: 'fleet-config',
  defaults: {
    gateways: [],
    deviceIdentity: null,
    deviceTokens: {},
  },
})

export function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64')
  }
  return token
}

export function decryptToken(encrypted: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  }
  return encrypted
}

export { store }
