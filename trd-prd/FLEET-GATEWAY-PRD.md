# PRD: OpenClaw Fleet Manager

> **Product:** OpenClaw Fleet Manager  
> **Type:** Desktop application (Electron)  
> **Author:** Cadwell 🤵  
> **Date:** 2026-02-17  
> **Status:** Draft  

---

## 1. Elevator Pitch

**"Portainer for AI agents."**

En desktop-app der giver teams og power users ét samlet overblik over alle deres OpenClaw-agenter — uanset om de kører på en laptop, en VPS, en Raspberry Pi eller i skyen. Connect, monitor, manage. Ingen tunneling, ingen hosted dashboard, ingen ops overhead.

---

## 2. Problem Statement

### Hvem har problemet?
- **IT-teams** der ruller AI-agenter ud internt (kundeservice, ops, dev-assistenter)
- **MSP'er** (som CloudFactory) der hoster agenter for kunder
- **Power users** med 2-10 OpenClaw-instanser spredt over devices

### Hvad er problemet?
- Ingen centraliseret visning af agent-fleet health
- Hvert gateway kræver separat CLI/Control UI login
- Ingen samlet cost-overblik på tværs af instanser
- Ingen alerting når en agent er nede, disconnected, eller brænder tokens af
- Intet tooling til at sammenligne performance/usage på tværs

### Hvad eksisterer i dag?
- **OpenClaw Control UI:** Ét gateway ad gangen, browser-baseret, kræver direkte netværksadgang
- **OpenClaw CLI:** `openclaw status`, men kun lokal gateway
- **Intet:** Ingen OSS multi-gateway management tool

---

## 3. Target Users & Personas

### 🧑‍💼 **Fleet Operator** (primary)
- Ansvarlig for 5-50 agenter i en organisation
- Behøver dagligt overblik: "Er alle agenter sunde? Hvad koster det?"
- Vil reagere hurtigt på nedetid eller unormalt forbrug
- Teknisk nok til at forstå tokens og WS, men vil ikke SSH ind på 30 maskiner

### 🧑‍💻 **Power User** (secondary)
- Har 2-5 personlige OpenClaw-instanser (laptop, homelab, VPS)
- Vil have ét vindue til at se alt + chatte med enhver agent
- Tinkerer — vil inspicere sessions, logs, cron jobs

### 🏢 **MSP Admin** (tertiary, future)
- Hoster agenter for kunder
- Behøver tenant-isolation, cost allocation per kunde
- Compliance: audit trail, session logs

---

## 4. Product Principles

1. **Desktop-first.** Appen connecter udad til gateways — løser tunneling-problemet fra dag 1.
2. **Read before write.** MVP er monitoring. Write-actions (restart, config) kommer i Phase 2+.
3. **Zero config on the gateway.** Appen bruger gateway token + URL. Ingen agent-side plugin eller opsætning.
4. **Beautiful + fast.** Transparency/vibrancy æstetik. Føles som et kontrol-panel, ikke en admin-side.
5. **OSS.** Første mover advantage i OpenClaw ecosystem. Community-drevet.

---

## 5. Feature Map

### Phase 1: Monitor (MVP)

#### 5.1 Gateway Management
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Add Gateway** | Input: URL + token + label. Test connection → persist. | P0 |
| **Gateway List** | Sidebar med alle gateways. Status-indikator (🟢 connected, 🟡 connecting, 🔴 disconnected). | P0 |
| **Remove Gateway** | Slet gateway fra fleet. Confirm dialog. | P0 |
| **Edit Gateway** | Rename label, update token/URL. | P1 |
| **Reorder Gateways** | Drag-and-drop i sidebar. | P2 |

#### 5.2 Fleet Dashboard (Home)
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Fleet Overview Cards** | Totale stats: agents online/offline, total sessions, total cost (24h/7d/30d), total tokens used. | P0 |
| **Per-Gateway Cards** | Card per gateway: name, status, active sessions, model, uptime, 24h cost. Klik → gateway detail. | P0 |
| **Health Alerts** | Badge/notification når en gateway er disconnected eller unhealthy. | P0 |
| **Quick Status Bar** | Top bar: "12/14 gateways online · $47.20 today · 3 active sessions" | P1 |

#### 5.3 Gateway Detail View
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Status Panel** | Gateway version, uptime, bound address, auth mode, model provider. | P0 |
| **Sessions Table** | Alle sessions: key, label, agent, channel, last activity, token usage, cost. Sortable + filterable. | P0 |
| **Health Panel** | Channel status (Discord/WhatsApp/etc connected?), model auth status. | P0 |
| **Agent List** | Configured agents med identity (name, avatar). | P1 |
| **Connected Devices** | Presence: hvem/hvad er connected (CLI, nodes, Control UI). | P1 |

