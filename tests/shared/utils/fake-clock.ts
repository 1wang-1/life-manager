export class FakeClock {
  private current: number;

  constructor(now: Date) {
    this.current = now.getTime();
  }

  now(): number {
    return this.current;
  }

  advance(deltaMs: number): void {
    this.current += deltaMs;
  }
}
