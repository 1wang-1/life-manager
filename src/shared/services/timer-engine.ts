export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class TimerEngine {
  private startTime: number | null = null;
  public isCompleted = false;

  constructor(private clock: Clock, private durationMs: number) {}

  startCountdown(): void {
    this.startTime = this.clock.now();
    this.isCompleted = false;
  }

  tick(): void {
    if (this.startTime === null) return;
    if (this.clock.now() - this.startTime >= this.durationMs) {
      this.isCompleted = true;
    }
  }
}
