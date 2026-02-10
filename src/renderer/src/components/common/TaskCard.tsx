import { clsx } from 'clsx';
import { Play, Pause, Square, Edit2, Trash2, CheckCircle, Clock, Zap, Hourglass, Timer, SlidersHorizontal, MoreHorizontal, Calendar } from 'lucide-react';
import { TaskItem, useTaskStore } from '../../store/useTaskStore';
import { useTimerStore } from '../../store/useTimerStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useUIStore } from '../../store/useUIStore';
import { timerService } from '../../services/TimerService';
import { playTaskCompletionSound } from '../../utils/sound';
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './TaskCard.css';

interface TaskCardProps {
  task: TaskItem;
  variant?: 'card' | 'list';
  onEdit: (task: TaskItem) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  readOnly?: boolean;
}

const priorityConfig: Record<'low' | 'normal' | 'high', { label: string, color: string, bg: string }> = {
  low: { label: '低优先级', color: '#10b981', bg: '#ecfdf5' },
  normal: { label: '中优先级', color: '#3b82f6', bg: '#eff6ff' },
  high: { label: '高优先级', color: '#ef4444', bg: '#fef2f2' }
};

export function TaskCard({ task, variant = 'card', onEdit, onDragStart, readOnly = false }: TaskCardProps) {
  const { deleteTask, completeTask, completeTaskFinal, updateTask, selectedTaskId, setSelectedTask } = useTaskStore();
  const showToast = useUIStore((s) => s.showToast);
  const isSelected = selectedTaskId === task.id;
  const focusRecords = useTaskStore((s) => s.focusRecords);
  const { activeTaskId, status: timerStatus, mode: globalMode, remainingTime, elapsedTime, mode } = useTimerStore();
  const { settings } = useSettingsStore();
  
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMode, setCustomMode] = useState<'default' | 'countdown' | 'stopwatch'>('default');
  const [customMinutes, setCustomMinutes] = useState('30');
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const pConfig = priorityConfig[task.priority];

  const isTimerRunning = activeTaskId === task.id && timerStatus === 'running';
  const isTimerPaused = activeTaskId === task.id && timerStatus === 'paused';
  const isTimerActive = isTimerRunning || isTimerPaused;
  const isCapsuleView = false; // variant === 'card' && isTimerActive;
  const isRecentlyCompleted = task.status === 'completed' && !!task.completedAt && Date.now() - task.completedAt < 10 * 60 * 1000;

  const lastFocusEnd = (() => {
    for (let i = focusRecords.length - 1; i >= 0; i--) {
      const r = focusRecords[i];
      if (r.taskId === task.id) return r.endTime;
    }
    return null;
  })();

  const isRecentlyFocused = !!lastFocusEnd && Date.now() - lastFocusEnd < 10 * 60 * 1000;

  useEffect(() => {
    if (!showCustomModal) return;
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showCustomModal]);

  const openPreferenceModal = () => {
    const defaultCountdownMinutes = Math.max(1, settings.countdownDefaultFocusMinutes);
    if (!task.focusPreference) {
      setCustomMode('default');
      setCustomMinutes(String(defaultCountdownMinutes));
    } else {
      const effectiveMode = task.focusPreference.mode === 'stopwatch' ? 'stopwatch' : 'countdown';
      setCustomMode(effectiveMode);
      if (effectiveMode === 'countdown' && task.focusPreference.duration) {
        setCustomMinutes(String(task.focusPreference.duration));
      } else {
        setCustomMinutes(String(defaultCountdownMinutes));
      }
    }
    setShowCustomModal(true);
  };

  const applyModeFromModal = (next: 'default' | 'countdown' | 'stopwatch') => {
    setCustomMode(next);
    if (next === 'countdown') {
      setCustomMinutes(String(Math.max(1, settings.countdownDefaultFocusMinutes)));
    }
  };

  const presets = useMemo(() => [25, 45, 60], []);

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning) {
      timerService.pauseTimer();
    } else {
      let startMode = globalMode === 'pomodoro' ? 'countdown' : globalMode;
      let startDuration: number | undefined = undefined;

      // 1. Check Preference
      if (task.focusPreference) {
        startMode = task.focusPreference.mode === 'pomodoro' ? 'countdown' : task.focusPreference.mode;
        if (task.focusPreference.duration) {
          startDuration = task.focusPreference.duration; // minutes
        }
      }
      
      // 2. If no specific duration from preference, check plannedTime logic?
      // Actually, if preference is set (e.g. Pomodoro), we usually just use default pomodoro time unless duration is set.
      // If preference is Countdown, we definitely need a duration.
      // If task.focusPreference.duration is undefined but mode is countdown, what to do?
      // Fallback to plannedTime parsing.

      if (startMode === 'countdown' && !startDuration && task.plannedTime) {
          const timeStr = task.plannedTime.toLowerCase().trim();
          if (timeStr.endsWith('h')) {
            startDuration = parseFloat(timeStr) * 60;
          } else if (timeStr.endsWith('m')) {
            startDuration = parseFloat(timeStr);
          } else if (!isNaN(Number(timeStr))) {
            startDuration = Number(timeStr);
          }
      }

      if (startMode === 'countdown' && !startDuration) startDuration = Math.max(1, settings.countdownDefaultFocusMinutes);

      timerService.startTimer(task.id, startMode, startDuration);
    }
  };

  const handleStopTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerActive) {
      timerService.requestStopTimer();
    }
  };

  const handleCustomSave = () => {
    if (customMode === 'default') {
      updateTask(task.id, { focusPreference: undefined });
      setShowCustomModal(false);
      return;
    }

    if (customMode === 'stopwatch') {
      updateTask(task.id, { focusPreference: { mode: 'stopwatch' } });
      setShowCustomModal(false);
      return;
    }

    const mins = Math.max(1, Math.min(999, Number(customMinutes)));
    if (!Number.isFinite(mins)) return;

    updateTask(task.id, { focusPreference: { mode: 'countdown', duration: mins } });

    setShowCustomModal(false);
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const undoSnapshot = {
      status: task.status,
      completedAt: task.completedAt,
      completedCycles: task.completedCycles,
      selectedDates: task.selectedDates
    };

    if (activeTaskId === task.id && timerStatus !== 'idle') {
      timerService.requestStopTimer({
        onStopped: () => {
          playTaskCompletionSound();
          completeTask(task.id);
          showToast({
            title: `已完成：${task.title}`,
            actionLabel: '撤销',
            onAction: () => updateTask(task.id, undoSnapshot),
            durationMs: 2400
          });
        }
      });
      return;
    }
    playTaskCompletionSound();
    completeTask(task.id);
    showToast({
      title: `已完成：${task.title}`,
      actionLabel: '撤销',
      onAction: () => updateTask(task.id, undoSnapshot),
      durationMs: 2400
    });
  };

  const handlePermanentComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const undoSnapshot = {
      status: task.status,
      completedAt: task.completedAt,
      completedCycles: task.completedCycles,
      selectedDates: task.selectedDates
    };

    if (activeTaskId === task.id && timerStatus !== 'idle') {
      timerService.requestStopTimer({
        onStopped: () => {
          playTaskCompletionSound();
          completeTaskFinal(task.id);
          showToast({
            title: `已完成：${task.title}`,
            actionLabel: '撤销',
            onAction: () => updateTask(task.id, undoSnapshot),
            durationMs: 2400
          });
        }
      });
      return;
    }
    playTaskCompletionSound();
    completeTaskFinal(task.id);
    showToast({
      title: `已完成：${task.title}`,
      actionLabel: '撤销',
      onAction: () => updateTask(task.id, undoSnapshot),
      durationMs: 2400
    });
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0m';
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  };

  const spentMinutes = Math.floor((task.totalTimeSpent || 0) / 60);

  const liveTimeText = () => {
    if (!isTimerActive) return null;
    const seconds = mode === 'stopwatch' ? elapsedTime : remainingTime;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
      if (task.focusPreference) {
          const { mode, duration } = task.focusPreference;
          if (mode === 'countdown' && duration) return `倒数 ${duration}m`;
          if (mode === 'pomodoro') return `倒数 ${duration || 25}m`;
          if (mode === 'stopwatch') return '正向';
      }
      
      // Default fallback - show actual details
      const { defaultTimerMode } = settings;
      if (defaultTimerMode === 'pomodoro') return `默认: 倒数 ${Math.max(1, settings.countdownDefaultFocusMinutes)}m`;
      if (defaultTimerMode === 'countdown') return `默认: 倒数 ${Math.max(1, settings.countdownDefaultFocusMinutes)}m`;
      if (defaultTimerMode === 'stopwatch') return `默认: 正向`;
      
      return '默认';
  };

  const getDateLabel = () => {
    if (!task.selectedDates || task.selectedDates.length === 0) return null;

    const uniqueSorted = Array.from(new Set(task.selectedDates)).sort((a, b) => a.localeCompare(b));

    for (const dateStr of uniqueSorted) {
      const date = parseISO(dateStr);
      if (isToday(date)) return '今天';
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const upcoming = uniqueSorted.find((d) => d >= todayStr);
    if (upcoming) {
      const date = parseISO(upcoming);
      if (isTomorrow(date)) return '明天';
      return format(date, 'M月d日', { locale: zhCN });
    }

    const latest = uniqueSorted[uniqueSorted.length - 1];
    return format(parseISO(latest), 'M月d日', { locale: zhCN });
  };

  const dateLabel = getDateLabel();

  return (
    <div
      className={clsx('task-card group relative', `variant-${variant}`, {
        'variant-capsule': isCapsuleView,
        'active-timer': isTimerActive,
        'recently-completed': isRecentlyCompleted,
        'recently-focused': isRecentlyFocused,
        'selected': isSelected,
        'completed-status': task.status === 'completed'
      })}
      data-task-id={task.id}
      onClick={() => {
        // Prevent toggling if clicking on buttons/inputs, but usually buttons have stopPropagation
        setSelectedTask(isSelected ? null : task.id);
      }}
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      style={{ viewTransitionName: `task-${task.id}` } as React.CSSProperties}
    >
      {showCustomModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="modal-content task-mode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-mode-modal-header">
              <h3>计时偏好</h3>
              <button className="btn btn-ghost" onClick={() => setShowCustomModal(false)}>取消</button>
            </div>

            <div className="task-mode-modal-body">
              <div className="task-mode-radio">
                <button
                  className={clsx('task-mode-radio-btn', { active: customMode === 'default' })}
                  onClick={() => applyModeFromModal('default')}
                >
                  <Zap size={24} />
                  <span>默认</span>
                </button>
                <button
                  className={clsx('task-mode-radio-btn', { active: customMode === 'countdown' })}
                  onClick={() => applyModeFromModal('countdown')}
                >
                  <Hourglass size={24} /> 
                  <span>倒数</span>
                </button>
                <button
                  className={clsx('task-mode-radio-btn', { active: customMode === 'stopwatch' })}
                  onClick={() => applyModeFromModal('stopwatch')}
                >
                  <Timer size={24} /> 
                  <span>正向</span>
                </button>
              </div>

              <div className="task-mode-content-area">
                {customMode === 'default' && (
                  <div className="mode-info-card default fade-in">
                     <div className="info-icon-wrapper"><Zap size={28} /></div>
                     <div className="info-text-content">
                       <h4>使用全局默认设置</h4>
                       <p>当前系统设置为：{settings.defaultTimerMode === 'stopwatch' ? '正向计时' : '倒计时'}</p>
                       {settings.defaultTimerMode !== 'stopwatch' && (
                         <div className="highlight-value">
                          {Math.max(1, settings.countdownDefaultFocusMinutes)} <span className="unit">分钟</span>
                         </div>
                       )}
                     </div>
                  </div>
                )}

                {customMode === 'stopwatch' && (
                  <div className="mode-info-card stopwatch fade-in">
                     <div className="info-icon-wrapper"><Timer size={28} /></div>
                     <div className="info-text-content">
                       <h4>正向计时模式</h4>
                       <p>从 0 开始累计时间，适用于不确定时长的任务。</p>
                       <div className="highlight-value">∞ <span className="unit">无限制</span></div>
                     </div>
                  </div>
                )}

                {customMode === 'countdown' && (
                  <div className="mode-info-card input-mode fade-in">
                     <div className="info-icon-wrapper">
                        <Hourglass size={28} />
                     </div>
                     <div className="info-text-content full-width">
                        <div className="input-header-row">
                           <h4>倒计时模式</h4>
                        </div>
                        
                        <div className="input-main-row">
                           <div className="input-wrapper">
                             <input
                               className="main-time-input"
                               type="number"
                               min="1"
                               max="999"
                               value={customMinutes}
                               onChange={(e) => setCustomMinutes(e.target.value)}
                             />
                             <span className="input-unit">分钟</span>
                           </div>
                           
                           <div className="task-mode-presets">
                              {presets.map((m) => (
                                <button 
                                  key={m} 
                                  className={clsx("preset-chip", { active: customMinutes === String(m) })} 
                                  onClick={() => setCustomMinutes(String(m))}
                                >
                                  {m}m
                                </button>
                              ))}
                           </div>
                        </div>

                     </div>
                  </div>
                )}
              </div>
            </div>

            <div className="task-mode-modal-actions">
              <button className="btn btn-primary" onClick={handleCustomSave}>保存</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCapsuleView ? (
        // Capsule Variant (Active Timer)
        <div className="capsule-inner">
           <div className="capsule-left">
             <button 
                className="capsule-btn primary-action" 
                onClick={handleToggleTimer}
                title={isTimerPaused ? "继续" : "暂停"}
             >
                {isTimerPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
             </button>
           </div>
           
           <div className="capsule-center">
              <span className="capsule-time">{liveTimeText()}</span>
              <span className="capsule-title" title={task.title}>{task.title}</span>
           </div>
           
           <div className="capsule-right">
              <button className="capsule-btn stop-action" onClick={handleStopTimer} title="结束">
                 <Square size={14} fill="currentColor" />
              </button>
              <button className="capsule-btn complete-action" onClick={handleComplete} title="完成">
                 <CheckCircle size={16} />
              </button>
           </div>
        </div>
      ) : variant === 'list' ? (
        // List Variant Layout
        <div className="task-list-content">
            <div className="task-list-header">
                <div className="task-list-left">
                    <span 
                        className="priority-dot-large"
                        style={{ backgroundColor: priorityConfig[task.priority].color }}
                    />
                    <span className={clsx("task-list-title", { completed: task.status === 'completed' })}>
                        {task.title}
                    </span>
                </div>
                <div className="task-list-right">
                    {/* Hover Actions */}
                    {!readOnly && (
                    <div className="task-hover-actions">
                         {task.status !== 'completed' && (
                            <>
                            <button 
                                className={clsx('action-btn icon-only play-btn', { active: isTimerActive })}
                                onClick={handleToggleTimer}
                                title={isTimerActive ? "暂停计时" : `开始专注`}
                            >
                                {isTimerActive ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            
                            {isTimerActive && (
                                 <button className="action-btn icon-only stop-btn" onClick={handleStopTimer} title="结束计时">
                                    <Square size={16} />
                                 </button>
                            )}
                            
                            <button className="action-btn preference-btn" onClick={(e) => { e.stopPropagation(); openPreferenceModal(); }} title="计时偏好">
                             <SlidersHorizontal size={14} />
                             <span>{getModeLabel()}</span>
                        </button>
    
                            <button className="action-btn icon-only complete-btn" onClick={handleComplete} title="完成任务">
                                <CheckCircle size={16} />
                            </button>
                            </>
                        )}
                        
                        <button className="action-btn icon-only" onClick={() => onEdit(task)} title="编辑">
                            <Edit2 size={16} />
                        </button>
                        <button className="action-btn icon-only delete" onClick={() => deleteTask(task.id)} title="删除">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    )}

                    {/* Static Info (Visible when not hovering, or pushed left) */}
                    <div className="task-info-static">
                        {isTimerActive && (
                            <span className="list-timer-badge">
                                {liveTimeText()}
                            </span>
                        )}
                        {!isTimerActive && spentMinutes > 0 && (
                            <span className="meta-tag compact">
                                <Clock size={12} /> {formatTime(task.totalTimeSpent)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        // Card Variant (Kanban) Layout
        <div className="task-card-content">
          <div className="task-card-header-row">
            <span 
              className="priority-tag"
              style={{ color: pConfig.color, backgroundColor: pConfig.bg }}
            >
              {pConfig.label}
            </span>
            {dateLabel && (
                <span className="date-tag">
                    <Calendar size={12} /> {dateLabel}
                </span>
            )}
          </div>

          <h3 className="task-card-title">
            {task.title}
          </h3>

          <div className="task-card-footer-row">
            <div className="time-status-wrapper">
               <div className="time-spent-group" title="已专注 / 预计">
                  <Clock size={14} className={clsx("icon-clock", { "active-pulse": isTimerActive })} />
                  <span className={clsx("time-text", { "active-text": isTimerActive })}>
                    {isTimerActive ? liveTimeText() : formatTime(task.totalTimeSpent)}
                  </span>
                  {task.plannedTime && (
                    <span className="planned-time-text">
                       / {task.plannedTime}
                    </span>
                  )}
               </div>
            </div>

            <div className={clsx("card-actions", { "visible": isTimerActive || isSelected || showMenu })}>
              {/* Play/Pause */}
              {!readOnly && (
              <>
              {task.status !== 'completed' && (
                 <button 
                   className={clsx("action-btn-small", { "active": isTimerActive })}
                   onClick={handleToggleTimer}
                   title={isTimerRunning ? "暂停" : "开始"}
                 >
                   {isTimerRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                 </button>
              )}

              {/* Stop Timer */}
              {isTimerActive && (
                 <button 
                   className="action-btn-small" 
                   onClick={handleStopTimer}
                   title="结束计时"
                 >
                   <Square size={14} fill="currentColor" />
                 </button>
              )}

              {/* Complete */}
              {task.status !== 'completed' && (
                 <button 
                   className="action-btn-small" 
                   onClick={handleComplete}
                   title="完成"
                 >
                   <CheckCircle size={14} />
                 </button>
              )}
              
              {/* More Menu */}
              <div className="relative-container">
                <button 
                  ref={moreButtonRef}
                  className={clsx("action-btn-small", { "active": showMenu })}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (showMenu) {
                      setShowMenu(false);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Align right edge of menu with right edge of button
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.right - 140 // 140px is menu width
                      });
                      setShowMenu(true);
                    }
                  }}
                  title="更多"
                >
                   <MoreHorizontal size={14} />
                </button>

                {showMenu && menuPosition && createPortal(
                  <>
                    <div className="fixed-overlay" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                    <div 
                      className="task-context-menu" 
                      style={{ 
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        bottom: 'auto',
                        right: 'auto',
                        marginBottom: 0
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                       <button 
                         className="menu-item"
                         onClick={(e) => { e.stopPropagation(); setShowMenu(false); openPreferenceModal(); }}
                       >
                         <SlidersHorizontal size={14} className="menu-icon" /> 计时设置
                       </button>
                       <button 
                         className="menu-item"
                         onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(task); }}
                       >
                         <Edit2 size={14} className="menu-icon" /> 编辑
                       </button>

                       {task.status !== 'completed' && (
                          <button 
                            className="menu-item"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); handlePermanentComplete(e); }}
                          >
                            <CheckCircle size={14} className="menu-icon" /> 永久完成
                          </button>
                        )}
                       
                       <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 8px' }} />

                       <button 
                         className="menu-item delete"
                         onClick={(e) => { e.stopPropagation(); setShowMenu(false); deleteTask(task.id); }}
                       >
                         <Trash2 size={14} className="menu-icon" /> 删除
                       </button>
                    </div>
                  </>,
                  document.body
                )}
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
