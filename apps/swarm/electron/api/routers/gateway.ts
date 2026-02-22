import { z } from 'zod/v4'
import { p } from '../orpc'
import { gatewayPublisher } from '../../gateway/publisher'

export const gatewayRouter = {
  list: p.handler(({ context }) => {
    return context.gatewayManager.listGateways()
  }),

  get: p.input(z.object({ id: z.string() })).handler(({ input, context }) => {
    return context.gatewayManager.getGateway(input.id)
  }),

  add: p
    .input(z.object({ url: z.string(), token: z.string(), label: z.string() }))
    .handler(({ input, context }) => {
      return context.gatewayManager.addGateway(input)
    }),

  remove: p.input(z.object({ id: z.string() })).handler(({ input, context }) => {
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

  reconnect: p.input(z.object({ id: z.string() })).handler(({ input, context }) => {
    context.gatewayManager.reconnectGateway(input.id)
    return { ok: true as const }
  }),

  sessions: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getGatewaySessions(input.gatewayId)
  }),

  sessionUsage: p
    .input(z.object({ gatewayId: z.string(), sessionKey: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getSessionUsage(input.gatewayId, input.sessionKey)
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
    .handler(async function* ({ input, context, signal }) {
      // First chunk: full history (yield empty if fetch fails)
      try {
        const history = await context.gatewayManager.getChatHistory(
          input.gatewayId,
          input.sessionKey,
          input.limit,
        )
        context.logger.info('[chatHistory] yielding initial history', { count: history.length })
        yield { state: 'history' as const, messages: history }
      } catch (err) {
        context.logger.error('[chatHistory] failed to fetch history, yielding empty', err)
        yield { state: 'history' as const, messages: [] }
      }

      // Then stream live updates from WebSocket chat events
      context.logger.info('[chatHistory] subscribing to chat events')
      for await (const payload of gatewayPublisher.subscribe('chat', { signal })) {
        // Gateway prefixes session keys (e.g. "agent:main:swarm-maintenance"),
        // but the client sends the short key ("swarm-maintenance")
        const matches =
          payload.gatewayId === input.gatewayId &&
          (payload.sessionKey === input.sessionKey ||
            payload.sessionKey.endsWith(`:${input.sessionKey}`))
        if (matches) {
          context.logger.info('[chatHistory] yielding chat event', { state: payload.state })
          yield { state: payload.state, messages: [payload.message] }
        }
      }
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
      await context.gatewayManager.sendChatMessage(input.gatewayId, input.sessionKey, input.message)
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
      await context.gatewayManager.resetSession(input.gatewayId, input.sessionKey, input.reason)
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
      await context.gatewayManager.compactSession(input.gatewayId, input.sessionKey, input.maxLines)
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

  agents: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getAgents(input.gatewayId)
  }),

  presence: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
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
      return context.gatewayManager.getCost(input.gatewayId, input.startDate, input.endDate)
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

  configGet: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getConfig(input.gatewayId)
  }),

  configSchema: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getConfigSchema(input.gatewayId)
  }),

  configPatch: p
    .input(z.object({ gatewayId: z.string(), raw: z.string(), baseHash: z.string().optional() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.patchConfig(input.gatewayId, input.raw, input.baseHash)
    }),

  configApply: p
    .input(z.object({ gatewayId: z.string(), raw: z.string(), baseHash: z.string().optional() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.applyConfig(input.gatewayId, input.raw, input.baseHash)
    }),

  sessionsStream: p.input(z.object({ gatewayId: z.string() })).handler(async function* ({
    input,
    signal,
  }) {
    for await (const payload of gatewayPublisher.subscribe('sessions', { signal })) {
      if (payload.gatewayId === input.gatewayId) yield payload
    }
  }),

  presenceStream: p.input(z.object({ gatewayId: z.string() })).handler(async function* ({
    input,
    signal,
  }) {
    for await (const payload of gatewayPublisher.subscribe('presence', { signal })) {
      if (payload.gatewayId === input.gatewayId) yield payload
    }
  }),

}
