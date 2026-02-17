import { windowRouter } from './routers/window'
import { gatewayRouter } from './routers/gateway'
import { fleetRouter } from './routers/fleet'
import { eventsRouter } from './routers/events'

export const router = {
  window: windowRouter,
  gateway: gatewayRouter,
  fleet: fleetRouter,
  events: eventsRouter,
}

export type AppRouter = typeof router
