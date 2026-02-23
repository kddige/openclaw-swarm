import { z } from 'zod/v4'
import { dialog, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { p } from '../orpc'
import { getMemoryTransport, getFileTransport } from '../../logger'

const LEVEL_ORDER = ['debug', 'info', 'warn', 'error'] as const

export const logsRouter = {
  tail: p
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        afterCursor: z.number().optional(),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
        ns: z.string().optional(),
      }),
    )
    .handler(({ input }) => {
      const mem = getMemoryTransport()
      const { entries, cursor } = mem.tail(input.limit ?? 200, input.afterCursor)

      const filtered = entries.filter((e) => {
        if (input.level) {
          if (LEVEL_ORDER.indexOf(e.level) < LEVEL_ORDER.indexOf(input.level))
            return false
        }
        if (input.ns && !e.ns.startsWith(input.ns)) return false
        return true
      })

      return { entries: filtered, cursor }
    }),

  export: p.handler(async ({ context }) => {
    const ft = getFileTransport()
    const defaultName = `swarm-${new Date().toISOString().slice(0, 10)}.log`
    const { filePath, canceled } = await dialog.showSaveDialog(context.win, {
      title: 'Export Logs',
      defaultPath: path.join(app.getPath('downloads'), defaultName),
      filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }],
    })
    if (canceled || !filePath) return { ok: false as const }
    fs.copyFileSync(ft.logPath, filePath)
    return { ok: true as const, path: filePath }
  }),

  logPath: p.handler(() => {
    return { path: getFileTransport().logPath }
  }),
}
