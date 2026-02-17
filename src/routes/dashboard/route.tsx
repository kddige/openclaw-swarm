import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { LayoutDashboardIcon, ServerIcon, SettingsIcon } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider className="bg-transparent! dragable">
      {/*<div className="absolute z-20 w-32 left-0 top-1.5 flex justify-end">
        <SidebarTrigger />
      </div>*/}
      <Sidebar
        variant="inset"
        className="**:data-[slot=sidebar-inner]:bg-transparent **:data-[slot=sidebar-inner]:pt-8"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Fleet</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link to="/dashboard" />}>
                    <LayoutDashboardIcon />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link to="/dashboard/agents" />}>
                    <ServerIcon />
                    Agents
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <SettingsIcon />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
