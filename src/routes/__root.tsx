import { TooltipProvider } from '@/components/ui/tooltip'
import '../index.css'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="h-6 fixed top-0 inset-x-0 dragable z-20"></div>
      <Outlet />
    </TooltipProvider>
  )
}
