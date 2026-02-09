export enum TimerMode {
  Pomodoro = 'pomodoro',
  Forward = 'forward',
  Countdown = 'countdown'
}

export type FocusSession = {
  id: string;
  mode: TimerMode;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt?: string;
  endedAt?: string;
};

export function createFocusSession(mode: TimerMode, plannedMinutes: number): FocusSession {
  return {
    id: crypto.randomUUID(),
    mode,
    plannedMinutes,
    actualMinutes: 0
  };
}
