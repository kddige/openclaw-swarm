import { z } from 'zod/v4'
import { p } from '../orpc'
import { gatewayPublisher } from '../../gateway/publisher'
import type { GatewayEvents } from '../../gateway/publisher'

function createGatewayStream<K extends keyof GatewayEvents>(event: K) {
  return p.input(z.object({ gatewayId: z.string() })).handler(async function* ({ input, signal }) {
    for await (const payload of gatewayPublisher.subscribe(event, { signal })) {
      if (payload.gatewayId === input.gatewayId) yield payload
    }
  })
}

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

  // ── Tier 1: Chat Abort ──────────────────────────────

  abortChat: p
    .input(
      z.object({
        gatewayId: z.string(),
        sessionKey: z.string(),
        runId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.abortChat(input.gatewayId, input.sessionKey, input.runId)
    }),

  // ── Tier 1: Models ────────────────────────────────────

  models: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getModels(input.gatewayId)
  }),

  // ── Tier 1: Agent CRUD ────────────────────────────────

  createAgent: p
    .input(
      z.object({
        gatewayId: z.string(),
        name: z.string(),
        workspace: z.string().optional(),
        emoji: z.string().optional(),
        avatar: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, ...params } = input
      return context.gatewayManager.createAgent(gatewayId, params)
    }),

  updateAgent: p
    .input(
      z.object({
        gatewayId: z.string(),
        agentId: z.string(),
        name: z.string().optional(),
        workspace: z.string().optional(),
        model: z.string().optional(),
        avatar: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, ...params } = input
      return context.gatewayManager.updateAgent(gatewayId, params)
    }),

  deleteAgent: p
    .input(
      z.object({
        gatewayId: z.string(),
        agentId: z.string(),
        deleteFiles: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.deleteAgent(input.gatewayId, input.agentId, input.deleteFiles)
    }),

  agentFiles: p
    .input(z.object({ gatewayId: z.string(), agentId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getAgentFiles(input.gatewayId, input.agentId)
    }),

  agentFile: p
    .input(z.object({ gatewayId: z.string(), agentId: z.string(), name: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getAgentFile(input.gatewayId, input.agentId, input.name)
    }),

  setAgentFile: p
    .input(
      z.object({
        gatewayId: z.string(),
        agentId: z.string(),
        name: z.string(),
        content: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.setAgentFile(
        input.gatewayId,
        input.agentId,
        input.name,
        input.content,
      )
    }),

  // ── Tier 1: Device Pairing ────────────────────────────

  devicePairs: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getDevicePairs(input.gatewayId)
  }),

  approveDevicePair: p
    .input(z.object({ gatewayId: z.string(), requestId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.approveDevicePair(input.gatewayId, input.requestId)
    }),

  rejectDevicePair: p
    .input(z.object({ gatewayId: z.string(), requestId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.rejectDevicePair(input.gatewayId, input.requestId)
    }),

  removeDevicePair: p
    .input(z.object({ gatewayId: z.string(), deviceId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.removeDevicePair(input.gatewayId, input.deviceId)
    }),

  rotateDeviceToken: p
    .input(
      z.object({
        gatewayId: z.string(),
        deviceId: z.string(),
        role: z.string(),
        scopes: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.rotateDeviceToken(
        input.gatewayId,
        input.deviceId,
        input.role,
        input.scopes,
      )
    }),

  revokeDeviceToken: p
    .input(z.object({ gatewayId: z.string(), deviceId: z.string(), role: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.revokeDeviceToken(input.gatewayId, input.deviceId, input.role)
    }),

  // ── Tier 1: Exec Approvals Write ──────────────────────

  setExecApprovals: p
    .input(
      z.object({
        gatewayId: z.string(),
        file: z.record(z.string(), z.unknown()),
        baseHash: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.setExecApprovals(
        input.gatewayId,
        input.file as unknown as Parameters<typeof context.gatewayManager.setExecApprovals>[1],
        input.baseHash,
      )
    }),

  resolveExecApproval: p
    .input(
      z.object({
        gatewayId: z.string(),
        id: z.string(),
        decision: z.enum(['allow-once', 'allow-always', 'deny']),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.resolveExecApproval(input.gatewayId, input.id, input.decision)
    }),

  execApprovalStream: createGatewayStream('execApproval'),

  // ── Tier 1: Session Previews ──────────────────────────

  sessionPreviews: p
    .input(
      z.object({
        gatewayId: z.string(),
        keys: z.array(z.string()),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getSessionPreviews(input.gatewayId, input.keys, input.limit)
    }),

  // ── Tier 2: Cron ──────────────────────────────────────

  cronJobs: p
    .input(z.object({ gatewayId: z.string(), includeDisabled: z.boolean().optional() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getCronJobs(input.gatewayId, input.includeDisabled)
    }),

  cronStatus: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getCronStatus(input.gatewayId)
  }),

  addCronJob: p
    .input(
      z.object({
        gatewayId: z.string(),
        name: z.string(),
        schedule: z.record(z.string(), z.unknown()),
        payload: z.record(z.string(), z.unknown()),
        sessionTarget: z.string().optional(),
        wakeMode: z.string().optional(),
        delivery: z.record(z.string(), z.unknown()).optional(),
        agentId: z.string().optional(),
        sessionKey: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        deleteAfterRun: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, ...params } = input
      return context.gatewayManager.addCronJob(
        gatewayId,
        params as unknown as Parameters<typeof context.gatewayManager.addCronJob>[1],
      )
    }),

  updateCronJob: p
    .input(
      z.object({
        gatewayId: z.string(),
        jobId: z.string(),
        patch: z.record(z.string(), z.unknown()),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.updateCronJob(
        input.gatewayId,
        input.jobId,
        input.patch as Parameters<typeof context.gatewayManager.updateCronJob>[2],
      )
    }),

  removeCronJob: p
    .input(z.object({ gatewayId: z.string(), jobId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.removeCronJob(input.gatewayId, input.jobId)
    }),

  runCronJob: p
    .input(
      z.object({
        gatewayId: z.string(),
        jobId: z.string(),
        mode: z.enum(['due', 'force']).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.runCronJob(input.gatewayId, input.jobId, input.mode)
    }),

  cronRuns: p
    .input(
      z.object({
        gatewayId: z.string(),
        jobId: z.string(),
        limit: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getCronRuns(input.gatewayId, input.jobId, input.limit)
    }),

  // ── Tier 2: Nodes ─────────────────────────────────────

  nodes: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.getNodes(input.gatewayId)
  }),

  describeNode: p
    .input(z.object({ gatewayId: z.string(), nodeId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.describeNode(input.gatewayId, input.nodeId)
    }),

  invokeNode: p
    .input(
      z.object({
        gatewayId: z.string(),
        nodeId: z.string(),
        command: z.string(),
        params: z.record(z.string(), z.unknown()).optional(),
        timeoutMs: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.invokeNode(
        input.gatewayId,
        input.nodeId,
        input.command,
        input.params,
        input.timeoutMs,
      )
    }),

  // ── Tier 2: Gateway Update ────────────────────────────

  runUpdate: p.input(z.object({ gatewayId: z.string() })).handler(async ({ input, context }) => {
    return context.gatewayManager.runUpdate(input.gatewayId)
  }),

  // ── Tier 3: Skills ────────────────────────────────────

  skillsStatus: p
    .input(z.object({ gatewayId: z.string(), agentId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getSkillsStatus(input.gatewayId, input.agentId)
    }),

  installSkill: p
    .input(z.object({ gatewayId: z.string(), name: z.string(), installId: z.string() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.installSkill(input.gatewayId, input.name, input.installId)
    }),

  updateSkill: p
    .input(
      z.object({
        gatewayId: z.string(),
        skillKey: z.string(),
        enabled: z.boolean().optional(),
        apiKey: z.string().optional(),
        env: z.record(z.string(), z.string()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, skillKey, ...updates } = input
      return context.gatewayManager.updateSkill(gatewayId, skillKey, updates)
    }),

  // ── Tier 3: Channels ──────────────────────────────────

  channelsStatus: p
    .input(z.object({ gatewayId: z.string(), probe: z.boolean().optional() }))
    .handler(async ({ input, context }) => {
      return context.gatewayManager.getChannelsStatus(input.gatewayId, input.probe)
    }),

  logoutChannel: p
    .input(
      z.object({
        gatewayId: z.string(),
        channel: z.string(),
        accountId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return context.gatewayManager.logoutChannel(input.gatewayId, input.channel, input.accountId)
    }),

  // ── Tier 3: Send Message ──────────────────────────────

  sendMessage: p
    .input(
      z.object({
        gatewayId: z.string(),
        to: z.string(),
        message: z.string().optional(),
        channel: z.string().optional(),
        accountId: z.string().optional(),
        threadId: z.string().optional(),
        sessionKey: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { gatewayId, ...params } = input
      return context.gatewayManager.sendMessage(gatewayId, params)
    }),

  sessionsStream: createGatewayStream('sessions'),
  presenceStream: createGatewayStream('presence'),
}
