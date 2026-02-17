import '../index.css'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <>
      <div className="h-12 fixed top-0 inset-x-0 dragable"></div>
      <div className="pt-12">
        <Outlet />
      </div>
    </>
  )
}
