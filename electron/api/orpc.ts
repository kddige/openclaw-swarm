import { os } from '@orpc/server'
import type { BrowserWindow } from 'electron'
import type { GatewayManager } from '../gateway/manager'

export type Context = { win: BrowserWindow; gatewayManager: GatewayManager }

export const p = os.$context<Context>()
