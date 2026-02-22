import { z } from 'zod/v4'
import { p } from '../orpc'

export const swarmRouter = {
  overview: p.handler(({ context }) => {
    return context.gatewayManager.getSwarmOverview()
  }),
  cost: p.handler(({ context }) => {
    return context.gatewayManager.getSwarmCost()
  }),
  presence: p.handler(({ context }) => {
    return context.gatewayManager.getSwarmPresence()
  }),
  search: p
    .input(z.object({ query: z.string() }))
    .handler(({ input, context }) => {
      return context.gatewayManager.searchSwarm(input.query)
    }),
}
