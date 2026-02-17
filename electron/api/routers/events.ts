import { p } from '../orpc'

export const eventsRouter = {
  subscribe: p.handler(async function* ({ context, signal }) {
    for await (const event of context.gatewayManager.events.subscribe(
      'gatewayEvent',
      { signal },
    )) {
      yield event
    }
  }),
}
