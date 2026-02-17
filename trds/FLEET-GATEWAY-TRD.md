# TRD: Fleet Manager → OpenClaw Gateway Connection

> **Scope:** Frontend-only. How the Electron fleet app connects to and consumes data from N OpenClaw Gateway instances.  
> **Author:** Cadwell 🤵  
> **Date:** 2026-02-17  
> **Status:** Draft  

---

## 1. Overview

The fleet manager app connects to multiple OpenClaw Gateways via **WebSocket**. Each gateway is a standalone process that multiplexes WS + HTTP on a single port (default `18789`). The app holds a token per gateway and maintains persistent connections for real-time status, sessions, health, and agent data.

**Transport:** `ws://` or `wss://` (Tailscale Serve provides auto-TLS).  
**Protocol version:** 3 (current).  
**Frame format:** JSON text frames.

---

## 2. Connection Architecture

```
┌──────────────────────────────────────┐
│          Fleet Manager (Electron)    │
│                                      │
│  ┌────────────┐  ┌────────────┐     │
│  │ GW Client  │  │ GW Client  │ ... │
│  │ (ws://gw1) │  │ (wss://gw2)│     │
│  └─────┬──────┘  └─────┬──────┘     │
│        │               │            │
│  ┌─────┴───────────────┴──────┐     │
│  │     Connection Manager      │     │
│  │  (reconnect, health, pool)  │     │
│  └─────────────┬───────────────┘     │
│                │                     │
│  ┌─────────────┴───────────────┐     │
│  │         React UI             │     │
│  │  (dashboard, sessions, etc.) │     │
│  └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

Each gateway connection is independent. App connects **outward** — no tunneling, no hosted dashboard.

---

## 3. Authentication

### 3.1 Auth Model

Each gateway requires a **bearer token** (`gateway.auth.token`) or **password** (`gateway.auth.password`). Token is sent during the WebSocket handshake.

### 3.2 Device Identity (Required)

All WS clients **must** include device identity during `connect`. The fleet app generates an Ed25519 keypair per installation, stored in Electron's `localStorage` (or `electron-store`).

**Key generation:**
1. Generate Ed25519 keypair (see `crypto.subtle` or `@noble/ed25519`)
2. `deviceId` = SHA-256 hex of public key
3. Store `{ deviceId, publicKey, privateKey }` persistently

**Challenge-response flow:**
1. Gateway sends `connect.challenge` with `nonce`
2. Client signs `version|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce` with Ed25519 private key
3. Signed payload included in `connect` request

### 3.3 Device Tokens

After first successful connect + pairing approval, the gateway issues a **device token** in `hello-ok.auth.deviceToken`. This should be persisted per `(gatewayUrl, deviceId, role)` and used for subsequent connections instead of the master token.

### 3.4 Pairing

First connection from a new device requires **pairing approval** on the gateway side (unless local/loopback). For remote gateways, the gateway operator must approve via `openclaw pairing approve` or the Control UI.

**Fleet app should:**
- Display pending pairing state per gateway
- Allow user to trigger re-pair if token is revoked
- Store device tokens per gateway persistently

---

## 4. WebSocket Protocol

### 4.1 Frame Types

| Type | Direction | Shape |
|------|-----------|-------|
| `req` | Client → GW | `{ type: "req", id: string, method: string, params: object }` |
| `res` | GW → Client | `{ type: "res", id: string, ok: boolean, payload \| error }` |
| `event` | GW → Client | `{ type: "event", event: string, payload: object, seq?: number }` |

### 4.2 Handshake Sequence

```
GW → Client:  { type: "event", event: "connect.challenge", payload: { nonce, ts } }
Client → GW:  { type: "req", id: "...", method: "connect", params: { ... } }
GW → Client:  { type: "res", id: "...", ok: true, payload: { type: "hello-ok", protocol: 3, policy: { tickIntervalMs } } }
```

### 4.3 Connect Params (Full)

```typescript
interface ConnectParams {
  minProtocol: 3;
  maxProtocol: 3;
  client: {
    id: "fleet-manager";        // Client identifier (register with OC team or use generic)
    version: string;             // App version
    platform: string;            // "macos" | "windows" | "linux"
    mode: "operator";            // Fleet app is always operator mode
    instanceId?: string;         // Unique per running instance
  };
  role: "operator";
  scopes: ["operator.read", "operator.write", "operator.admin", "operator.approvals", "operator.pairing"];
  caps: [];
  auth: {
    token?: string;              // Gateway token or device token
    password?: string;           // Alternative: password auth
  };
  device: {
    id: string;                  // SHA-256 hex of public key
    publicKey: string;           // Base64url-encoded Ed25519 public key
    signature: string;           // Base64url-encoded Ed25519 signature of challenge
    signedAt: number;            // Timestamp (ms)
    nonce?: string;              // Nonce from connect.challenge
  };
  userAgent: string;
  locale: string;
}
```

### 4.4 Scope Requirements

| Scope | Needed For |
|-------|-----------|
| `operator.read` | Status, health, sessions list, usage, logs |
| `operator.write` | Chat send, session management |
| `operator.admin` | Config read/write, cron management, session delete/reset/compact |
| `operator.approvals` | Exec approval resolution |
| `operator.pairing` | Device pairing management |

**MVP (read-only dashboard):** `operator.read` is sufficient.

---

## 5. Available WS Methods (API Surface)

Extracted from Control UI source + protocol docs. These are all callable via `{ type: "req", method: "<name>", params: {} }`.

### 5.1 Status & Health

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `status` | `{}` | Gateway status snapshot | Main dashboard card |
| `health` | `{}` | Health check (channels, models, agents) | Health indicator |
| `channels.status` | `{}` | Per-channel connection status | Channel health badges |
| `system-presence` | `{}` | Connected devices/clients | Who's connected |
| `last-heartbeat` | `{}` | Last heartbeat info | Agent activity indicator |

### 5.2 Sessions

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `sessions.list` | `{ activeMinutes?, limit?, includeGlobal?, includeUnknown? }` | Session list with usage | Session table |
| `sessions.usage` | `{ startDate?, endDate?, limit?, includeContextWeight? }` | Usage per session | Usage dashboard |
| `sessions.usage.timeseries` | `{ key: string }` | Time series for one session | Usage chart |
| `sessions.usage.logs` | `{ key: string, limit? }` | Per-message logs for session | Session detail drill-down |
| `sessions.patch` | `{ key, label?, thinkingLevel?, verboseLevel?, reasoningLevel? }` | — | Session management (write) |
| `sessions.reset` | `{ key }` | — | Session reset (write, admin) |
| `sessions.delete` | `{ key }` | — | Session delete (write, admin) |
| `sessions.compact` | `{ key }` | — | Session compact (write, admin) |

### 5.3 Chat

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `chat.history` | `{ sessionKey, limit? }` | Message array | Chat view |
| `chat.send` | `{ sessionKey, message, deliver?, idempotencyKey?, attachments? }` | — | Send message (write) |
| `chat.abort` | `{ sessionKey, runId? }` | — | Abort running agent turn |

### 5.4 Agents

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `agents.list` | `{}` | Agent list with default | Agent selector |
| `agent.identity.get` | `{ agentId }` | Name, avatar, metadata | Agent cards |
| `skills.status` | `{ agentId }` | Skills report | Agent capabilities |

### 5.5 Models

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `models.list` | `{}` | Available models | Model selector / info |

### 5.6 Cron

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `cron.status` | `{}` | Scheduler status | Cron health |
| `cron.list` | `{ includeDisabled? }` | Job list | Cron management |
| `cron.add` | `{ name, schedule, payload, sessionTarget, ... }` | — | Create job (admin) |
| `cron.update` | `{ id, patch }` | — | Update job (admin) |
| `cron.remove` | `{ id }` | — | Delete job (admin) |
| `cron.run` | `{ id, mode? }` | — | Trigger job (admin) |
| `cron.runs` | `{ id, limit? }` | Run history | Job detail |

### 5.7 Nodes & Devices

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `node.list` | `{}` | Paired nodes | Node management |
| `device.pair.list` | `{}` | Pending + paired devices | Device pairing UI |
| `device.pair.approve` | `{ requestId }` | — | Approve device |
| `device.pair.reject` | `{ requestId }` | — | Reject device |
| `device.token.rotate` | `{ deviceId, role, scopes? }` | New token | Token rotation |
| `device.token.revoke` | `{ deviceId, role }` | — | Revoke device access |

### 5.8 Config (Admin)

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `config.get` | `{}` | Current config | Config viewer |
| `config.apply` | `{ raw, baseHash }` | — | Config editor (admin) |

### 5.9 Logs

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `logs.tail` | `{ cursor?, limit?, maxBytes? }` | Log lines + cursor | Log viewer |

### 5.10 Exec Approvals

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `exec.approvals.get` | `{}` | Current exec approval config | Security settings |
| `exec.approvals.set` | `{ file, baseHash }` | — | Update exec approvals |
| `exec.approvals.node.get` | `{ nodeId }` | Node exec approvals | Per-node security |
| `exec.approvals.node.set` | `{ nodeId, file, baseHash }` | — | Update node approvals |

### 5.11 Cost

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `usage.cost` | `{ startDate?, endDate? }` | Cost summary | Cost dashboard |

---

## 6. Real-Time Events (Server → Client)

After `connect`, the gateway pushes events. Key events for fleet management:

| Event | Payload | Use Case |
|-------|---------|----------|
| `agent` | Agent turn state (delta, final, error) | Activity indicator |
| `chat` | Chat state updates (delta, final, aborted) | Live chat view |
| `presence` | `{ presence: DeviceEntry[] }` | Connected devices list |
| `cron` | Cron job state changes | Cron status updates |
| `device.pair.requested` | Pairing request | Pairing notification |
| `device.pair.resolved` | Pairing resolved | Pairing status update |
| `exec.approval.requested` | Exec pending approval | Approval queue |
| `exec.approval.resolved` | Approval resolved | Approval queue update |

**Sequence tracking:** Events include `seq` (monotonic). If a gap is detected (`received > expected + 1`), the client should warn and potentially refresh state.

---

## 7. HTTP API (Alternative/Supplementary)

The gateway also exposes HTTP endpoints on the same port. Useful for one-shot operations or when WS is overkill.

### 7.1 Tools Invoke

```
POST /tools/invoke
Authorization: Bearer <token>
Content-Type: application/json

