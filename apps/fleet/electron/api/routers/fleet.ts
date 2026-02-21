import { z } from 'zod/v4'
import { p } from '../orpc'

export const fleetRouter = {
  overview: p.handler(({ context }) => {
    return context.gatewayManager.getFleetOverview()
  }),
  cost: p.handler(({ context }) => {
    return context.gatewayManager.getFleetCost()
  }),
  presence: p.handler(({ context }) => {
    return context.gatewayManager.getFleetPresence()
  }),
  search: p
    .input(z.object({ query: z.string() }))
    .handler(({ input, context }) => {
      return context.gatewayManager.searchFleet(input.query)
    }),
}