#### 5.4 Session Detail View
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Session Info** | Key, label, agent, channel, chat type, created, last active. | P0 |
| **Usage Stats** | Tokens in/out, cost, model breakdown, tool usage. | P0 |
| **Message History** | Scrollable chat view (read-only). User + assistant messages. | P1 |
| **Usage Timeline** | Sparkline/chart af token usage over tid. | P2 |

### Phase 2: Observe

#### 5.5 Cost Dashboard
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Fleet Cost Overview** | Total cost per day/week/month. Breakdown by gateway, agent, model. | P0 |
| **Cost per Gateway** | Bar chart: cost ranking af gateways. | P1 |
| **Cost Trends** | Line chart: daglig cost over tid. | P1 |
| **Budget Alerts** | Sæt max daily/monthly budget per gateway. Alert når overskredet. | P2 |

#### 5.6 Log Viewer
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Real-time Logs** | Live log tail per gateway. Auto-scroll + pause. | P1 |
| **Log Level Filter** | Filter: trace/debug/info/warn/error/fatal. | P1 |
| **Search in Logs** | Text search i log output. | P2 |

#### 5.7 Cron Overview
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Cron Job List** | Alle cron jobs per gateway: name, schedule, last run, status. | P1 |
| **Run History** | Drill-down: seneste runs med duration + status. | P2 |

### Phase 3: Manage (Write Operations)

#### 5.8 Chat
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Send Message** | Chat med enhver session på enhver gateway. Real-time streaming response. | P1 |
| **Abort** | Stop igangværende agent turn. | P1 |
| **New Session** | Start ny session på valgt gateway + agent. | P2 |

#### 5.9 Session Management
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Reset Session** | Nulstil session context. | P2 |
| **Delete Session** | Slet session permanent. | P2 |
| **Compact Session** | Trigger context compaction. | P2 |

#### 5.10 Gateway Management
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **View Config** | Read-only config viewer (JSON/YAML). | P2 |
| **Exec Approvals** | Se + resolve pending exec approvals på tværs af fleet. | P2 |
| **Device Pairing** | Approve/reject device pairing requests. | P2 |

### Phase 4: Scale (Future)

#### 5.11 Teams & Multi-Tenant
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Gateway Groups** | Organiser gateways i grupper (f.eks. "Production", "Dev", "Customer X"). | P3 |
| **Role-Based Access** | Viewer vs. Admin per gateway-gruppe. | P3 |
| **Shared Fleet** | Del fleet config med team via export/import. | P3 |

#### 5.12 Automation
| Feature | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| **Webhooks** | Alert til Slack/Discord/email ved gateway down/cost spike. | P3 |
| **Fleet API** | Local HTTP API til scripting/automation. | P3 |

---

## 6. UX & Navigation

### 6.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  ● ● ●  Fleet Manager              ─ □ ×            │
├────────┬─────────────────────────────────────────────┤
│        │                                             │
│  🏠    │   [Main Content Area]                       │
│  Home  │                                             │
│        │   Dashboard / Gateway Detail / Session /    │
│ ────── │   Logs / Cost / Chat                        │
│        │                                             │
│  GW 1  │                                             │
│  🟢    │                                             │
│        │                                             │
│  GW 2  │                                             │
│  🟢    │                                             │
│        │                                             │
│  GW 3  │                                             │
│  🔴    │                                             │
│        │                                             │
│ ────── │                                             │
│        │                                             │
│  ⚙️    │                                             │
│  +Add  │                                             │
│        │                                             │
└────────┴─────────────────────────────────────────────┘
```

### 6.2 Sidebar
- **Fixed venstre sidebar** (collapsible)
- Top: Home/Fleet Dashboard ikon
- Middle: Gateway liste med status-dots
- Bottom: Settings + Add Gateway
- Gateway items viser: label + status dot (🟢🟡🔴)
- Klik gateway → expander sub-navigation (Sessions, Logs, Cron, Chat, Config)
- Active gateway highlighted

### 6.3 Navigation Flow

```
Home (Fleet Dashboard)
├── Gateway Detail
│   ├── Sessions Tab
│   │   └── Session Detail
│   │       └── Chat View
│   ├── Logs Tab
│   ├── Cron Tab
│   ├── Devices Tab
│   └── Config Tab (read-only)
├── Cost Dashboard (fleet-wide)
└── Settings
    ├── Gateway Management (add/edit/remove)
    ├── Appearance (theme, vibrancy)
    └── About