{ "tool": "sessions_list", "args": {} }
```

**Hard-denied over HTTP:** `sessions_spawn`, `sessions_send`, `gateway`, `whatsapp_login`.

### 7.2 OpenAI Chat Completions (Optional, disabled by default)

```
POST /v1/chat/completions
Authorization: Bearer <token>

{ "model": "openclaw:main", "messages": [...], "stream": true }
```

### 7.3 OpenResponses API (Optional, disabled by default)

```
POST /v1/responses
Authorization: Bearer <token>

{ "model": "openclaw:main", "input": "hello" }
```

---

## 8. Connection Manager Design

### 8.1 Responsibilities

```typescript
interface GatewayConnection {
  id: string;                    // Unique connection ID
  url: string;                   // wss://host:port or ws://host:port
  token: string;                 // Master gateway token
  deviceToken?: string;          // Persisted device token (preferred after pairing)
  label: string;                 // User-assigned name
  
  // Runtime state
  status: "connecting" | "connected" | "disconnected" | "pairing" | "auth-failed";
  ws: WebSocket | null;
  lastSeq: number | null;
  reconnectBackoff: number;
  
  // Cached data
  gatewayStatus?: GatewayStatus;
  health?: HealthSnapshot;
  sessions?: SessionEntry[];
  agents?: AgentEntry[];
  presence?: PresenceEntry[];
}
```

### 8.2 Reconnection Strategy

- Initial backoff: 800ms
- Multiplier: 1.7×
- Max backoff: 15s
- Reset backoff to 800ms on successful `hello-ok`
- On auth failure: stop reconnecting, show "auth failed" state

### 8.3 Polling Strategy (Complement to Events)

Events cover most real-time needs. For data not pushed via events, poll periodically:

| Data | Poll Interval | Method |
|------|---------------|--------|
| Nodes | 5s | `node.list` |
| Sessions | On-demand or 2min | `sessions.list` |
| Logs | 2s (when viewing) | `logs.tail` with cursor |
| Health | 3s (when viewing debug) | `health` |
| Cron | On tab switch | `cron.list` + `cron.status` |

---

## 9. Gateway Storage Model

### 9.1 Per-Gateway Config (Persisted in Electron)

```typescript
interface StoredGateway {
  id: string;
  url: string;
  token: string;
  label: string;
  addedAt: number;
  
