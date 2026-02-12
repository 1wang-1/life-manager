import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, Maximize2, Plus } from 'lucide-react';
import clsx from 'clsx';
import './MiniTimerPage.css';

type MiniState = {
  status: 'idle' | 'running' | 'paused' | 'completed';
  mode: 'pomodoro' | 'stopwatch' | 'countdown' | 'forward_stage' | 'forward_free';
  remainingTime: number;
  elapsedTime: number;
  sessionKind?: 'focus' | 'break';
  pomodoroPhase?: 'work' | 'break';
  taskTitle?: string | null;
};

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniTimerPage() {
  const [state, setState] = useState<MiniState>({
    status: 'idle',
    mode: 'countdown',
    remainingTime: 0,
    elapsedTime: 0,
    sessionKind: 'focus',
    pomodoroPhase: 'work',
    taskTitle: null
  });

  useEffect(() => {
    if (!window.api?.timer?.onState) return;
    return window.api.timer.onState((s) => setState(s as MiniState));
  }, []);

  const effectiveMode = state.mode === 'pomodoro' ? 'countdown' : state.mode;
  const isCountdown = effectiveMode === 'countdown';
  const isResting = state.sessionKind === 'break';
  const isPaused = state.status === 'paused';
  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';

  const seconds = effectiveMode === 'stopwatch' || effectiveMode === 'forward_free' || effectiveMode === 'forward_stage' ? state.elapsedTime : state.remainingTime;

  const taskLine = useMemo(() => {
    if (isResting) return '休息一下';
    if (state.taskTitle && state.taskTitle.trim()) return state.taskTitle;
    return '自由专注';
  }, [isResting, state.taskTitle]);

  const badgeText = useMemo(() => {
    if (isCompleted) return '专注完成';
    if (isPaused) return '已暂停';
    if (isResting) return '休息中';
    return isCountdown ? '倒计时 · 专注中' : '正向 · 专注中';
  }, [isCountdown, isPaused, isResting, isCompleted]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.api?.timer?.sendCommand({ type: 'toggle' });
  };
  
  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.api?.timer?.sendCommand({ type: 'stop' });
  };

  const handleExtendRest = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.api?.timer?.sendCommand({ type: 'extendBreak', minutes: 5 });
  };
  
  const handleShowMain = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.api?.timer?.sendCommand({ type: 'showMain' });
  };

  return (
    <div className={clsx('mini-page', { paused: isPaused, resting: isResting })}>
      <div className="mini-header">
        <button className="mini-icon-btn" onClick={handleShowMain} title="回到主界面">
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="mini-body">
        <div className="mini-mode-badge mini-mode-pill">{badgeText}</div>
        <div className="mini-timer-display">
          {format(Math.max(0, seconds))}
        </div>
        
        <div className="mini-info">
          <div className="mini-task-title" title={taskLine}>{taskLine}</div>
        </div>

        <div className="mini-controls-large">
          <button 
            className="mini-control-btn stop" 
            onClick={isCompleted ? undefined : handleStop} 
            disabled={isCompleted}
            title={isResting ? '跳过休息' : '结束'}
          >
            <Square size={20} fill="currentColor" />
          </button>

          {isResting ? (
            <button className="mini-control-btn main-toggle" onClick={handleExtendRest} title="延长 5 分钟">
              <Plus size={24} />
            </button>
          ) : (
            <button
              className={clsx('mini-control-btn main-toggle', {
                running: isRunning,
                disabled: isCompleted
              })}
              onClick={isCompleted ? undefined : handleToggle}
              disabled={isCompleted}
              title={isCompleted ? '专注完成' : (isRunning ? '暂停' : '继续')}
            >
              {isCompleted ? (
                <div style={{ fontSize: '16px', fontWeight: '600' }}>✓</div>
              ) : isRunning ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="play-icon" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
