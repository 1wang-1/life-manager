
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { endOfWeek, startOfWeek } from 'date-fns';
import { timerService } from '../../services/TimerService';
import { useTaskStore } from '../../store/useTaskStore';
import { useUIStore } from '../../store/useUIStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { GrowthIcon } from '../GrowthStageIcons';
import { computeWeeklyGrowth, computeNextStage } from '../../utils/growthLogic';
import './FocusSummary.css';

export function StopConfirmSheet() {
  const stopConfirm = useTimerStore((s) => s.stopConfirm);

  const confirmSecondsText = useMemo(() => {
    const seconds = stopConfirm?.seconds ?? 0;
    if (seconds < 60) return `${Math.max(0, Math.floor(seconds))} 秒`;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${Math.max(0, m)} 分 ${Math.max(0, s)} 秒`;
  }, [stopConfirm?.seconds]);

  if (!stopConfirm) return null;

  return createPortal(
    <div className="lm-sheet-overlay" role="dialog" aria-modal="true" aria-label="结束专注确认">
      <div className="lm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="lm-sheet-grabber" aria-hidden />
        <div className="lm-sheet-title">⏱ 未满 1 分钟（{confirmSecondsText}）</div>
        <div className="lm-sheet-subtitle">是否放弃本次记录？</div>
        <div className="lm-sheet-actions">
          <button type="button" className="btn btn-primary" onClick={() => timerService.continueStopTimer()}>
            继续专注
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => timerService.discardStopTimer()}>
            放弃
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FocusSummary() {
  const { showSummary, setShowSummary, lastDuration, lastRecordId } = useTimerStore();
  const { focusRecords } = useTaskStore();

  const hideTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setShowSummary(false);
    }, 2600);
  }, [clearHideTimer, setShowSummary]);

  const durationText = useMemo(() => {
    const seconds = Math.max(0, Math.floor(lastDuration));
    if (seconds <= 0) return '<1 分钟';
    if (seconds < 60) return `<1 分钟（${seconds} 秒）`;
    return `${Math.floor(seconds / 60)} 分钟`;
  }, [lastDuration]);

  const leavesGained = useMemo(() => Math.floor(Math.max(0, lastDuration) / (25 * 60)), [lastDuration]);

  const weeklyLeavesBefore = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();
    return focusRecords
      .filter((r) => {
        if (!r.completedAt) return false;
        const t = new Date(r.completedAt).getTime();
        if (Number.isNaN(t)) return false;
        if (t < weekStart || t > weekEnd) return false;
        if (lastRecordId && r.id === lastRecordId) return false;
        return true;
      })
      .reduce((sum, r) => sum + Math.floor((r.duration || 0) / (25 * 60)), 0);
  }, [focusRecords, lastRecordId]);

  const synthesisResult = useMemo(() => {
    const beforeLeaves = weeklyLeavesBefore;
    const afterLeaves = weeklyLeavesBefore + leavesGained;

    const toTiers = (leaves: number) => {
      const shrubs = Math.floor(leaves / 3);
      const sprouts = Math.floor(shrubs / 3);
      const trees = Math.floor(sprouts / 3);
      const tree2 = Math.floor(trees / 3);
      return { shrubs, sprouts, trees, tree2 };
    };

    const before = toTiers(beforeLeaves);
    const after = toTiers(afterLeaves);

    const deltas = {
      shrub: Math.max(0, after.shrubs - before.shrubs),
      sprout: Math.max(0, after.sprouts - before.sprouts),
      tree: Math.max(0, after.trees - before.trees),
      tree2: Math.max(0, after.tree2 - before.tree2)
    };

    const levelsUp = [deltas.shrub > 0, deltas.sprout > 0, deltas.tree > 0, deltas.tree2 > 0].filter(Boolean)
      .length;

    if (deltas.tree2 > 0) return { emoji: '🌳🌳', chain: levelsUp > 1, capReached: true, detail: '' };
    if (deltas.tree > 0) return { emoji: '🌳', chain: levelsUp > 1, capReached: false, detail: '🌱×3 → 🌳' };
    if (deltas.sprout > 0) return { emoji: '🌱', chain: levelsUp > 1, capReached: false, detail: '🌿×3 → 🌱' };
    if (deltas.shrub > 0) return { emoji: '🌿', chain: levelsUp > 1, capReached: false, detail: '🍃×3 → 🌿' };
    return null;
  }, [leavesGained, weeklyLeavesBefore]);

  const toastContent = useMemo(() => {
    if (synthesisResult?.capReached) return { title: '🌳🌳 本周成长已茂盛', subtitle: '' };

    if (synthesisResult) {
      const upgrade = synthesisResult.chain ? '（已升级）' : '';
      return { title: `${synthesisResult.emoji} 合成成功${upgrade}`, subtitle: synthesisResult.detail };
    }

    if (leavesGained > 0) return { title: `🍃 +${leavesGained} 已记录`, subtitle: '' };
    return { title: `💧 已记录 ${durationText}`, subtitle: '' };
  }, [durationText, leavesGained, synthesisResult]);

  useEffect(() => {
    if (!showSummary) {
      clearHideTimer();
      setVisible(false);
      if (mounted) {
        window.setTimeout(() => setMounted(false), 180);
      }
      return;
    }

    if (lastDuration <= 0) {
      setShowSummary(false);
      return;
    }

    if (lastDuration > 0 && lastDuration < 15) {
      setShowSummary(false);
      return;
    }

    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
    scheduleHide();
  }, [clearHideTimer, lastDuration, mounted, scheduleHide, setShowSummary, showSummary]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  if (!mounted) return null;

  return (
    <>
      {mounted && (
        <div className={`lm-result-bar ${visible ? 'is-visible' : ''}`} aria-live="polite" aria-atomic="true">
          <div className="lm-result-bar-text">
            <div className="lm-result-bar-title">{toastContent.title}</div>
            {toastContent.subtitle ? <div className="lm-result-bar-subtitle">{toastContent.subtitle}</div> : null}
          </div>
        </div>
      )}
    </>
  );
}

export function GlobalToast() {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  const hideTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const activeToastIdRef = useRef<string | null>(null);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const close = useCallback(
    (toastId?: string) => {
      clearHideTimer();
      setVisible(false);
      window.setTimeout(() => {
        setMounted(false);
        hideToast(toastId);
      }, 180);
    },
    [clearHideTimer, hideToast]
  );

  useEffect(() => {
    if (!toast) {
      clearHideTimer();
      setVisible(false);
      activeToastIdRef.current = null;
      window.setTimeout(() => setMounted(false), 180);
      return;
    }

    if (toast.id === activeToastIdRef.current) return;

    activeToastIdRef.current = toast.id;
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));

    clearHideTimer();
    const duration = Math.max(1200, Math.min(3500, toast.durationMs ?? 2200));
    hideTimerRef.current = window.setTimeout(() => {
      close(toast.id);
    }, duration);

    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer, close, toast]);

  if (!toast || !mounted) return null;

  return createPortal(
    <div className="lm-snackbar-wrap" aria-live="polite" aria-atomic="true">
      <div className={`lm-result-bar lm-snackbar ${visible ? 'is-visible' : ''}`}>
        <div className="lm-result-bar-text">
          <div className="lm-result-bar-title">{toast.title}</div>
          {toast.subtitle ? <div className="lm-result-bar-subtitle">{toast.subtitle}</div> : null}
        </div>
        <div className="lm-toast-actions">
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="lm-result-bar-action"
              onClick={() => {
                toast.onAction?.();
                close(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function FocusEndCardFeedback() {
  const lastCompletionTime = useTimerStore((s) => s.lastCompletionTime);
  const lastDuration = useTimerStore((s) => s.lastDuration);
  const lastCompletedTask = useTimerStore((s) => s.lastCompletedTask);
  const lastCompletedMode = useTimerStore((s) => s.lastCompletedMode);
  const lastRecordId = useTimerStore((s) => s.lastRecordId);
  const lastFeedbackShownAt = useTimerStore((s) => s.lastFeedbackShownAt);
  const setLastFeedbackShownAt = useTimerStore((s) => s.setLastFeedbackShownAt);

  const getTaskById = useTaskStore((s) => s.getTaskById);
  const completeTaskFinal = useTaskStore((s) => s.completeTaskFinal);
  const focusRecords = useTaskStore((s) => s.focusRecords);
  const updateTask = useTaskStore((s) => s.updateTask);

  const showToast = useUIStore((s) => s.showToast);

  const { settings } = useSettingsStore();
  const autoBreakEnabled = settings.autoBreak;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearHideTimer();
    setVisible(false);
    window.setTimeout(() => setMounted(false), 180);
  }, [clearHideTimer]);

  useEffect(() => {
    if (autoBreakEnabled) return;
    if (!lastCompletionTime) return;
    
    // Fix: Prevent showing stale feedback (e.g. when navigating back to page)
    // If more than 1 minute has passed since completion, treat it as stale
    if (Date.now() - lastCompletionTime > 60000) return;

    if (lastFeedbackShownAt === lastCompletionTime) return;
    setLastFeedbackShownAt(lastCompletionTime);

    if (lastDuration <= 0 || lastDuration < 15) return;

    useTimerStore.getState().setShowSummary(false);

    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
    clearHideTimer();

    hideTimerRef.current = window.setTimeout(() => {
      close();
    }, 4200);

    return () => {
      clearHideTimer();
    };
  }, [autoBreakEnabled, clearHideTimer, close, lastCompletionTime, lastDuration, lastFeedbackShownAt, setLastFeedbackShownAt]);

  const activeTask = useMemo(() => {
    if (!lastCompletedTask) return null;
    return getTaskById(lastCompletedTask);
  }, [getTaskById, lastCompletedTask]);

  const canMarkTaskComplete = !!activeTask && activeTask.status !== 'completed';

  const weeklyMinutesBefore = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();
    return Math.floor(focusRecords
      .filter((r) => {
        if (!r.completedAt) return false;
        const t = new Date(r.completedAt).getTime();
        if (Number.isNaN(t)) return false;
        if (t < weekStart || t > weekEnd) return false;
        if (lastRecordId && r.id === lastRecordId) return false;
        return true;
      })
      .reduce((sum, r) => sum + (r.duration || 0), 0) / 60);
  }, [focusRecords, lastRecordId]);

  const heroContent = useMemo(() => {
    const currentSessionMinutes = Math.floor(Math.max(0, lastDuration) / 60);
    const totalWeeklyMinutes = weeklyMinutesBefore + currentSessionMinutes;

    const growth = computeWeeklyGrowth(totalWeeklyMinutes);
    const next = computeNextStage(totalWeeklyMinutes);

    return {
      type: 'growth' as const,
      stage: growth.stage,
      title: growth.stageName,
      subtitle: next ? `还差 ${Math.ceil(next.minutesToNext / 25)} 个${next.nextUnits - Math.floor(totalWeeklyMinutes/25) === 1 ? '能量' : '升级'}` : '已达巅峰',
      progress: growth.progress,
      nextUnitProgress: growth.nextUnitProgress
    };
  }, [lastDuration, weeklyMinutesBefore]);

  const encouragementText = useMemo(() => {
    return `本周已专注 ${weeklyMinutesBefore + Math.floor(lastDuration / 60)} 分钟，保持节奏！`;
  }, [weeklyMinutesBefore, lastDuration]);

  const handleContinueFocus = () => {
    timerService.startTimer(lastCompletedTask, lastCompletedMode || settings.defaultTimerMode);
    close();
  };

  const handleRest = () => {
    timerService.startBreak(settings.pomodoroBreak);
    close();
  };

  const handleCompleteTask = () => {
    if (!lastCompletedTask) {
      close();
      return;
    }

    const task = getTaskById(lastCompletedTask);
    const undoSnapshot = task
      ? {
          status: task.status,
          completedAt: task.completedAt,
          completedCycles: task.completedCycles,
          selectedDates: task.selectedDates
        }
      : null;

    if (task?.status === 'completed') {
      showToast({ title: `已完成：${task.title}`, durationMs: 2000 });
      close();
      return;
    }

    completeTaskFinal(lastCompletedTask);

    const completedTitle = task?.title ? `已完成：${task.title}` : '已完成';
    showToast({
      title: completedTitle,
      actionLabel: undoSnapshot ? '撤销' : undefined,
      onAction: undoSnapshot
        ? () => {
            updateTask(lastCompletedTask, undoSnapshot);
          }
        : undefined,
      durationMs: 2400
    });
    close();
  };

  const handleClose = () => {
    close();
  };

  if (autoBreakEnabled || !mounted) return null;

  return (
    <div
      className={`lm-focus-card-feedback ${visible ? 'is-visible' : ''}`}
      role="group"
      aria-label="专注结束反馈"
      onClick={handleClose}
    >
      <div
        className="lm-focus-card-panel"
      >
        <div className="lm-focus-card-header">
          <div className="lm-focus-card-title">
            {activeTask ? `任务：${activeTask.title}` : '专注结束'}
          </div>
          <button type="button" className="lm-focus-card-close" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="lm-focus-card-body">
          <div className={`lm-focus-card-hero ${heroContent.type}`}>
            <div className="lm-focus-card-hero-media">
                <>
                  <GrowthIcon stage={heroContent.stage} size={96} className="lm-focus-card-hero-image" />
                  {heroContent.progress && (
                    <div className="lm-focus-card-hero-progress" style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                        {Array.from({ length: heroContent.progress.total }).map((_, idx) => (
                            <GrowthIcon 
                                key={idx} 
                                stage={heroContent.progress!.unitIcon} 
                                size={24} 
                                style={{ 
                                    opacity: idx < heroContent.progress!.current ? 1 : 0.3,
                                    filter: idx < heroContent.progress!.current ? 'none' : 'grayscale(100%)'
                                }} 
                            />
                        ))}
                    </div>
                  )}
                </>
            </div>
            <div className="lm-focus-card-hero-title">{heroContent.title}</div>
            
            {/* Next Unit Progress Bar */}
            {heroContent.nextUnitProgress && heroContent.nextUnitProgress.current > 0 && (
                <div 
                  className="lm-focus-card-hero-subtitle" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    marginTop: '4px',
                    fontSize: '12px',
                    opacity: 0.85
                  }}
                >
                  <span>💧 正在积攒能量</span>
                  <div style={{ 
                    width: '60px', 
                    height: '4px', 
                    background: 'rgba(0,0,0,0.08)', 
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${heroContent.nextUnitProgress.percent * 100}%`, 
                      height: '100%', 
                      background: '#0288d1',
                      borderRadius: '2px'
                    }} />
                  </div>
                  <span>{heroContent.nextUnitProgress.current}/25m</span>
                </div>
            )}
            
            {heroContent.subtitle ? <div className="lm-focus-card-hero-subtitle" style={{ marginTop: '2px' }}>{heroContent.subtitle}</div> : null}
          </div>

          {encouragementText ? <div className="lm-focus-card-encouragement">{encouragementText}</div> : null}
          <div className="lm-focus-card-hint">任意点击即可关闭</div>
        </div>

        <div
          className="lm-focus-card-actions"
          onMouseDown={() => {
            clearHideTimer();
          }}
        >
          <button type="button" className="btn btn-primary" onClick={handleContinueFocus}>
            继续专注
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleRest}>
            休息一下
          </button>
          {canMarkTaskComplete ? (
            <button type="button" className="btn btn-text" onClick={handleCompleteTask}>
              标记任务完成
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
