import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { RPCHandler } from '@orpc/server/message-port'
import { onError } from '@orpc/server'
import { router } from './api/router'
import { GatewayManager } from './gateway/manager'
import { createRootLogger, type Logger } from './logger'
import { setProtocolLogger } from './gateway/protocol'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null
let gatewayManager: GatewayManager | null = null
let logger: Logger | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: RPCHandler<any> | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: false,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    minWidth: 800,
    minHeight: 600,
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function syncTheme() {
  if (win) {
    win.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors)
  }
}

app.whenReady().then(() => {
  const isDev = !!VITE_DEV_SERVER_URL

  logger = createRootLogger({
    logDir: app.getPath('logs'),
    isDev,
  })

  setProtocolLogger(logger.child('gw:protocol'))

  logger.info('app starting', {
    version: app.getVersion(),
    isDev,
    logDir: app.getPath('logs'),
  })

  gatewayManager = new GatewayManager(logger.child('gw'))

  handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        logger!.error('oRPC handler error', error)
      }),
    ],
  })

  createWindow()
  syncTheme()
  nativeTheme.on('updated', syncTheme)
})

app.on('before-quit', () => {
  gatewayManager?.destroy()
})

ipcMain.on('start-orpc-server', (event) => {
  const [serverPort] = event.ports
  handler!.upgrade(serverPort, {
    context: { win: win!, gatewayManager: gatewayManager!, logger: logger! },
  })
  serverPort.start()
})
