import { createRootRoute, Outlet } from '@tanstack/react-router'

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2"></div>
    <hr />
    <Outlet />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
