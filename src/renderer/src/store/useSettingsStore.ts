import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

export type TimerMode = 'pomodoro' | 'stopwatch' | 'countdown' | 'forward_stage' | 'forward_free';

export type AppSettings = {
  defaultTimerMode: TimerMode;
  countdownDefaultFocusMinutes: number;
  pomodoroWork: number; // minutes
  pomodoroBreak: number; // minutes
  autoBreak: boolean;
  focusFeedbackEnabled: boolean;
  focusFeedbackAutoPrompt: boolean;
  focusFeedbackWriteToWeeklyReview: boolean;
  endSound: boolean;
  desktopNotify: boolean;
  dailySummary: boolean;
  theme: 'light' | 'dark' | 'system';
  themeColor: string;
  notificationLevel: 'level1' | 'level2' | 'level3';
  soundVolume: number;
  enableDesktopPet: boolean;
  taskSoundEnabled: boolean;
  taskSoundVolume: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultTimerMode: 'countdown',
  countdownDefaultFocusMinutes: 25,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  autoBreak: true,
  focusFeedbackEnabled: true,
  focusFeedbackAutoPrompt: true,
  focusFeedbackWriteToWeeklyReview: true,
  endSound: true,
  desktopNotify: true,
  dailySummary: true,
  theme: 'system',
  themeColor: 'blue',
  notificationLevel: 'level1',
  soundVolume: 0.7,
  enableDesktopPet: false,
  taskSoundEnabled: true,
  taskSoundVolume: 0.5
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: (() => {
    const stored = StorageService.get<AppSettings>('settings', DEFAULT_SETTINGS);
    const normalized: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      defaultTimerMode: stored.defaultTimerMode === 'pomodoro' ? ('countdown' as const) : stored.defaultTimerMode,
      countdownDefaultFocusMinutes: Number.isFinite(stored.countdownDefaultFocusMinutes)
        ? Math.max(1, Math.min(240, stored.countdownDefaultFocusMinutes))
        : DEFAULT_SETTINGS.countdownDefaultFocusMinutes
    };
    StorageService.set('settings', normalized);
    return normalized;
  })(),
  updateSettings: (updates) =>
    set((state) => {
      const normalizedUpdates =
        updates.defaultTimerMode === 'pomodoro'
          ? { ...updates, defaultTimerMode: 'countdown' as const }
          : updates;
      const rawSettings = { ...state.settings, ...normalizedUpdates };
      const newSettings: AppSettings = {
        ...rawSettings,
        countdownDefaultFocusMinutes: Number.isFinite(rawSettings.countdownDefaultFocusMinutes)
          ? Math.max(1, Math.min(240, rawSettings.countdownDefaultFocusMinutes))
          : state.settings.countdownDefaultFocusMinutes
      };
      StorageService.set('settings', newSettings);
      return { settings: newSettings };
    }),
  resetSettings: () => {
    StorageService.set('settings', DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  }
}));
