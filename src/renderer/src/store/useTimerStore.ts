
import { create } from 'zustand';
import { TimerMode, useSettingsStore } from './useSettingsStore';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type StopConfirmState = { seconds: number; fromMini?: boolean } | null;

interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  remainingTime: number; // seconds
  elapsedTime: number; // seconds
  activeTaskId: string | null;
  startTime: number | null; // timestamp when started
  pomodoroPhase: 'work' | 'break';
  sessionKind: 'focus' | 'break';
  breakReturnState: { mode: TimerMode; remainingTime: number; totalDuration: number } | null;
  lastCompletedMode: TimerMode | null;
  lastCompletedPhase: 'work' | 'break' | null;
  showSummary: boolean;
  lastCompletedTask: string | null;
  lastDuration: number;
  lastRecordId: string | null;
  lastCompletionTime: number | null;
  lastFeedbackShownAt: number | null;
  totalDuration: number; // For progress calculation

  stopConfirm: StopConfirmState;
  
  // Forward Stage related
  stageIndex: number;
  stageDuration: number;
  elapsedInStage: number;

  setStatus: (status: TimerStatus) => void;
  setMode: (mode: TimerMode) => void;
  setRemainingTime: (time: number) => void;
  setTotalDuration: (time: number) => void;
  setElapsedTime: (time: number) => void;
  setActiveTaskId: (id: string | null) => void;
  setStartTime: (time: number | null) => void;
  setPomodoroPhase: (phase: 'work' | 'break') => void;
  setSessionKind: (kind: 'focus' | 'break') => void;
  setBreakReturnState: (state: { mode: TimerMode; remainingTime: number; totalDuration: number } | null) => void;
  setShowSummary: (show: boolean) => void;
  setLastCompletedTask: (taskId: string | null) => void;
  setLastDuration: (duration: number) => void;
  setLastRecordId: (id: string | null) => void;
  setLastCompletedMode: (mode: TimerMode | null) => void;
  setLastCompletedPhase: (phase: 'work' | 'break' | null) => void;
  setLastCompletionTime: (time: number | null) => void;
  setLastFeedbackShownAt: (time: number | null) => void;
  setStopConfirm: (state: StopConfirmState) => void;
  resetTimer: (initialTime: number, mode: TimerMode) => void;
  syncTick: (payload: { remainingTime?: number; elapsedTime?: number; elapsedInStage?: number }) => void;

  // Forward Stage actions
  setStageIndex: (index: number) => void;
  setStageDuration: (duration: number) => void;
  setElapsedInStage: (time: number) => void;
  incrementStage: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  status: 'idle',
  mode: 'countdown',
  remainingTime: Math.max(1, useSettingsStore.getState().settings.countdownDefaultFocusMinutes) * 60,
  elapsedTime: 0,
  activeTaskId: null,
  startTime: null,
  pomodoroPhase: 'work',
  sessionKind: 'focus',
  breakReturnState: null,
  lastCompletedMode: null,
  lastCompletedPhase: null,
  showSummary: false,
  lastCompletedTask: null,
  lastDuration: 0,
  lastRecordId: null,
  lastCompletionTime: null,
  lastFeedbackShownAt: null,
  totalDuration: Math.max(1, useSettingsStore.getState().settings.countdownDefaultFocusMinutes) * 60,

  stopConfirm: null,
  
  // Default values for forward stage
  stageIndex: 1,
  stageDuration: 25 * 60, // Default 25 min stage
  elapsedInStage: 0,

  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),
  setRemainingTime: (time) => set({ remainingTime: time }),
  setTotalDuration: (time) => set({ totalDuration: time }),
  setElapsedTime: (time) => set({ elapsedTime: time }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setStartTime: (time) => set({ startTime: time }),
  setPomodoroPhase: (phase) => set({ pomodoroPhase: phase }),
  setSessionKind: (kind) => set({ sessionKind: kind }),
  setBreakReturnState: (state) => set({ breakReturnState: state }),
  setShowSummary: (show) => set({ showSummary: show }),
  setLastCompletedTask: (id) => set({ lastCompletedTask: id }),
  setLastDuration: (duration) => set({ lastDuration: duration }),
  setLastRecordId: (id) => set({ lastRecordId: id }),
  setLastCompletedMode: (mode) => set({ lastCompletedMode: mode }),
  setLastCompletedPhase: (phase) => set({ lastCompletedPhase: phase }),
  setLastCompletionTime: (time) => set({ lastCompletionTime: time }),
  setLastFeedbackShownAt: (time) => set({ lastFeedbackShownAt: time }),

  setStopConfirm: (state) => set({ stopConfirm: state }),
  
  syncTick: (payload) => set((state) => ({ ...state, ...payload })),

  setStageIndex: (index) => set({ stageIndex: index }),
  setStageDuration: (duration) => set({ stageDuration: duration }),
  setElapsedInStage: (time) => set({ elapsedInStage: time }),
  incrementStage: () => set((state) => ({ 
    stageIndex: state.stageIndex + 1,
    elapsedInStage: 0 
  })),

  resetTimer: (initialTime, mode) => set({
    status: 'idle',
    remainingTime: initialTime,
    totalDuration: initialTime,
    elapsedTime: 0,
    mode: mode,
    startTime: null,
    pomodoroPhase: 'work',
    sessionKind: 'focus',
    breakReturnState: null,
    stopConfirm: null,
    // Reset summary triggers to prevent stale popups
    lastCompletedTask: null,
    lastDuration: 0,
    // Reset forward stage state if switching to it, or generally reset it
    stageIndex: 1,
    elapsedInStage: 0
    // Keep stageDuration as configured or default
  })
}));
