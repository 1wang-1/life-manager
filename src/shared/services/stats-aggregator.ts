import { FocusSession } from '../models/focus-session';

export function aggregateDailyFocus(sessions: FocusSession[]): Record<string, number> {
  return sessions
    .filter(session => session.endedAt)
    .reduce<Record<string, number>>((acc, session) => {
      const day = session.endedAt!.slice(0, 10);
      acc[day] = (acc[day] ?? 0) + session.actualMinutes;
      return acc;
    }, {});
}
