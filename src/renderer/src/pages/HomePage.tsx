import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Play, Pause, Square, ChevronRight, ChevronLeft, Check, Pencil, Trash2, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

import '../App.css';
import './HomePage.css';

import { timerService } from '../services/TimerService';
import { useSettingsStore } from '../store/useSettingsStore';
import { Priority, TaskStatus, useTaskStore } from '../store/useTaskStore';
import { useTimerStore } from '../store/useTimerStore';
import { useUIStore } from '../store/useUIStore';
import { playTaskCompletionSound } from '../utils/sound';
import { TimerRing } from '../components/TimerRing';
import { FocusEndCardFeedback } from '../components/common/FocusSummary';

function formatTime(seconds: number, showSeconds = true) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    if (!showSeconds) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  if (!showSeconds) return `${m.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Module-level variable to track if we've initialized from settings in this session
let isGlobalTimerInitialized = false;

export default function HomePage() {
  const { setSidebarCollapsed, showToast } = useUIStore();
  const { tasks, addTask, updateTask, deleteTask, completeTask, isTaskTitleTaken } = useTaskStore();
  const { status, mode, remainingTime, elapsedTime, activeTaskId, totalDuration, sessionKind } = useTimerStore();
  const { settings } = useSettingsStore();

  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskTitleError, setTaskTitleError] = useState<string | null>(null);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(true);
  
  // Task Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Time Picker State
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');

  const [isImmersive, setIsImmersive] = useState(false);
  const [isBreakControlsCollapsed, setIsBreakControlsCollapsed] = useState(false);

  const timePickerRef = useRef<HTMLDivElement>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Close Time Picker on Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setIsTimePickerOpen(false);
      }
    }

    if (isTimePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimePickerOpen]);

  // Initialize Timer Defaults if Idle (Only once per session)
  useEffect(() => {
    if (isGlobalTimerInitialized) return;
    if (status !== 'idle' && status !== 'paused') return; 

    // If running, we might want to redirect or just stay. 
    // Spec says "Focus in progress -> Jump to Focus Page". 
    // We'll let the user decide via button if they land here.

    const defaultMode = settings.defaultTimerMode === 'pomodoro' ? 'countdown' : settings.defaultTimerMode;
    useTimerStore.getState().setMode(defaultMode);
    if (defaultMode === 'countdown') {
      const secs = Math.max(1, settings.countdownDefaultFocusMinutes) * 60;
      useTimerStore.getState().setRemainingTime(secs);
      useTimerStore.getState().setTotalDuration(secs);
    } else {
      useTimerStore.getState().setRemainingTime(0);
      useTimerStore.getState().setElapsedTime(0);
    }

    isGlobalTimerInitialized = true;
  }, [settings.defaultTimerMode, settings.countdownDefaultFocusMinutes, status]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayAllTasks = useMemo(() => tasks.filter((t) => t.selectedDates.includes(today)), [tasks, today]);
  
  const todaysTasks = useMemo(
    () => todayAllTasks.filter((t) => t.status !== TaskStatus.Completed),
    [todayAllTasks]
  );
  
  const todayCompletedTasks = useMemo(
    () => todayAllTasks.filter((t) => t.status === TaskStatus.Completed).reverse(),
    [todayAllTasks]
  );
  
  // const todayCompletedCount = todayCompletedTasks.length;

  const handleModeChange = (newMode: 'countdown' | 'stopwatch') => {
    useTimerStore.getState().setMode(newMode);
    
    // Reset timer state based on mode
    if (newMode === 'countdown') {
      const secs = Math.max(1, settings.countdownDefaultFocusMinutes) * 60;
      useTimerStore.getState().setRemainingTime(secs);
      useTimerStore.getState().setTotalDuration(secs);
    } else {
      // Stopwatch
      useTimerStore.getState().setRemainingTime(0);
      useTimerStore.getState().setElapsedTime(0);
    }
  };

  const handleToggleTimer = () => {
    if (status === 'running') {
      timerService.pauseTimer();
    } else {
      timerService.startTimer(activeTaskId, mode === 'pomodoro' ? 'countdown' : mode);
    }
  };

  const handleStop = () => {
    timerService.requestStopTimer();
  };

  const handleSkipBreak = () => {
    timerService.requestStopTimer();
  };

  const handleExtendBreak = () => {
    timerService.extendBreak(5);
  };

  const handleTimeClick = () => {
    // Only allow editing time in idle state and NOT in stopwatch mode
    if (status === 'idle' && mode === 'countdown') {
      setIsTimePickerOpen(!isTimePickerOpen);
    }
  };

  const canEditTime = status === 'idle' && mode === 'countdown';

  const setPresetTime = (minutes: number) => {
    useTimerStore.getState().setRemainingTime(minutes * 60);
    useTimerStore.getState().setTotalDuration(minutes * 60);
    setIsTimePickerOpen(false);
  };

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(customTimeInput, 10);
    if (!isNaN(minutes) && minutes > 0) {
      setPresetTime(minutes);
    }
    setCustomTimeInput('');
  };

  const handleQuickAddTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const nextTitle = taskSearchQuery.trim();
    if (!nextTitle) return;

    if (isTaskTitleTaken(nextTitle)) {
      setTaskTitleError('任务名称已存在');
      return;
    }

    addTask({
      title: nextTitle,
      priority: Priority.Normal,
      selectedDates: [today],
    });
    setTaskSearchQuery('');
    setTaskTitleError(null);
  };

  const selectTask = (taskId: string) => {
    useTimerStore.getState().setActiveTaskId(taskId);
  };

  const handleTaskAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const [showTodayDone, setShowTodayDone] = useState(false);

  const doneAutoCloseTimerRef = useRef<number | null>(null);

  const clearDoneAutoClose = useCallback(() => {
    if (!doneAutoCloseTimerRef.current) return;
    window.clearTimeout(doneAutoCloseTimerRef.current);
    doneAutoCloseTimerRef.current = null;
  }, []);

  const scheduleDoneAutoClose = useCallback(() => {
    clearDoneAutoClose();
    doneAutoCloseTimerRef.current = window.setTimeout(() => {
      setShowTodayDone(false);
    }, 6000);
  }, [clearDoneAutoClose]);

  useEffect(() => {
    if (!showTodayDone) {
      clearDoneAutoClose();
      return;
    }

    if (todayCompletedTasks.length === 0) {
      setShowTodayDone(false);
      return;
    }

    scheduleDoneAutoClose();
    return () => {
      clearDoneAutoClose();
    };
  }, [clearDoneAutoClose, scheduleDoneAutoClose, showTodayDone, todayCompletedTasks.length]);

  useEffect(() => {
    if (sessionKind !== 'break') setIsBreakControlsCollapsed(false);
  }, [sessionKind]);

  const undoCompleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const cycles = new Set(task.completedCycles || []);
    cycles.delete(today);
    updateTask(taskId, {
      status: TaskStatus.NotStarted,
      completedAt: undefined,
      completedCycles: Array.from(cycles)
    });
  };

  const completeTaskWithToast = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    completeTask(taskId);
    playTaskCompletionSound();
    showToast({
      title: task?.title ? `已完成：${task.title}` : '已完成',
      actionLabel: '撤销',
      onAction: () => undoCompleteTask(taskId),
      durationMs: 2400
    });
  };

  const startEditing = (task: { id: string; title: string }) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const saveEditing = () => {
    if (editingTaskId && editTitle.trim()) {
      updateTask(editingTaskId, { title: editTitle.trim() });
      setEditingTaskId(null);
      setEditTitle('');
    }
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditTitle('');
  };

  // Ring Progress
  const ringProgress = useMemo(() => {
    if (mode === 'stopwatch') {
      // Fill up every 60 seconds (1 minute ring)
      return (elapsedTime % 60) / 60;
    }
    // Countdown: Decrease as time passes (Start Full -> End Empty)
    if (totalDuration === 0) return 0;
    return Math.min(1, Math.max(0, remainingTime / totalDuration));
  }, [mode, elapsedTime, remainingTime, totalDuration]);

  const displayTime = mode === 'stopwatch' ? elapsedTime : remainingTime;

  // Format time based on mode
  const timeString = useMemo(() => {
    return formatTime(displayTime);
  }, [displayTime]);


  // Auto-focus mode effect: Collapse sidebar and todo panel when timer starts
  // Removed to prevent auto-fullscreen. User must manually toggle it.
  /*
  useEffect(() => {
    if (status === 'running') {
      setIsImmersive(true);
      setSidebarCollapsed(true);
      setIsTodoPanelOpen(false);
    }
  }, [status, setSidebarCollapsed]);
  */

  return (
    <div className={clsx('page-container home-page', { 'immersive-mode': isImmersive })}>
      <header className={clsx('page-header home-header-simple', { hidden: isImmersive })}>
        <div className="header-content greeting">
          <h1 className="page-title">开始专注</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <div className={clsx('home-grid-layout', { 'panel-collapsed': !isTodoPanelOpen || isImmersive })}>
        
        {/* Main Zone */}
        <div className="main-zone">
          <div className="focus-hero">
            
            {/* Immersive Toggle (Top Right of Hero) */}
            <div className="immersive-toggle-container">
              <button 
                className="btn-icon-ghost" 
                type="button"
                onClick={() => {
                  const newState = !isImmersive;
                  setIsImmersive(newState);
                  setSidebarCollapsed(newState);
                  setIsTodoPanelOpen(!newState);
                }}
                title={isImmersive ? "退出全屏" : "全屏专注"}
                aria-label={isImmersive ? "退出全屏" : "全屏专注"}
              >
                {isImmersive ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>

            {/* Content Stack */}
            <div className="focus-hero-stack">
              
              {/* Timer View */}
              <div className="focus-hero-timer">
                {/* Timer Mode Switcher */}
                {!isImmersive && (
                  <div className={clsx('timer-mode-switcher', { 'is-placeholder': status !== 'idle' })}>
                    <button
                      className={clsx('mode-btn', { active: mode === 'countdown' })}
                      onClick={() => handleModeChange('countdown')}
                      disabled={status !== 'idle'}
                    >
                      倒计时
                    </button>
                    <button
                      className={clsx('mode-btn', { active: mode === 'stopwatch' })}
                      onClick={() => handleModeChange('stopwatch')}
                      disabled={status !== 'idle'}
                    >
                      正向计时
                    </button>
                  </div>
                )}

                {/* Task Label */}
                <div className="current-task-display">
                  <span className="label">当前任务</span>
                  <h2 className={clsx('task-title', { 'is-empty': !activeTask })} title={activeTask?.title}>
                    {activeTask ? activeTask.title : '选择一个任务开始专注'}
                  </h2>
                </div>

                {/* Timer Ring */}
                <div className="timer-ring-container-large">
                  <TimerRing 
                    progress={ringProgress} 
                    state={status === 'running' ? 'running' : status === 'paused' ? 'paused' : status === 'completed' ? 'finished' : status === 'idle' ? 'idle' : 'finished'}
                    variant={mode === 'stopwatch' ? 'ticks' : 'ring'}
                  />

                  <div className="timer-center-content" ref={timePickerRef}>
                    {!isTimePickerOpen ? (
                      <button
                        type="button"
                        className={clsx('timer-time', { clickable: canEditTime })}
                        onClick={handleTimeClick}
                        disabled={!canEditTime}
                        aria-label={canEditTime ? '设置倒计时时间' : '计时显示'}
                        aria-expanded={isTimePickerOpen}
                        aria-controls="home-time-picker"
                      >
                        {timeString}
                      </button>
                    ) : (
                      <div className="time-picker-embedded" id="home-time-picker">
                        <div className="preset-row">
                          <button type="button" className="action-chip" onClick={() => setPresetTime(25)}>
                            25
                          </button>
                          <button type="button" className="action-chip" onClick={() => setPresetTime(45)}>
                            45
                          </button>
                          <button type="button" className="action-chip" onClick={() => setPresetTime(60)}>
                            60
                          </button>
                        </div>
                        <form onSubmit={handleCustomTimeSubmit} className="custom-time-form">
                          <input
                            type="number"
                            placeholder="自定义(分)"
                            value={customTimeInput}
                            onChange={(e) => setCustomTimeInput(e.target.value)}
                            autoFocus
                          />
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="hero-actions">
                  {sessionKind === 'break' ? (
                    isBreakControlsCollapsed ? (
                      <button className="btn-hero-secondary is-neutral" onClick={() => setIsBreakControlsCollapsed(false)}>
                        <span>休息中 {formatTime(Math.max(0, remainingTime))}</span>
                      </button>
                    ) : (
                      <div className="running-controls">
                        <button className="btn-hero-primary" onClick={handleExtendBreak}>
                          <span>延长 5 分钟</span>
                        </button>
                        <button className="btn-hero-secondary" onClick={handleSkipBreak}>
                          <span>跳过</span>
                        </button>
                        <button className="btn-hero-secondary is-neutral" onClick={() => setIsBreakControlsCollapsed(true)}>
                          <span>收起</span>
                        </button>
                      </div>
                    )
                  ) : status === 'idle' ? (
                    <button className="btn-hero-start" onClick={handleToggleTimer}>
                      <Play fill="currentColor" size={24} />
                      <span>开始专注</span>
                    </button>
                  ) : (
                    <div className="running-controls">
                      <button
                        className={clsx(
                          status === 'running' ? 'btn-hero-secondary is-neutral is-dimmed' : 
                          status === 'completed' ? 'btn-hero-secondary is-disabled' : 'btn-hero-primary'
                        )}
                        onClick={status === 'completed' ? undefined : handleToggleTimer}
                        disabled={status === 'completed'}
                      >
                        {status === 'running' ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} />}
                        <span>{status === 'running' ? '暂停' : '继续'}</span>
                      </button>
                      <button 
                        className={clsx('btn-hero-secondary', { 
                          'is-dimmed': status === 'running' || status === 'completed' 
                        })} 
                        onClick={status === 'completed' ? undefined : handleStop}
                        disabled={status === 'completed'}
                      >
                        <Square fill="currentColor" size={20} />
                        <span>结束</span>
                      </button>
                    </div>
                  )}
                </div>

                <FocusEndCardFeedback />
              </div>
            </div>

          </div>
        </div>

        {/* Right Zone: Todo Panel */}
        {!isImmersive && (
          isTodoPanelOpen ? (
            <div className="right-zone-panel">
              <div className="panel-header">
                <h3>今日</h3>
                <div className="panel-header-actions">
                  {todayCompletedTasks.length > 0 && (
                    <button
                      type="button"
                      className={clsx('btn-text-ghost', { active: showTodayDone })}
                      onClick={() => setShowTodayDone((v) => !v)}
                      aria-pressed={showTodayDone}
                    >
                      回看完成 · {todayCompletedTasks.length}
                    </button>
                  )}
                  <button className="btn-icon-ghost" onClick={() => setIsTodoPanelOpen(false)} title="折叠面板">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              <div className="panel-content">
                {todaysTasks.length === 0 ? (
                  <div className="empty-todo-state" role="status">
                    <div className="empty-todo-title">今天还没有任务</div>
                    <div className="empty-todo-desc">先写一件最想完成的小事吧。</div>
                    <button
                      type="button"
                      className="empty-todo-btn"
                      onClick={() => quickAddInputRef.current?.focus()}
                    >
                      新建任务
                    </button>
                  </div>
                ) : (
                  <div className="todo-list-compact" role="list" aria-label="今日待办">
                    {todaysTasks.map((task) => (
                      <div
                        key={task.id}
                        className={clsx('todo-item-compact', { active: activeTaskId === task.id })}
                        onClick={() => selectTask(task.id)}
                        role="listitem"
                      >
                        {editingTaskId === task.id ? (
                          <div className="task-edit-mode" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              autoFocus
                            />
                            <div className="edit-actions">
                              <button className="btn-icon-small success" onClick={saveEditing}>
                                <Check size={14} />
                              </button>
                              <button className="btn-icon-small" onClick={cancelEditing}>
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="status-indicator" />
                            <span className="task-title">{task.title}</span>

                            <div className="item-hover-actions">
                              <button
                                className="btn-icon-small"
                                title="完成"
                                onClick={(e) => handleTaskAction(e, () => completeTaskWithToast(task.id))}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="btn-icon-small"
                                title="编辑"
                                onClick={(e) => handleTaskAction(e, () => startEditing(task))}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn-icon-small danger"
                                title="删除"
                                onClick={(e) => handleTaskAction(e, () => deleteTask(task.id))}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showTodayDone && todayCompletedTasks.length > 0 && (
                  <div
                    className="today-done-list"
                    onMouseEnter={clearDoneAutoClose}
                    onMouseLeave={() => {
                      if (!showTodayDone) return;
                      scheduleDoneAutoClose();
                    }}
                  >
                    <div className="today-done-divider" />
                    <div className="todo-list-compact" role="list" aria-label="今日已完成">
                      {todayCompletedTasks.map((task) => (
                        <div
                          key={task.id}
                          className={clsx('todo-item-compact', 'is-completed', { active: activeTaskId === task.id })}
                          onClick={() => selectTask(task.id)}
                          role="listitem"
                        >
                          <div className="status-indicator" />
                          <span className="task-title">{task.title}</span>

                          <div className="item-hover-actions">
                            <button
                              className="btn-icon-small"
                              title="撤销完成"
                              onClick={(e) => handleTaskAction(e, () => undoCompleteTask(task.id))}
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              className="btn-icon-small danger"
                              title="删除"
                              onClick={(e) => handleTaskAction(e, () => deleteTask(task.id))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="panel-footer-input">
                <input 
                  ref={quickAddInputRef}
                  type="text" 
                  placeholder="添加新任务..." 
                  value={taskSearchQuery}
                  onChange={(e) => {
                    setTaskSearchQuery(e.target.value);
                    if (taskTitleError) setTaskTitleError(null);
                  }}
                  onKeyDown={handleQuickAddTask}
                  className={clsx({ 'has-error': Boolean(taskTitleError) })}
                  aria-invalid={Boolean(taskTitleError)}
                  aria-describedby={taskTitleError ? 'home-task-title-error' : undefined}
                />
                {taskTitleError && (
                  <div className="panel-footer-error" id="home-task-title-error" role="alert">
                    {taskTitleError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div 
              className="collapsed-panel-trigger" 
              onClick={() => setIsTodoPanelOpen(true)}
              title="展开今日"
            >
              <div className="trigger-content">
                <span className="vertical-text">📋 今日 · {todaysTasks.length}</span>
                <ChevronLeft size={16} />
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
