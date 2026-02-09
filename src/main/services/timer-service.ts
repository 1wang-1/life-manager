export class TimerService {
  public isRunning = false
  private durationMs = 0
  private interval: NodeJS.Timeout | null = null

  start(durationMs: number) {
    this.stop()
    this.isRunning = true
    this.durationMs = durationMs
    
    // Simple backend timer loop
    this.interval = setInterval(() => {
      this.durationMs -= 1000
      if (this.durationMs <= 0) {
        this.stop()
      }
    }, 1000)
    
    return { running: true, durationMs }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
    return { running: false }
  }
}

export const timerService = new TimerService()
