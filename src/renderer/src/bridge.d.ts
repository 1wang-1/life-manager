import { Task } from '../../shared/models/task'

type TimerCommand =
  | { type: 'toggle'; fromMini?: boolean }
  | { type: 'stop'; fromMini?: boolean }
  | { type: 'showMain'; fromMini?: boolean }
  | { type: 'clearSummary'; fromMini?: boolean }
  | { type: 'togglePet'; show?: boolean; fromMini?: boolean }
  | { type: 'extendBreak'; minutes: number; fromMini?: boolean }

declare global {
  interface Window {
    api: {
      app: {
        openExternal: (url: string) => Promise<boolean>
        getUserDataPath: () => Promise<string>
        getDataDir: () => Promise<string>
        pickDataDir: () => Promise<string | null>
        readDesktopFile: (filename: string) => Promise<string | null>
      }
      design: {
        openDesignFile: () => Promise<boolean>
        openTokensCss: () => Promise<boolean>
        syncTokensFromCss: () => Promise<boolean>
        openPenHome: () => Promise<boolean>
        readDesign: () => Promise<string | null>
        writeDesign: (jsonText: string) => Promise<boolean>
      }
      tasks: {
        list: () => Promise<Task[]>
        create: (title: string) => Promise<Task>
        update: (task: Task) => Promise<Task>
        delete: (id: string) => Promise<boolean>
      }
      window: {
        maximize: () => Promise<boolean>
        restore: () => Promise<boolean>
        flash: (flag: boolean) => Promise<boolean>
      }
      timer: {
        startCountdown: (durationMs: number) => Promise<{ running: boolean; durationMs: number }>
        stop: () => Promise<{ running: boolean }>
        emitState: (state: unknown) => void
        onState: (callback: (state: unknown) => void) => () => void
        command: (command: TimerCommand) => void
        sendCommand: (command: TimerCommand) => void
        onCommand: (callback: (command: TimerCommand) => void) => () => void
      }
      log: {
        append: (message: string) => Promise<boolean>
      }
    }
  }
}

export {}
