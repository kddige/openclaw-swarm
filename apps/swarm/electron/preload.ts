import { ipcRenderer } from 'electron'

ipcRenderer.on('theme-changed', (_event, isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark)
})

window.addEventListener('message', (event) => {
  if (event.data === 'start-orpc-client') {
    const [serverPort] = event.ports
    ipcRenderer.postMessage('start-orpc-server', null, [serverPort])
  }
})
