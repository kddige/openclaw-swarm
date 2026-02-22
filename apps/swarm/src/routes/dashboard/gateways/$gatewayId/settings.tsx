import { createFileRoute } from '@tanstack/react-router'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SecurityPolicies } from '@/components/gateway/security-policies'
import { ModelsSection } from '@/components/gateway/models-section'
import { AgentsSection } from '@/components/gateway/agents-section'
import { SkillsSection } from '@/components/gateway/skills-section'
import { ChannelsSection } from '@/components/gateway/channels-section'
import { CronSection } from '@/components/gateway/cron-section'
import { NodesSection } from '@/components/gateway/nodes-section'
import { DevicesManagement } from '@/components/gateway/devices-management'
import { ConfigEditor } from '@/components/gateway/config-editor'
import {
  ShieldIcon,
  CpuIcon,
  UserIcon,
  ZapIcon,
  RadioIcon,
  ClockIcon,
  HardDriveIcon,
  MonitorIcon,
  FileJsonIcon,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/gateways/$gatewayId/settings')({
  component: SettingsPage,
  errorComponent: RouteErrorFallback,
})

function SettingsPage() {
  const { gatewayId } = Route.useParams()

  return (
    <div className="pt-2">
      <Accordion multiple>
        <AccordionItem value="security">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ShieldIcon className="size-3" />
              Security Policies
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SecurityPolicies gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="models">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <CpuIcon className="size-3" />
              Models
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ModelsSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="agents">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <UserIcon className="size-3" />
              Agents
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <AgentsSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ZapIcon className="size-3" />
              Skills
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <SkillsSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="channels">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <RadioIcon className="size-3" />
              Channels
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ChannelsSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cron">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-3" />
              Cron Jobs
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CronSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="nodes">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <HardDriveIcon className="size-3" />
              Nodes
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <NodesSection gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="devices">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <MonitorIcon className="size-3" />
              Devices
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <DevicesManagement gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="config">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <FileJsonIcon className="size-3" />
              Raw Config
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ConfigEditor gatewayId={gatewayId} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
