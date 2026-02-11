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
  const [position, setPosition] = useState({ x: window.innerWidth - 280, y: window.innerHeight - 70 });
  const [size, setSize] = useState({ width: 280, height: 56 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 280, height: 56 });

  useEffect(() => {
    if (status === 'idle') setHidden(false);
  }, [status]);

  const effectiveMode = mode === 'pomodoro' ? 'countdown' : mode;
  // const isCountdown = effectiveMode === 'countdown';
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

  const isResting = sessionKind === 'break';

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { width: size.width, height: size.height };
  };

  const handleTouchResizeStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const touch = e.touches[0];
    resizeStartPos.current = { x: touch.clientX, y: touch.clientY };
    resizeStartSize.current = { width: size.width, height: size.height };
  };

  useEffect(() => {
     const handleMouseMove = (e: MouseEvent) => {
       if (isDragging) {
         e.preventDefault();
         const deltaX = e.clientX - dragStartPos.current.x;
         const deltaY = e.clientY - dragStartPos.current.y;
         
         // Use requestAnimationFrame for smoother drag
         requestAnimationFrame(() => {
           setPosition({
             x: cardStartPos.current.x + deltaX,
             y: cardStartPos.current.y + deltaY
           });
         });
       } else if (isResizing) {
         const deltaX = e.clientX - resizeStartPos.current.x;
         const deltaY = e.clientY - resizeStartPos.current.y;
         
         const newWidth = Math.max(160, Math.min(400, resizeStartSize.current.width + deltaX));
         const newHeight = Math.max(48, Math.min(120, resizeStartSize.current.height + deltaY));
         
         requestAnimationFrame(() => {
           setSize({ width: newWidth, height: newHeight });
         });
       }
     };

     const handleTouchMove = (e: TouchEvent) => {
       if (isDragging) {
         e.preventDefault();
         const touch = e.touches[0];
         const deltaX = touch.clientX - dragStartPos.current.x;
         const deltaY = touch.clientY - dragStartPos.current.y;
         
         requestAnimationFrame(() => {
           setPosition({
             x: cardStartPos.current.x + deltaX,
             y: cardStartPos.current.y + deltaY
           });
         });
       } else if (isResizing) {
         e.preventDefault();
         const touch = e.touches[0];
         const deltaX = touch.clientX - resizeStartPos.current.x;
         const deltaY = touch.clientY - dragStartPos.current.y;
         
         const newWidth = Math.max(160, Math.min(400, resizeStartSize.current.width + deltaX));
         const newHeight = Math.max(48, Math.min(120, resizeStartSize.current.height + deltaY));
         
         requestAnimationFrame(() => {
           setSize({ width: newWidth, height: newHeight });
         });
       }
     };

     const handleEnd = () => {
       setIsDragging(false);
       setIsResizing(false);
     };

     if (isDragging || isResizing) {
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
  }, [isDragging, isResizing]);

  // Early returns - must be after all hooks
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

  return (
     <div 
        className={clsx("floating-timer", { "paused": status === 'paused', "resting": isResting, "dragging": isDragging, "resizing": isResizing })}
       style={{ 
         left: position.x, 
         top: position.y, 
         right: 'auto', 
         bottom: 'auto',
         width: `${size.width}px`,
         height: `${size.height}px`
       }}
       onMouseDown={handleMouseDown}
       onTouchStart={handleTouchStart}
     >
      <div className="floating-left">
        {isResting ? (
          <button className="floating-action-btn" onClick={handleExtendRest} title="延长 5 分钟">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button className="floating-action-btn primary" onClick={handleToggle} title={status === 'running' ? '暂停' : '继续'}>
            {status === 'running' ? (
              <Pause size={16} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={16} fill="currentColor" strokeWidth={0} />
            )}
          </button>
        )}
      </div>

      <div className="floating-center">
        <div className="floating-time">{format(Math.max(0, seconds))}</div>
        <div className="floating-task" title={taskTitle}>
          {taskTitle}
        </div>
      </div>

      <div className="floating-right">
        {isResting ? (
           <button className="floating-action-btn danger" onClick={handleSkipRest} title="跳过休息">
             <Square size={14} fill="currentColor" />
           </button>
         ) : (
           <button className="floating-action-btn danger" onClick={handleStop} title="结束">
             <Square size={14} fill="currentColor" />
           </button>
         )}
        <button className="floating-action-btn" onClick={handleExpand} title="展开回主界面">
          <Maximize2 size={14} />
        </button>
        <div 
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleTouchResizeStart}
          title="调整大小"
        />
      </div>
    </div>
  );
}
