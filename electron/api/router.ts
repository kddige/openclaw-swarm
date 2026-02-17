import { windowRouter } from './routers/window'

export const router = {
  window: windowRouter,
}

export type AppRouter = typeof router
