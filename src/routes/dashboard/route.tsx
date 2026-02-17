import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      Ill warap the content - lige navbar sidebar etc
      <Outlet />
    </div>
  )
}
