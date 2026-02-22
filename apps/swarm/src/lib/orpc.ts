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

// regular queries
// orpc.window.maximize.queryOptions();
//
// straming queries
// orpc.window.maximize.experimental_streamedOptions();
//
// regular mutations
// orpc.window.maximize.mutationOptions();
//
// NOTE:
// Dont create custom hooks for queries! ALWAYS USE QUERIES AND MUTATION DIRECTLY IN COMPONENTS! THEY ARE ALREADY A SOURCE OF DATA IN THEMSELF
// useQuery(orpc.users.list.queryOptions({ enabled: true, input: { limit: 5 } })) <- "input" is the only additional prop for providing the "parameters" to the rpc call
//
//

// NOTE FOR STREAMING QUERIES:
// useQuery(
//   orpc.window.close.experimental_streamedOptions({
//     queryFnOptions: {
//       // defines the behavior of the query when new data is received from the stream, "append" will add the new data to the existing data, "replace" will replace the existing data with the new data, "reset" will reset the existing data and replace it with the new data
//       refetchMode: 'append|replace|reset',
//     },
//   }),
// )
