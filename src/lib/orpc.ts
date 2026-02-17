import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouter } from '../../electron/api/router'

const { port1: clientPort, port2: serverPort } = new MessageChannel()
window.postMessage('start-orpc-client', '*', [serverPort])

const link = new RPCLink({ port: clientPort })
clientPort.start()

export const client: RouterClient<AppRouter> = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)
