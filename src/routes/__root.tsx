import '../index.css'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <>
      <div className="h-12 fixed top-0 inset-x-0 [-webkit-app-region:drag] bg-red-200">
        {/* Custom window buttons (venstre side) */}
        <div className="flex gap-2 items-center h-full pl-4 [-webkit-app-region:no-drag]">
          <button
            onClick={() => window.ipcRenderer.send('window-close')}
            className="w-3 h-3 rounded-full bg-red-500"
          />
          <button
            onClick={() => window.ipcRenderer.send('window-minimize')}
            className="w-3 h-3 rounded-full bg-yellow-500"
          />
          <button
            onClick={() => window.ipcRenderer.send('window-maximize')}
            className="w-3 h-3 rounded-full bg-green-500"
          />
        </div>
      </div>
      <div className="pt-12">
        <Outlet />
      </div>
    </>
  )
}
