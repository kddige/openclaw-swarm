import { useEffect } from 'react'
import { RouteErrorFallback } from '@/components/route-error-fallback'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import {
  LayoutDashboardIcon,
  PlusIcon,
  ServerIcon,
  SettingsIcon,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
  errorComponent: RouteErrorFallback,
})

function statusDot(status: string) {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500'
    case 'connecting':
      return 'bg-amber-500 animate-pulse'
    case 'pairing':
      return 'bg-amber-400 animate-pulse'
    case 'auth-failed':
      return 'bg-destructive'
    case 'disconnected':
    default:
      return 'bg-muted-foreground/50'
  }
}

function DashboardLayout() {
  const queryClient = useQueryClient()
  const { data: gateways } = useQuery(orpc.gateway.list.queryOptions())

  const { data: events } = useQuery(
    orpc.events.subscribe.experimental_streamedOptions({
      queryFnOptions: { refetchMode: 'replace' },
    }),
  )

  useEffect(() => {
    if (!events || events.length === 0) return
    queryClient.invalidateQueries({
      queryKey: orpc.gateway.list.queryOptions().queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: orpc.fleet.overview.queryOptions().queryKey,
    })
  }, [events, queryClient])

  return (
    <SidebarProvider className="bg-transparent! dragable">
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Gateways</SidebarGroupLabel>
            <SidebarGroupAction render={<Link to="/dashboard/gateways" />}>
              <PlusIcon />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {gateways?.map((gw) => (
                  <SidebarMenuItem key={gw.id}>
                    <SidebarMenuButton
                      render={
                        <Link
                          to="/dashboard/gateways/$gatewayId"
                          params={{ gatewayId: gw.id }}
                        />
                      }
                    >
                      <ServerIcon />
                      <span className="truncate">{gw.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          statusDot(gw.status),
                        )}
                      />
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
                {(!gateways || gateways.length === 0) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="text-muted-foreground"
                      render={<Link to="/dashboard/gateways" />}
                    >
                      <PlusIcon />
                      Add gateway
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