  // Device identity per gateway
  deviceId: string;
  // Device tokens keyed by role
  deviceTokens: Record<string, { token: string; scopes: string[]; updatedAt: number }>;
}
```

### 9.2 Storage Backend

Use `electron-store` (encrypted at rest) or Electron's `safeStorage` API for tokens. **Never store tokens in plaintext `localStorage`.**

---

## 10. MVP Implementation Order

### Phase 1: Read-Only Dashboard
1. **Gateway connection class** — WS client with handshake, device identity, reconnect
2. **Add Gateway flow** — URL + token input, test connection, persist
3. **Dashboard cards** — per-gateway: status, health indicator, session count, model info
4. **Session list view** — drill into gateway → see sessions with usage

### Phase 2: Monitoring
5. **Usage/cost aggregation** — per-gateway and fleet-wide totals
6. **Log viewer** — real-time log tail per gateway
7. **Presence view** — who's connected where

### Phase 3: Management (Write)
8. **Chat view** — send messages to any session on any gateway
9. **Cron management** — CRUD cron jobs per gateway
10. **Exec approvals** — resolve pending approvals across fleet
11. **Config viewer** — read-only config display per gateway

---

## 11. Security Considerations

1. **Token storage:** Use OS keychain / `safeStorage` — never plaintext
2. **Token rotation:** Support `device.token.rotate` and handle revocation gracefully
3. **Network:** Prefer `wss://` (Tailscale Serve) over unencrypted `ws://`
4. **TLS pinning:** Optional `tlsFingerprint` support for high-security deployments
5. **Scope minimization:** MVP only needs `operator.read` — don't request `admin` until Phase 3
6. **Per-gateway isolation:** Connection failure on one gateway must not affect others
7. **Challenge signing:** Ed25519 signing is **required** for non-local connections

