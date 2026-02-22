const isDev = !!process.env['VITE_DEV_SERVER_URL']

/**
 * @deprecated Use `createRootLogger()` from `electron/logger` instead.
 * This logger is dev-only and writes to console. The new logger persists
 * to file, supports log levels, and exposes logs via oRPC.
 */
export function createDebugLogger(namespace: string) {
  const prefix = `[${namespace}]`

  return {
    log: (...args: unknown[]) => {
      if (isDev) console.log(prefix, ...args)
    },
    warn: (...args: unknown[]) => {
      if (isDev) console.warn(prefix, ...args)
    },
    error: (...args: unknown[]) => {
      if (isDev) console.error(prefix, ...args)
    },
  }
}
