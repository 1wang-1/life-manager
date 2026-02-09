import { describe, it, expect } from 'vitest';
import { createFocusSession, TimerMode } from '../../src/shared/models/focus-session';

describe('focus session', () => {
  it('stores planned minutes and mode', () => {
    const session = createFocusSession(TimerMode.Pomodoro, 25);
    expect(session.plannedMinutes).toBe(25);
    expect(session.mode).toBe(TimerMode.Pomodoro);
  });
});
