import { describe, it, expect } from 'vitest';
import { aggregateDailyFocus } from '../../src/shared/services/stats-aggregator';
import { FocusSession, TimerMode } from '../../src/shared/models/focus-session';

describe('stats aggregation', () => {
  it('aggregates focus minutes by day', () => {
    const sessions: FocusSession[] = [
      { id: 'a', mode: TimerMode.Pomodoro, plannedMinutes: 25, actualMinutes: 25, endedAt: '2026-01-01T10:00:00Z' },
      { id: 'b', mode: TimerMode.Pomodoro, plannedMinutes: 25, actualMinutes: 25, endedAt: '2026-01-01T14:00:00Z' }
    ];

    const stats = aggregateDailyFocus(sessions);
    expect(stats['2026-01-01']).toBe(50);
  });
});
