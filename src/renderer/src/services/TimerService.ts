
import { useTimerStore } from '../store/useTimerStore';
import { useTaskStore, TaskStatus } from '../store/useTaskStore';
import { useSettingsStore, TimerMode } from '../store/useSettingsStore';
import { useUIStore } from '../store/useUIStore';
import { playTimerCompletionSound } from '../utils/sound';
import { buildFocusRewardToastPayload } from '../utils/focusRewards';

class TimerService {
  private timerId: NodeJS.Timeout | null = null;
  private pendingStopCallback: (() => void) | null = null;
  private pendingStopFromMini: boolean | undefined;
  private lastTickTime: number = 0;

  private parseTaskPlannedMinutes(plannedTime?: string): number | null {
    if (!plannedTime) return null;
    const timeStr = plannedTime.toLowerCase().trim();
    if (!timeStr) return null;

    if (timeStr.endsWith('h')) {
      const v = parseFloat(timeStr.slice(0, -1));
      if (!Number.isFinite(v) || v <= 0) return null;
      return v * 60;
    }
    if (timeStr.endsWith('m')) {
      const v = parseFloat(timeStr.slice(0, -1));
      if (!Number.isFinite(v) || v <= 0) return null;
      return v;
    }

    const v = Number(timeStr);
    if (!Number.isFinite(v) || v <= 0) return null;
    return v;
  }

  private emitState() {
    try {
      if (!window.api?.timer?.emitState) return;
      const state = useTimerStore.getState();
      const taskId = state.activeTaskId;
      const taskTitle = taskId ? useTaskStore.getState().getTaskById(taskId)?.title : null;
      window.api.timer.emitState({
        status: state.status,
        mode: state.mode,
        remainingTime: state.remainingTime,
        elapsedTime: state.elapsedTime,
        sessionKind: state.sessionKind,
        pomodoroPhase: state.pomodoroPhase,
        activeTaskId: taskId,
        taskTitle,
        lastCompletionTime: state.lastCompletionTime
      });
    } catch {
      // ignore
    }
  }

  startBreak(minutes: number, returnTo?: { mode: TimerMode; remainingTime: number; totalDuration: number }) {
    const { status, mode, remainingTime, totalDuration } = useTimerStore.getState();
    const returnState = returnTo || { mode, remainingTime, totalDuration };

    if (status === 'running') {
      this.pauseTimer();
    }

    useTimerStore.getState().setSessionKind('break');
    useTimerStore.getState().setBreakReturnState(returnState);
    useTimerStore.getState().setPomodoroPhase('break');
    useTimerStore.getState().setMode('countdown');
    useTimerStore.getState().setActiveTaskId(null);
    useTimerStore.getState().setElapsedTime(0);
    const breakDuration = Math.max(1, minutes) * 60;
    useTimerStore.getState().setRemainingTime(breakDuration);
    useTimerStore.getState().setTotalDuration(breakDuration);
    useTimerStore.getState().setStatus('running');
    useTimerStore.getState().setStartTime(Date.now());

    this.lastTickTime = Date.now();
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);

