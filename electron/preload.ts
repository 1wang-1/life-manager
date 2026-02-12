import { contextBridge, ipcRenderer } from 'electron'
import { Task } from '../src/shared/models/task'

type TimerCommand =
  | { type: 'toggle'; fromMini?: boolean }
  | { type: 'stop'; fromMini?: boolean }
  | { type: 'showMain'; fromMini?: boolean }
  | { type: 'clearSummary'; fromMini?: boolean }
  | { type: 'togglePet'; show?: boolean; fromMini?: boolean }
  | { type: 'extendBreak'; minutes: number; fromMini?: boolean }

// Preload Script - v3
contextBridge.exposeInMainWorld('api', {
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
    getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
    pickDataDir: () => ipcRenderer.invoke('app:pickDataDir')
  },
  design: {
    openDesignFile: () => ipcRenderer.invoke('design:openFile', 'pencil.design.json'),
    openTokensCss: () => ipcRenderer.invoke('design:openFile', 'src/renderer/src/styles/tokens.css'),
    syncTokensFromCss: () => ipcRenderer.invoke('design:syncTokensFromCss'),
    openPenHome: () => ipcRenderer.invoke('design:openFile', 'pencil.home.pen'),
    readDesign: () => ipcRenderer.invoke('design:readDesign'),
    writeDesign: (jsonText: string) => ipcRenderer.invoke('design:writeDesign', jsonText)
  },
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (title: string) => ipcRenderer.invoke('tasks:create', { title }),
    update: (task: Task) => ipcRenderer.invoke('tasks:update', task),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id)
  },
  window: {
    maximize: () => ipcRenderer.invoke('window:maximize'),
    restore: () => ipcRenderer.invoke('window:restore'),
    flash: (flag: boolean) => ipcRenderer.invoke('window:flash', flag)
  },
  timer: {
    startCountdown: (durationMs: number) => ipcRenderer.invoke('timer:startCountdown', { durationMs }),
    stop: () => ipcRenderer.invoke('timer:stop'),
    emitState: (state: unknown) => ipcRenderer.send('timer:state', state),
    onState: (callback: (state: unknown) => void) => {
      const handler = (_event: unknown, state: unknown) => callback(state)
      ipcRenderer.on('timer:state', handler)
      return () => ipcRenderer.removeListener('timer:state', handler)
    },
    command: (command: TimerCommand) => ipcRenderer.send('timer:command', command),
    sendCommand: (command: TimerCommand) => ipcRenderer.send('timer:command', command),
    onCommand: (callback: (command: TimerCommand) => void) => {
      const handler = (_event: unknown, command: TimerCommand) => callback(command)
      ipcRenderer.on('timer:command', handler)
      return () => ipcRenderer.removeListener('timer:command', handler)
    }
  },
  log: {
    append: (message: string) => ipcRenderer.invoke('log:append', message)
  }
})

// Existing example channel
ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
