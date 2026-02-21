import { p } from '../orpc'

export const windowRouter = {
  close: p.handler(({ context }) => {
    context.win.close()
  }),
  minimize: p.handler(({ context }) => {
    context.win.minimize()
  }),
  maximize: p.handler(({ context }) => {
    if (context.win.isMaximized()) context.win.unmaximize()
    else context.win.maximize()
  }),
}