    this.emitState();
  }

  extendBreak(minutes: number) {
    const { sessionKind, remainingTime, totalDuration } = useTimerStore.getState();
    if (sessionKind !== 'break') return;
    const delta = Math.max(1, Math.floor(minutes)) * 60;
    useTimerStore.getState().setRemainingTime(Math.max(0, remainingTime) + delta);
    useTimerStore.getState().setTotalDuration(Math.max(0, totalDuration) + delta);
    this.emitState();
  }

  startPomodoroWork(taskId: string | null = null) {
    const { settings } = useSettingsStore.getState();
    useTimerStore.getState().setPomodoroPhase('work');
    useTimerStore.getState().setSessionKind('focus');
    useTimerStore.getState().setBreakReturnState(null);
    this.startTimer(taskId, 'countdown', settings.pomodoroWork);
  }

  startPomodoroBreak() {
    const { settings } = useSettingsStore.getState();
    const workDuration = settings.pomodoroWork * 60;
    this.startBreak(settings.pomodoroBreak, {
      mode: 'countdown',
      remainingTime: workDuration,
      totalDuration: workDuration
    });
  }

  startTimer(taskId: string | null = null, mode: TimerMode = 'countdown', durationMinutes?: number) {
    const {
      status,
      activeTaskId,
      mode: currentMode,
      remainingTime: currentRemaining,
      sessionKind
    } = useTimerStore.getState();

    const effectiveMode = mode === 'pomodoro' ? 'countdown' : mode;
    const effectiveCurrentMode = currentMode === 'pomodoro' ? 'countdown' : currentMode;

    if (status === 'running') {
      if (sessionKind === 'break') {
        this.pauseTimer();
        useTimerStore.getState().setStatus('idle');
        useTimerStore.getState().setSessionKind('focus');
        useTimerStore.getState().setPomodoroPhase('work');
        useTimerStore.getState().setBreakReturnState(null);
      } else {
        return;
      }
    }

    // RESUME LOGIC: If paused and continuing same task/mode, just resume
    if (status === 'paused' && (!taskId || taskId === activeTaskId) && effectiveMode === effectiveCurrentMode && !durationMinutes) {
      useTimerStore.getState().setStatus('running');
      this.lastTickTime = Date.now();
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        this.tick();
      }, 1000);
      this.emitState();
      return;
    }

    // START NEW LOGIC
    // Set Mode and Time
    let initialTime = 0;
    if (effectiveMode === 'countdown') {
      // If duration provided, use it
      if (durationMinutes) {
        initialTime = durationMinutes * 60;
      } else {
        const { settings } = useSettingsStore.getState();
        const defaultCountdownSeconds = Math.max(1, settings.countdownDefaultFocusMinutes) * 60;

        if (taskId) {
          const task = useTaskStore.getState().getTaskById(taskId);
          const fromPreference = task?.focusPreference?.mode === 'countdown' ? task.focusPreference.duration : undefined;
          const fromPlanned = this.parseTaskPlannedMinutes(task?.plannedTime);
          const resolvedMinutes = fromPreference || fromPlanned || null;
          if (resolvedMinutes) {
            initialTime = resolvedMinutes * 60;
          } else {
            initialTime = defaultCountdownSeconds;
          }
        } else {
        // If in countdown mode and we have a valid remaining time (user edited), use it
        if (effectiveCurrentMode === 'countdown' && currentRemaining > 0 && status === 'idle') {
          initialTime = currentRemaining;
        } else {
          initialTime = defaultCountdownSeconds;
        }
        }
      }
    } else if (effectiveMode === 'forward_stage') {
       initialTime = 0;
       useTimerStore.getState().setStageDuration(durationMinutes ? durationMinutes * 60 : Math.max(1, useSettingsStore.getState().settings.countdownDefaultFocusMinutes) * 60);
       useTimerStore.getState().setStageIndex(1);
       useTimerStore.getState().setElapsedInStage(0);
    } else {
      // Stopwatch / Forward Free
      initialTime = 0;
    }

    useTimerStore.getState().setSessionKind('focus');
    useTimerStore.getState().setBreakReturnState(null);
    useTimerStore.getState().setMode(effectiveMode);
    if (effectiveMode !== 'stopwatch' && effectiveMode !== 'forward_free' && effectiveMode !== 'forward_stage') {
      useTimerStore.getState().setRemainingTime(initialTime);
      useTimerStore.getState().setTotalDuration(initialTime);
    }
    useTimerStore.getState().setElapsedTime(0);

    if (taskId) {
      useTimerStore.getState().setActiveTaskId(taskId);
      // Auto-move task to in_progress if not already
      const task = useTaskStore.getState().getTaskById(taskId);
      if (task && task.status === 'not_started') {
        useTaskStore.getState().updateTaskStatus(taskId, TaskStatus.InProgress);
      }
    }

    useTimerStore.getState().setStatus('running');
    useTimerStore.getState().setStartTime(Date.now());

    this.lastTickTime = Date.now();
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.tick();
    }, 1000);

    this.emitState();
  }

  startStopwatch(taskId: string | null = null) {
    this.startTimer(taskId, 'stopwatch');
  }

  startCountdown(durationMinutes: number, taskId: string | null = null) {
    this.startTimer(taskId, 'countdown', durationMinutes);
  }

  resetTimer(initialTime: number, mode: TimerMode) {
    useTimerStore.getState().resetTimer(initialTime, mode === 'pomodoro' ? 'countdown' : mode);
    this.emitState();
  }

  previewSound() {
    playTimerCompletionSound(false);
  }

  pauseTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    useTimerStore.getState().setStatus('paused');
    this.emitState();
  }

  requestStopTimer(options?: { fromMini?: boolean; onStopped?: () => void }) {
    const { elapsedTime, sessionKind } = useTimerStore.getState();

    if (sessionKind === 'break') {
      this.stopTimer({ fromMini: options?.fromMini });
      options?.onStopped?.();
      return;
    }

    if (options?.fromMini && elapsedTime > 0 && elapsedTime < 60) {
      this.stopTimer({ fromMini: options?.fromMini });
      options?.onStopped?.();
      return;
    }

    if (elapsedTime > 0 && elapsedTime < 60) {
      this.pauseTimer();
      this.pendingStopCallback = options?.onStopped || null;
      this.pendingStopFromMini = options?.fromMini;
      useTimerStore.getState().setStopConfirm({ seconds: elapsedTime, fromMini: options?.fromMini });
      return;
    }

    this.stopTimer({ fromMini: options?.fromMini });
    options?.onStopped?.();
  }

  confirmStopTimer() {
    const stopConfirm = useTimerStore.getState().stopConfirm;
    if (!stopConfirm) return;

    useTimerStore.getState().setStopConfirm(null);
    const callback = this.pendingStopCallback;
    const fromMini = this.pendingStopFromMini;
    this.pendingStopCallback = null;
    this.pendingStopFromMini = undefined;
    this.stopTimer({ fromMini });
    callback?.();
  }

  continueStopTimer() {
    useTimerStore.getState().setStopConfirm(null);
    this.pendingStopCallback = null;
    this.pendingStopFromMini = undefined;
    this.startTimer();
  }

  cancelStopTimer() {
    useTimerStore.getState().setStopConfirm(null);
    this.pendingStopCallback = null;
    this.pendingStopFromMini = undefined;
  }

  discardStopTimer() {
    const stopConfirm = useTimerStore.getState().stopConfirm;
    if (!stopConfirm) return;

    useTimerStore.getState().setStopConfirm(null);
    const callback = this.pendingStopCallback;
    const fromMini = this.pendingStopFromMini;
    this.pendingStopCallback = null;
    this.pendingStopFromMini = undefined;
    this.stopTimer({ fromMini, discard: true });
    callback?.();
  }

  stopTimer(options?: { fromMini?: boolean; discard?: boolean }) {
    this.pauseTimer();
    const {
      mode,
      activeTaskId,
      elapsedTime,
      startTime,
      sessionKind,
      breakReturnState
    } = useTimerStore.getState();
    const effectiveMode = mode === 'pomodoro' ? 'countdown' : mode;
    const { settings } = useSettingsStore.getState();

    if (sessionKind === 'break') {
      useTimerStore.getState().setStatus('idle');
      useTimerStore.getState().setStartTime(null);
      useTimerStore.getState().setElapsedTime(0);
      useTimerStore.getState().setSessionKind('focus');
      useTimerStore.getState().setPomodoroPhase('work');
      useTimerStore.getState().setBreakReturnState(null);
      
      // Play sound when manually stopping a break
      playTimerCompletionSound(false);

      if (breakReturnState) {
        useTimerStore.getState().setMode(breakReturnState.mode === 'pomodoro' ? 'countdown' : breakReturnState.mode);
        useTimerStore.getState().setRemainingTime(breakReturnState.remainingTime);
      } else {
        const defaultTime = effectiveMode === 'countdown' ? Math.max(1, useSettingsStore.getState().settings.countdownDefaultFocusMinutes) * 60 : 0;
        useTimerStore.getState().resetTimer(defaultTime, effectiveMode);
      }
      this.emitState();
      return;
    }
    const endAt = Date.now();

    const defaultTime =
      effectiveMode === 'countdown'
        ? Math.max(1, useSettingsStore.getState().settings.countdownDefaultFocusMinutes) * 60
        : 0;

    if (options?.discard) {
      useTimerStore.getState().setStatus('idle');
      useTimerStore.getState().setStartTime(null);
      useTimerStore.getState().setElapsedTime(0);
      useTimerStore.getState().setSessionKind('focus');
      useTimerStore.getState().setPomodoroPhase('work');
      useTimerStore.getState().setBreakReturnState(null);
      useTimerStore.getState().setMode(effectiveMode);
      useTimerStore.getState().setRemainingTime(defaultTime);
      useTimerStore.getState().setTotalDuration(defaultTime);
      
      // Play sound when discarding (user feedback for action)
      playTimerCompletionSound(false);
      
      this.emitState();
      return;
    }

    if (elapsedTime > 0) {
      const recordId = crypto.randomUUID();
      useTaskStore.getState().addFocusRecord({
        id: recordId,
        taskId: activeTaskId,
        startTime: startTime || endAt - elapsedTime * 1000,
        endTime: endAt,
        duration: elapsedTime,
        mode: effectiveMode,
        completedAt: new Date(endAt).toISOString()
      });
      useTimerStore.getState().setLastRecordId(recordId);
    }
    useTimerStore.getState().resetTimer(defaultTime, effectiveMode);

    useTimerStore.getState().setLastCompletedMode(effectiveMode);
    useTimerStore.getState().setLastCompletedPhase(null);
    useTimerStore.getState().setLastCompletedTask(activeTaskId);
    useTimerStore.getState().setLastDuration(elapsedTime);
    useTimerStore.getState().setLastCompletionTime(endAt);

    if (elapsedTime > 0) {
      playTimerCompletionSound(false);
    }

    if (!options?.fromMini && elapsedTime >= 60 && settings.autoBreak) {
      const payload = buildFocusRewardToastPayload({
        durationSeconds: elapsedTime,
        focusRecords: useTaskStore.getState().focusRecords,
        lastRecordId: useTimerStore.getState().lastRecordId
      });
      useUIStore.getState().showToast({ ...payload, durationMs: 2200 });

      const returnTo =
        effectiveMode === 'countdown'
          ? { mode: 'countdown' as TimerMode, remainingTime: defaultTime, totalDuration: defaultTime }
          : { mode: effectiveMode, remainingTime: 0, totalDuration: 0 };
      this.startBreak(settings.pomodoroBreak, returnTo);
      return;
    }

    this.emitState();
  }

  private tick() {
    const { status, mode, remainingTime, elapsedTime } = useTimerStore.getState();

    // Safety Check: If status is not running, stop ticking
    if (status !== 'running') {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      return;
    }

    const now = Date.now();
    const delta = now - this.lastTickTime;
    if (delta < 1000) return;

    const secondsPassed = Math.floor(delta / 1000);
    this.lastTickTime += secondsPassed * 1000;

    if (mode === 'pomodoro' || mode === 'countdown') {
      const newRemaining = remainingTime - secondsPassed;
      const newElapsed = elapsedTime + secondsPassed;

      if (newRemaining <= 0) {
        useTimerStore.getState().syncTick({ remainingTime: 0, elapsedTime: elapsedTime + remainingTime });
        this.completeTimer();
      } else {
        useTimerStore.getState().syncTick({ remainingTime: newRemaining, elapsedTime: newElapsed });
      }
    } else if (mode === 'forward_stage') {
      const { elapsedInStage, stageDuration } = useTimerStore.getState();
      const newElapsedInStage = elapsedInStage + secondsPassed;
      const newElapsed = elapsedTime + secondsPassed;
      
      useTimerStore.getState().syncTick({ elapsedTime: newElapsed, elapsedInStage: newElapsedInStage });

      if (newElapsedInStage >= stageDuration) {
        // Stage Complete
        useTimerStore.getState().incrementStage();
        this.triggerNotification('阶段完成', `已完成第 ${useTimerStore.getState().stageIndex - 1} 阶段`);
        playTimerCompletionSound(false);
      }
    } else {
      // Stopwatch / Forward Free
      const newElapsed = elapsedTime + secondsPassed;
      useTimerStore.getState().setElapsedTime(newElapsed);
      
      // Light feedback for free mode every 5 minutes (300 seconds)
      if (mode === 'forward_free' && Math.floor(newElapsed / 300) > Math.floor(elapsedTime / 300)) {
         // Subtle feedback could go here
      }
    }

    this.emitState();
  }

  private triggerNotification(title: string, body: string) {
    const { settings } = useSettingsStore.getState();
    const level = settings.notificationLevel || 'level1';

    if (level === 'level1') {
      if (settings.desktopNotify) {
        new Notification(title, { body, silent: false });
      }
      window.api?.window?.flash(true);
    } else if (level === 'level2') {
      // Improved pleasant sound
      playTimerCompletionSound(false);
      if (settings.desktopNotify) {
        new Notification(title, { body, silent: true });
      }
    } else if (level === 'level3') {
      // Repeated pleasant sound + interaction required
      playTimerCompletionSound(true);
      window.api?.window?.flash(true);
      if (settings.desktopNotify) {
        const n = new Notification(title, { body, requireInteraction: true });
        n.onclick = () => {
          window.api?.window?.restore();
        };
      }
    }
  }

  private completeTimer() {
    this.pauseTimer();
    const {
      mode,
      activeTaskId,
      elapsedTime,
      startTime,
      sessionKind,
      breakReturnState,
      remainingTime
    } = useTimerStore.getState();
    const { settings } = useSettingsStore.getState();
    const effectiveMode = mode === 'pomodoro' ? 'countdown' : mode;

    useTimerStore.getState().setLastCompletedMode(effectiveMode);
    useTimerStore.getState().setLastCompletedPhase(null);

    if (sessionKind === 'break') {
      this.triggerNotification('休息结束', '准备开始下一轮专注吧！');
      if (settings.notificationLevel === 'level1') {
        playTimerCompletionSound(false);
      }
      useTimerStore.getState().setStatus('idle');
      useTimerStore.getState().setStartTime(null);
      useTimerStore.getState().setElapsedTime(0);
      useTimerStore.getState().setSessionKind('focus');
      useTimerStore.getState().setPomodoroPhase('work');
      useTimerStore.getState().setBreakReturnState(null);
      if (breakReturnState) {
        useTimerStore.getState().setMode(breakReturnState.mode === 'pomodoro' ? 'countdown' : breakReturnState.mode);
        useTimerStore.getState().setRemainingTime(breakReturnState.remainingTime);
        useTimerStore.getState().setTotalDuration(breakReturnState.totalDuration);
      }
      this.emitState();
      return;
    }

    // Save record
    const recordId = crypto.randomUUID();
    useTaskStore.getState().addFocusRecord({
      id: recordId,
      taskId: activeTaskId,
      startTime: startTime || Date.now() - elapsedTime * 1000,
      endTime: Date.now(),
      duration: elapsedTime,
      mode: effectiveMode,
      completedAt: new Date().toISOString()
    });
    useTimerStore.getState().setLastRecordId(recordId);

    useTimerStore.getState().setLastCompletionTime(Date.now());
    useTimerStore.getState().setLastCompletedTask(activeTaskId);
    useTimerStore.getState().setLastDuration(elapsedTime);
    useTimerStore.getState().setShowSummary(false);

    // Notification
    this.triggerNotification('专注完成', '休息一下吧！');
    if (settings.notificationLevel === 'level1') {
      playTimerCompletionSound(false);
    }
    
    if (settings.autoBreak) {
      const payload = buildFocusRewardToastPayload({
        durationSeconds: elapsedTime,
        focusRecords: useTaskStore.getState().focusRecords,
        lastRecordId: useTimerStore.getState().lastRecordId
      });
      useUIStore.getState().showToast({ ...payload, durationMs: 2200 });

      const sessionTotalSeconds = (effectiveMode === 'countdown')
        ? elapsedTime + Math.max(0, remainingTime)
        : 0;

      const returnTo = effectiveMode === 'countdown'
        ? { mode: 'countdown' as TimerMode, remainingTime: sessionTotalSeconds || Math.max(1, settings.countdownDefaultFocusMinutes) * 60, totalDuration: sessionTotalSeconds || Math.max(1, settings.countdownDefaultFocusMinutes) * 60 }
        : { mode: effectiveMode, remainingTime: 0, totalDuration: 0 };
      this.startBreak(settings.pomodoroBreak, returnTo);
      return;
    }

    useTimerStore.getState().setStatus('idle');
    if (effectiveMode === 'countdown') {
      useTimerStore.getState().setRemainingTime(Math.max(1, settings.countdownDefaultFocusMinutes) * 60);
      useTimerStore.getState().setElapsedTime(0);
    }

    this.emitState();

    // Summary already set above
  }
}

export const timerService = new TimerService();
