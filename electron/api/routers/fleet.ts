import { p } from '../orpc'

export const fleetRouter = {
  overview: p.handler(({ context }) => {
    return context.gatewayManager.getFleetOverview()
  }),
  cost: p.handler(({ context }) => {
    return context.gatewayManager.getFleetCost()
  }),
}
