import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PlusIcon, ServerIcon, WifiIcon, WifiOffIcon, AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export const Route = createFileRoute('/dashboard/agents/')({
  component: AgentsPage,
})

type AgentStatus = 'healthy' | 'warning' | 'offline'

interface Agent {
  id: string
  nickname: string
  hostname: string
  token: string
  tls: boolean
  status: AgentStatus
}

function statusConfig(status: AgentStatus) {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        icon: WifiIcon,
        color: 'text-emerald-500',
        dot: 'bg-emerald-500',
      }
    case 'warning':
      return {
        label: 'Warning',
        icon: AlertTriangleIcon,
        color: 'text-amber-500',
        dot: 'bg-amber-500',
      }
    case 'offline':
      return {
        label: 'Offline',
        icon: WifiOffIcon,
        color: 'text-muted-foreground',
        dot: 'bg-muted-foreground',
      }
  }
}

function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [nickname, setNickname] = useState('')
  const [hostname, setHostname] = useState('')
  const [token, setToken] = useState('')
  const [tls, setTls] = useState(false)

  function resetForm() {
    setNickname('')
    setHostname('')
    setToken('')
    setTls(false)
  }

  async function handleSave() {
    if (!hostname || !token) return

    setSaving(true)

    // TODO: validate connection to agent
    await new Promise((resolve) => setTimeout(resolve, 800))

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      nickname: nickname || hostname,
      hostname,
      token,
      tls,
      // Mock: randomly assign a status for now
      status: ['healthy', 'warning', 'offline'][Math.floor(Math.random() * 3)] as AgentStatus,
    }

    setAgents((prev) => [...prev, newAgent])
    setSaving(false)
    setDialogOpen(false)
    resetForm()
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Agents</h1>
          <p className="text-muted-foreground text-xs">Manage connected agents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="default">
                <PlusIcon data-icon="inline-start" />
                Add Agent
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Agent</DialogTitle>
              <DialogDescription>
                Enter the connection details for the agent you want to add.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="My Agent"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hostname">
                  Hostname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="hostname"
                  placeholder="agent.example.com:8080"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="token">
                  Token <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Enter authentication token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tls">Use TLS</Label>
                <Switch id="tls" checked={tls} onCheckedChange={setTls} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!hostname || !token || saving} onClick={handleSave}>
                {saving ? 'Validating...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerIcon />
            </EmptyMedia>
            <EmptyTitle>No agents connected</EmptyTitle>
            <EmptyDescription>Add an agent to start monitoring your fleet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const status = statusConfig(agent.status)
            const StatusIcon = status.icon
            return (
              <Card
                key={agent.id}
                className="bg-muted/40 cursor-pointer transition-colors hover:bg-muted/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="truncate">{agent.nickname}</CardTitle>
                    <Badge variant="outline" className="gap-1.5 shrink-0">
                      <span className={`size-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <StatusIcon className={`size-3 ${status.color}`} />
                    <span className="truncate text-xs">{agent.hostname}</span>
                    {agent.tls && (
                      <Badge variant="outline" className="ml-auto text-[0.5rem]">
                        TLS
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
