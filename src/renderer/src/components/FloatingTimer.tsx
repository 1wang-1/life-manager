import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pause, Play, Square, Maximize2, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useTimerStore } from '../store/useTimerStore';
import { useTaskStore } from '../store/useTaskStore';
import { timerService } from '../services/TimerService';
import './FloatingTimer.css';

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FloatingTimer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, mode, remainingTime, elapsedTime, activeTaskId, sessionKind } = useTimerStore();
  const { getTaskById } = useTaskStore();
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 284, y: window.innerHeight - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (status === 'idle') setHidden(false);
  }, [status]);

  const effectiveMode = mode === 'pomodoro' ? 'countdown' : mode;
  const isCountdown = effectiveMode === 'countdown';
  const seconds = effectiveMode === 'stopwatch' || effectiveMode === 'forward_free' || effectiveMode === 'forward_stage' ? elapsedTime : remainingTime;
  
  const taskTitle = useMemo(() => {
    if (sessionKind === 'break') return '休息一下';
    if (!activeTaskId) return '未选择任务';
    const t = getTaskById(activeTaskId);
    return t?.title || '未选择任务';
  }, [activeTaskId, getTaskById, sessionKind]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    cardStartPos.current = { x: position.x, y: position.y };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    cardStartPos.current = { x: position.x, y: position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      
      setPosition({
        x: cardStartPos.current.x + deltaX,
        y: cardStartPos.current.y + deltaY
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;
      
      setPosition({
        x: cardStartPos.current.x + deltaX,
        y: cardStartPos.current.y + deltaY
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  if (status === 'idle') return null;
  if (location.pathname === '/') return null;
  if (hidden) return null;

  const handleToggle = () => {
    if (status === 'running') timerService.pauseTimer();
    else timerService.startTimer(activeTaskId, mode);
  };

  const handleStop = () => {
    timerService.requestStopTimer({ fromMini: true });
  };

  const handleSkipRest = () => {
    timerService.requestStopTimer({ fromMini: true });
  };

  const handleExtendRest = () => {
    timerService.extendBreak(5);
  };

  const handleExpand = () => {
    navigate('/');
  };

  const isResting = sessionKind === 'break';
  const isPaused = status === 'paused';
  const isRunning = status === 'running';

  let badgeText = '';
  if (isResting) {
    badgeText = '休息中';
  } else if (isPaused) {
    badgeText = '已暂停';
  } else {
    if (isCountdown) badgeText = '倒计时 · 专注中';
    else badgeText = '正向 · 专注中';
  }

  return (
    <div 
      className={clsx("floating-timer", { "paused": isPaused, "resting": isResting, "dragging": isDragging })}
      style={{ left: position.x, top: position.y, right: 'auto', bottom: 'auto' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Top Right: Expand to Main */}
      <button className="floating-expand-btn" onClick={handleExpand} title="展开回主界面">
        <Maximize2 size={16} />
      </button>

      {/* Info Area */}
      <div className="floating-info-area">
        <div className="floating-badge">{badgeText}</div>
        <div className="floating-time">{format(Math.max(0, seconds))}</div>
        <div className="floating-task" title={taskTitle}>
          {taskTitle}
        </div>
      </div>

      {/* Action Area */}
      <div className="floating-actions-area">
        {/* Left Button */}
        {isResting ? (
          <button className="floating-action-btn" onClick={handleSkipRest} title="跳过休息">
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button className="floating-action-btn" onClick={handleStop} title="结束">
            <Square size={20} fill="currentColor" />
          </button>
        )}

        {/* Right Button */}
        {isResting ? (
          <button className="floating-action-btn" onClick={handleExtendRest} title="延长 5 分钟">
            <Plus size={24} strokeWidth={2.5} />
          </button>
        ) : (
          <button className="floating-action-btn" onClick={handleToggle} title={isRunning ? '暂停' : '继续'}>
            {isRunning ? (
              <Pause size={24} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={24} fill="currentColor" strokeWidth={0} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