---

## 12. Key Gotchas

| Gotcha | Detail |
|--------|--------|
| **`client.id` must be recognized** | Use a recognized client ID or risk rejection. `"cli"` works, but register `"fleet-manager"` with OC team for future-proofing. |
| **Device identity is mandatory** | Control UI can skip it only with `dangerouslyDisableDeviceAuth`. Fleet app must always send device identity. |
| **Frame `id` must be string** | Even though it looks like it could be a number. Always use UUID strings. |
| **`connect` must be first request** | Any other request before successful handshake = socket closed. |
| **Non-local = pairing required** | Remote connections need explicit pairing approval. Build this into the UX. |
| **Event sequence gaps** | Track `seq` numbers. A gap means missed events — trigger state refresh. |
| **`hello-ok` policy** | Contains `tickIntervalMs` — the client should send periodic pings at this interval to keep the connection alive. |

---

## 13. Reference Implementation

The OpenClaw Control UI (`dist/control-ui/assets/index-*.js`) contains a complete WS client implementation including:
- Ed25519 device identity generation + challenge signing
- Device token persistence + rotation
- Full handshake flow
- Event handling + sequence tracking
- All WS method calls listed above

**Class:** `$g` in the Control UI bundle (minified). Source reference: `src/control-ui/` in OpenClaw repo.

---

## Appendix A: Example — Connect + Get Status

```typescript
// 1. Open WebSocket
const ws = new WebSocket("wss://gateway.example.com:18789");

// 2. Wait for challenge
ws.onmessage = async (e) => {
  const frame = JSON.parse(e.data);
  
  if (frame.type === "event" && frame.event === "connect.challenge") {
    const nonce = frame.payload.nonce;
    
    // 3. Sign and send connect
    const signature = await signChallenge(privateKey, {
      deviceId, clientId: "fleet-manager", mode: "operator",
      role: "operator", scopes: ["operator.read"],
      signedAtMs: Date.now(), token, nonce
    });
    
    ws.send(JSON.stringify({
      type: "req",
      id: crypto.randomUUID(),
      method: "connect",
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: "fleet-manager", version: "0.1.0", platform: "macos", mode: "operator" },
        role: "operator",
        scopes: ["operator.read"],
        caps: [],
        auth: { token },
        device: { id: deviceId, publicKey, signature, signedAt: Date.now(), nonce },
        userAgent: "fleet-manager/0.1.0",
        locale: "en-US"
      }
    }));
  }
  
  if (frame.type === "res" && frame.payload?.type === "hello-ok") {
    // 4. Connected! Now request status
    ws.send(JSON.stringify({
      type: "req",
      id: crypto.randomUUID(),
      method: "status",
      params: {}
    }));
  }
  
  if (frame.type === "res" && frame.id === statusRequestId) {
    // 5. Got status
    console.log("Gateway status:", frame.payload);
  }
};
```

---

## Appendix B: Signing Payload Format

```
version|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce
```

Example:
```
v2|abc123def...|fleet-manager|operator|operator|operator.read,operator.write|1739826000000|tok_xxx|challenge_nonce_here
```

Signed with Ed25519 private key. Signature is base64url-encoded.
