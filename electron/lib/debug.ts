const isDev = !!process.env['VITE_DEV_SERVER_URL']

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
