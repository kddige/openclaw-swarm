import { os } from '@orpc/server'
import type { BrowserWindow } from 'electron'

export type Context = { win: BrowserWindow }

export const p = os.$context<Context>()
