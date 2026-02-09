import { ipcMain } from 'electron'
import { timerService } from '../services/timer-service'

export function registerTimerIpc(): void {
  ipcMain.handle('timer:startCountdown', async (_event, payload: { durationMs: number }) => {
    return timerService.start(payload.durationMs)
  })

  ipcMain.handle('timer:stop', async () => {
    return timerService.stop()
  })
}
