import { os } from '@orpc/server'
import type { BrowserWindow } from 'electron'
import type { GatewayManager } from '../gateway/manager'
import type { Logger } from '../logger'

export type Context = {
  win: BrowserWindow
  gatewayManager: GatewayManager
  logger: Logger
}

export const p = os.$context<Context>()
