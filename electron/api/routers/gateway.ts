import { z } from 'zod/v4'
import { p } from '../orpc'

export const gatewayRouter = {
  list: p.handler(({ context }) => {
    return context.gatewayManager.listGateways()
  }),

  get: p.input(z.object({ id: z.string() })).handler(({ input, context }) => {
    return context.gatewayManager.getGateway(input.id)
  }),

  add: p
    .input(
      z.object({ url: z.string(), token: z.string(), label: z.string() }),
    )
    .handler(({ input, context }) => {
      return context.gatewayManager.addGateway(input)
    }),

  remove: p
    .input(z.object({ id: z.string() }))
    .handler(({ input, context }) => {
      context.gatewayManager.removeGateway(input.id)
      return { ok: true as const }
    }),

  update: p
    .input(
      z.object({
        id: z.string(),
        label: z.string().optional(),
        token: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .handler(({ input, context }) => {
      const { id, ...updates } = input
      return context.gatewayManager.updateGateway(id, updates)
    }),

  testConnection: p
    .input(z.object({ url: z.string(), token: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.testConnection(input)
    }),

  reconnect: p
    .input(z.object({ id: z.string() }))
    .handler(({ input, context }) => {
      context.gatewayManager.reconnectGateway(input.id)
      return { ok: true as const }
    }),

  sessions: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getGatewaySessions(input.gatewayId)
    }),

  sessionUsage: p
    .input(z.object({ gatewayId: z.string(), sessionKey: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getSessionUsage(
        input.gatewayId,
        input.sessionKey,
      )
    }),

  sessionUsageLogs: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getSessionUsageLogs(
        input.gatewayId,
        input.sessionKey,
        input.limit,
      )
    }),

  chatHistory: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getChatHistory(
        input.gatewayId,
        input.sessionKey,
        input.limit,
      )
    }),

  agents: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getAgents(input.gatewayId)
    }),

  presence: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getPresence(input.gatewayId)
    }),

  cost: p
    .input(
      z.object({
        gatewayId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getCost(
        input.gatewayId,
        input.startDate,
        input.endDate,
      )
    }),
}
