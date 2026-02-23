import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { CommandPalette } from '@/components/command-palette'
import '../index.css'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster />
      <CommandPalette />
    </TooltipProvider>
  )
}
