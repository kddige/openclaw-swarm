import { p } from '../orpc'

export const fleetRouter = {
  overview: p.handler(({ context }) => {
    return context.gatewayManager.getFleetOverview()
  }),
}