```

### 6.4 Interaktion Patterns

| Pattern | Implementation |
|---------|---------------|
| **Gateway switching** | Sidebar klik — instant context switch, ingen page reload |
| **Status polling** | Live WS events + periodic refresh. Ingen manual refresh needed. |
| **Error states** | Inline banners per gateway. "Disconnected — retrying in 5s..." |
| **Empty states** | Friendly illustrations: "No gateways added yet. Add your first one →" |
| **Loading** | Skeleton screens, ikke spinners |
| **Destructive actions** | Confirm dialogs med gateway name typed to confirm (delete session etc.) |

---

## 7. Visual Identity

### 7.1 Aesthetic
- **Dark mode primary** (light mode secondary)
- **Transparency/vibrancy:** macOS native blur, Windows Mica material
- **Control panel feel:** Dense information, monospace numbers, status indicators
- **Color coding:** 🟢 healthy / 🟡 degraded / 🔴 down / 🔵 active

### 7.2 Typography
- UI: System font stack (SF Pro, Segoe UI, etc.)
- Data/numbers: Monospace (JetBrains Mono, SF Mono)
- Consistent hierarchy: page title → section → card → data

### 7.3 Inspiration
- Portainer (information density)
- Vercel Dashboard (clean, dark, modern)
- Linear (navigation model, keyboard shortcuts)
- Raycast (desktop-native feel, speed)

### 7.4 Component Library
- Start med **Tailwind CSS v4** + custom components
- Evaluér shadcn/ui eller Radix primitives for complex components (dropdown, dialog, tooltip)
- Undgå tunge UI frameworks — keep bundle lean

---

## 8. Data Model (Client-Side)

```typescript
// Persisted (electron-store)
interface FleetConfig {
  gateways: StoredGateway[];
  settings: AppSettings;
  deviceIdentity: DeviceIdentity;
}

interface StoredGateway {
  id: string;
  url: string;
  token: string;           // encrypted via safeStorage
  label: string;
  group?: string;
  addedAt: number;
  sortOrder: number;
}

interface AppSettings {
  theme: "dark" | "light" | "system";
  vibrancy: boolean;
  sidebarCollapsed: boolean;
  costCurrency: "USD" | "EUR" | "DKK";
  refreshIntervalMs: number;
}

// Runtime (React state / Zustand)
interface GatewayState {
  id: string;
  status: "connecting" | "connected" | "disconnected" | "auth-failed" | "pairing";
  lastConnectedAt?: number;
  lastError?: string;
  
  // Cached data
  gatewayStatus?: GatewayStatusPayload;
  health?: HealthPayload;
  sessions?: SessionEntry[];
  agents?: AgentEntry[];
  presence?: PresenceEntry[];
  usage?: UsagePayload;
}
```

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + N` | Add Gateway |
| `⌘ + 1-9` | Switch to gateway 1-9 |
| `⌘ + ⇧ + D` | Fleet Dashboard (Home) |
| `⌘ + K` | Command palette (search gateways, sessions, actions) |
| `⌘ + L` | Focus log viewer |
| `⌘ + J` | Toggle sidebar |
| `Esc` | Back / close modal |

---

## 10. Metrics & Success Criteria

### MVP Launch
- [ ] Kan tilføje 10+ gateways og se dem alle connected
- [ ] Fleet dashboard viser aggregeret status + cost
- [ ] Gateway detail viser sessions med usage
- [ ] Session detail viser chat history (read-only)
- [ ] App starter op på < 2 sekunder
- [ ] Reconnect automatisk ved netværks-glitch

### Product-Market Fit Signals
- Organic GitHub stars (target: 500 inden 3 måneder)
- Feature requests fra community (= folk bruger det)
- MSP'er der spørger efter multi-tenant features

---

## 11. What We're NOT Building (Scope Guardrails)

| Out of Scope | Reason |
|-------------|--------|
| Web version | Kræver tunneling. Desktop-first løser det. Kan komme i Phase 4. |
| Agent creation/deployment | Fleet manager observer og manager — deployer ikke agenter. |
| Model fine-tuning/training | Helt andet produkt. |
| Billing/invoicing | Viser cost, men håndterer ikke betalinger. |
| Built-in terminal/SSH | Brug eksisterende tooling (iTerm, VS Code). |
| Plugin marketplace | OpenClaw CLI håndterer skills. Fleet manager viser status. |

---

## 12. Implementation Phases & Timeline

| Phase | Scope | Est. Effort |
|-------|-------|-------------|
| **Phase 1: Monitor** | Gateway list, fleet dashboard, sessions, basic health | 2-3 uger |
| **Phase 2: Observe** | Cost dashboard, log viewer, cron overview | 1-2 uger |
| **Phase 3: Manage** | Chat, session mgmt, exec approvals, config viewer | 2-3 uger |
| **Phase 4: Scale** | Groups, RBAC, webhooks, fleet API | TBD |

---

## 13. Open Questions

1. **Naming:** "Fleet Manager"? "OpenClaw Console"? "Hive"? "Colony"? 🦞
2. **Distribution:** Homebrew cask? Direct download? GitHub releases?
3. **Auto-update:** Electron auto-updater via GitHub releases?
4. **Licensing:** MIT? Apache 2.0? Matches OpenClaw's license?
5. **Gateway discovery:** Skal appen kunne auto-discover gateways via mDNS/Bonjour?
6. **Notification system:** OS-native notifications ved alerts? Eller kun in-app?
