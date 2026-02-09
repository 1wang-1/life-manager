import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useTimerStore } from '../store/useTimerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { timerService } from '../services/TimerService';
import { focusSessionState } from '../utils/focusSession';
import { FocusEndCardFeedback } from '../components/common/FocusSummary';
import './FocusPage.css';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const MODES = [
  { id: 'countdown', label: '倒计时' },
  { id: 'stopwatch', label: '正向计时' },
  { id: 'forward_stage', label: '正向阶段' }
] as const;

type ModeId = (typeof MODES)[number]['id'];

const TickRing = ({ size = 300, elapsedTime, children }: { size?: number, elapsedTime: number, children: React.ReactNode }) => {
  const tickCount = 120; // 30s per tick -> 60 minutes full circle
  const activeTicks = Math.floor(elapsedTime / 30);
  const currentTickIndex = activeTicks % tickCount;
  
  // Radius calculation
  // We want the ticks to be on the perimeter.
  // SVG size is `size` x `size`. Center is size/2.
  const center = size / 2;
  const outerRadius = size / 2;
  
  return (
    <div className="circular-progress-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="circular-progress-svg tick-ring">
        {Array.from({ length: tickCount }).map((_, i) => {
          const isMajor = i % 20 === 0; // Every 10 mins (20 * 30s)
          const isActive = i <= currentTickIndex;
          const isCurrent = i === currentTickIndex;
          
          // Tick dimensions
          const length = isMajor ? 24 : 12; 
          const strokeWidth = isMajor ? 3 : 2;
          
          // Rotate around center
          const angle = i * 3; // 360 / 120 = 3 degrees
          
          return (
            <line
              key={i}
              x1={center}
              y1={center - outerRadius + (isMajor ? 0 : 4)} // Slight offset for minor ticks if desired, or align outer
              x2={center}
              y2={center - outerRadius + length + (isMajor ? 0 : 4)}
              className={`tick ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isMajor ? 'major' : ''}`}
              transform={`rotate(${angle} ${center} ${center})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="circular-content">
        {children}
      </div>
    </div>
  );
};

const CircularProgress = ({ size = 300, strokeWidth = 8, progress, mode, elapsedTime = 0, children }: { size?: number; strokeWidth?: number; progress: number; mode?: string; elapsedTime?: number; children: React.ReactNode }) => {
  if (mode === 'stopwatch' || mode === 'countdown') {
    return <TickRing size={size} elapsedTime={elapsedTime} children={children} />;
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  // For Forward Free mode, we might want a different visual (e.g., hidden ring or spinning)
  // For now, if progress is > 1 (shouldn't happen with clamping) or specific mode
  
  return (
    <div className="circular-progress-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="circular-progress-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="progress-bg"
          strokeWidth={strokeWidth}
          style={{ opacity: mode === 'forward_free' ? 0.3 : 1 }}
        />
        {mode !== 'forward_free' && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="progress-fg"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <div className="circular-content">
        {children}
      </div>
    </div>
  );
};

export default function FocusPage() {
  const navigate = useNavigate();
  const tasks = useTaskStore((state) => state.tasks);
  const countdownDefaultFocusMinutes = useSettingsStore((s) => s.settings.countdownDefaultFocusMinutes);
  const timerStatus = useTimerStore((state) => state.status);
  const timerMode = useTimerStore((state) => state.mode);
  const sessionKind = useTimerStore((state) => state.sessionKind);
  const remainingTime = useTimerStore((state) => state.remainingTime);
  const elapsedTime = useTimerStore((state) => state.elapsedTime);
  const activeTaskId = useTimerStore((state) => state.activeTaskId);
  const showSummary = useTimerStore((state) => state.showSummary);
  const activeTask = tasks.find((task) => task.id === activeTaskId);
  
  const stageIndex = useTimerStore((state) => state.stageIndex);
  const stageDuration = useTimerStore((state) => state.stageDuration);
  const elapsedInStage = useTimerStore((state) => state.elapsedInStage);
  
  const setMode = useTimerStore((state) => state.setMode);

  const effectiveTimerMode = timerMode === 'pomodoro' ? 'countdown' : timerMode;

  const prevStatusRef = useRef(timerStatus);
  const isFirstMount = useRef(true);
  const [isBreakControlsCollapsed, setIsBreakControlsCollapsed] = useState(false);

  useEffect(() => {
    if (sessionKind !== 'break') setIsBreakControlsCollapsed(false);
  }, [sessionKind]);

  useEffect(() => {
    const wasRunning = prevStatusRef.current === 'running';
    const justStarted = !wasRunning && timerStatus === 'running';
    const justStopped = wasRunning && timerStatus === 'idle';

    // Auto-maximize if timer starts or if we enter the page with timer already running
    if (
      (justStarted || (isFirstMount.current && timerStatus === 'running')) && 
      !focusSessionState.manualExit && 
      !focusSessionState.autoMaximized
    ) {
      window.api?.window?.maximize?.();
      focusSessionState.autoMaximized = true;
    }

    if (
      justStopped &&
      focusSessionState.autoMaximized &&
      !focusSessionState.userTriggeredFullscreen &&
      !showSummary
    ) {
      window.api?.window?.restore?.();
      focusSessionState.autoMaximized = false;
    }

    if (justStopped && !showSummary) {
      focusSessionState.manualExit = false;
      focusSessionState.userTriggeredFullscreen = false;
    }

    prevStatusRef.current = timerStatus;
    isFirstMount.current = false;
  }, [timerStatus, showSummary]);

  // Calculate progress and display text
  let displayTime = effectiveTimerMode === 'stopwatch' ? formatTime(elapsedTime) : formatTime(remainingTime);
  let progress = 0;
  
  if (effectiveTimerMode === 'forward_stage') {
    displayTime = formatTime(elapsedInStage);
    progress = stageDuration > 0 ? elapsedInStage / stageDuration : 0;
  } else if (effectiveTimerMode === 'forward_free') {
    displayTime = formatTime(elapsedTime);
    progress = 0;
  } else if (effectiveTimerMode === 'stopwatch') {
    // Stopwatch: Grow ring over 60 minutes, stop at full
    progress = Math.min(1, elapsedTime / 3600);
  } else {
    // countdown
    const totalDuration = remainingTime + elapsedTime;
    progress = totalDuration > 0 ? remainingTime / totalDuration : 0;
  }

  const handleExitView = () => {
    if (focusSessionState.autoMaximized && !focusSessionState.userTriggeredFullscreen) {
      window.api?.window?.restore?.();
      focusSessionState.autoMaximized = false;
    }
    focusSessionState.manualExit = true;
    navigate('/');
  };

  const handleStopAndExit = () => {
    timerService.requestStopTimer({
      onStopped: () => {
        if (focusSessionState.autoMaximized && !focusSessionState.userTriggeredFullscreen) {
          window.api?.window?.restore?.();
          focusSessionState.autoMaximized = false;
        }
        focusSessionState.manualExit = false;
        navigate('/');
      }
    });
  };

  const toggleTimer = () => {
    if (timerStatus === 'running') {
      timerService.pauseTimer();
      return;
    }
    timerService.startTimer(activeTaskId || null, timerMode);
  };

  const handleUserMaximize = () => {
    focusSessionState.userTriggeredFullscreen = true;
    focusSessionState.autoMaximized = false;
    window.api?.window?.maximize?.();
  };

  const handleStopAndConfirm = () => {
    handleStopAndExit();
  };

  const handleModeChange = (mode: ModeId) => {
    if (timerStatus === 'running') return; // Prevent changing mode while running
    setMode(mode);
    if (mode === 'countdown') {
       // Keep current or set default? Let's assume store handles it or keeps previous
       timerService.resetTimer(Math.max(1, countdownDefaultFocusMinutes) * 60, 'countdown');
    } else if (mode === 'stopwatch') {
       timerService.resetTimer(0, 'stopwatch');
    }
  };

  return (
    <div className="focus-page">
      <div className="focus-page-backdrop" aria-hidden />
      
      <div className="focus-panel ticktick-style">
        {/* Top Bar */}
        <div className="focus-top-bar">
           {/* Mode Switcher Pill - Only show when idle */}
           {timerStatus === 'idle' && (
             <div className="mode-switcher">
               {MODES.map((m) => (
                 <button
                   key={m.id}
                   className={`mode-btn ${effectiveTimerMode === m.id ? 'active' : ''}`}
                   onClick={() => handleModeChange(m.id)}
                 >
                   {m.label}
                 </button>
               ))}
             </div>
           )}
           
           <div className="window-controls">
             <button className="icon-btn" onClick={handleUserMaximize} title="全屏/沉浸">
                <Maximize2 size={20} />
             </button>
             <button className="icon-btn" onClick={handleExitView} title="返回">
                <ArrowLeft size={20} />
             </button>
           </div>
        </div>

        {/* Center Content */}
        <div className="focus-center-content">
          <div className="focus-context">
            <span className="focus-subtitle">
              {MODES.find((m) => m.id === effectiveTimerMode)?.label || '专注'} &gt;
            </span>
            <h2 className="focus-task-title">{activeTask ? activeTask.title : '自由专注'}</h2>
            {effectiveTimerMode === 'forward_stage' && (
              <div className="focus-stage-meta">
                阶段 {stageIndex} / {Math.floor(stageDuration / 60)}分
              </div>
            )}
          </div>

          <CircularProgress progress={progress} mode={effectiveTimerMode} elapsedTime={elapsedTime}>
             {effectiveTimerMode === 'forward_stage' ? (
               <>
                 <div className="timer-value">{displayTime}</div>
               </>
             ) : effectiveTimerMode === 'forward_free' ? (
               <>
                 <div className="timer-value">{displayTime}</div>
               </>
             ) : (
               <>
                 <div className="timer-value">{displayTime}</div>
               </>
             )}
          </CircularProgress>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <FocusEndCardFeedback />
        </div>

        {/* Bottom Controls */}
        <div className="focus-bottom-controls">
          {sessionKind === 'break' ? (
            isBreakControlsCollapsed ? (
              <button className="control-btn secondary" onClick={() => setIsBreakControlsCollapsed(false)}>
                休息中 {formatTime(Math.max(0, remainingTime))}
              </button>
            ) : (
              <>
                <button className="control-btn primary" onClick={() => timerService.extendBreak(5)}>
                  延长 5 分钟
                </button>
                <button className="control-btn secondary" onClick={() => timerService.requestStopTimer()}>
                  跳过
                </button>
                <button className="control-btn secondary" onClick={() => setIsBreakControlsCollapsed(true)}>
                  收起
                </button>
              </>
            )
          ) : timerMode === 'forward_stage' ? (
            <>
              <button className={`control-btn secondary ${timerStatus === 'running' ? 'is-dimmed' : ''}`} onClick={handleStopAndConfirm} style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                结束
              </button>
              <button className="control-btn secondary" onClick={toggleTimer}>
                {timerStatus === 'running' ? '暂停' : '继续'}
              </button>
              <button className={`control-btn primary ${timerStatus === 'running' ? 'is-dimmed' : ''}`} onClick={handleStopAndExit}>
                完成本阶段
              </button>
            </>
          ) : (
            <>
              {timerStatus !== 'idle' && (
                <button className={`control-btn secondary ${timerStatus === 'running' ? 'is-dimmed' : ''}`} onClick={handleStopAndExit}>
                  {timerMode === 'stopwatch' ? '结束' : '放弃'}
                </button>
              )}

              <button className="control-btn primary" onClick={toggleTimer}>
                {timerStatus === 'running' ? '暂停' : '开始'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
