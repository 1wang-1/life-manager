import { describe, it, expect } from 'vitest';
import { FakeClock } from './utils/fake-clock';
import { TimerEngine } from '../../src/shared/services/timer-engine';

describe('timer engine', () => {
  it('countdown completes at zero', () => {
    const clock = new FakeClock(new Date('2026-01-01T12:00:00Z'));
    const engine = new TimerEngine(clock, 25 * 60 * 1000);

    engine.startCountdown();
    clock.advance(25 * 60 * 1000);
    engine.tick();

    expect(engine.isCompleted).toBe(true);
  });
});
