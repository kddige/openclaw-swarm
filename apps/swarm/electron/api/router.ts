import { windowRouter } from './routers/window'
import { gatewayRouter } from './routers/gateway'
import { swarmRouter } from './routers/swarm'
import { eventsRouter } from './routers/events'
import { logsRouter } from './routers/logs'

export const router = {
  window: windowRouter,
  gateway: gatewayRouter,
  swarm: swarmRouter,
  events: eventsRouter,
  logs: logsRouter,
}

export type AppRouter = typeof router
