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

  sendChatMessage: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        message: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      await context.gatewayManager.sendChatMessage(
        input.gatewayId,
        input.sessionKey,
        input.message,
      )
      return { ok: true as const }
    }),

  resetSession: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        reason: z.enum(['new', 'reset']).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await context.gatewayManager.resetSession(
        input.gatewayId,
        input.sessionKey,
        input.reason,
      )
      return { ok: true as const }
    }),

  deleteSession: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        deleteTranscript: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await context.gatewayManager.deleteSession(
        input.gatewayId,
        input.sessionKey,
        input.deleteTranscript,
      )
      return { ok: true as const }
    }),

  compactSession: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        maxLines: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await context.gatewayManager.compactSession(
        input.gatewayId,
        input.sessionKey,
        input.maxLines,
      )
      return { ok: true as const }
    }),

  patchSession: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        label: z.string().optional(),
        model: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, sessionKey, ...patch } = input
      await context.gatewayManager.patchSession(gatewayId, sessionKey, patch)
      return { ok: true as const }
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

  execApprovals: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getExecApprovals(input.gatewayId)
    }),

  logsTail: p
    .input(
      z.object({
        gatewayId: z.string(),
        limit: z.number().optional(),
        level: z.string().optional(),
        source: z.string().optional(),
        cursor: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, ...params } = input
      return context.gatewayManager.getLogsTail(gatewayId, params)
    }),

  configGet: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getConfig(input.gatewayId)
    }),

  configSchema: p
    .input(z.object({ gatewayId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getConfigSchema(input.gatewayId)
    }),

  configPatch: p
    .input(z.object({ gatewayId: z.string(), raw: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.patchConfig(input.gatewayId, input.raw)
    }),

  configApply: p
    .input(z.object({ gatewayId: z.string(), raw: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.applyConfig(input.gatewayId, input.raw)
    }),
}
