
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Play, Pause, Square } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import './PetPage.css';

type PetTimerState = {
  status: 'idle' | 'running' | 'paused';
  mode: 'pomodoro' | 'stopwatch' | 'countdown' | 'forward_stage' | 'forward_free';
  remainingTime: number;
  elapsedTime: number;
  sessionKind?: 'focus' | 'break';
  pomodoroPhase?: 'work' | 'break';
};

export default function PetPage() {
  const countdownDefaultFocusMinutes = useSettingsStore((s) => s.settings.countdownDefaultFocusMinutes);
  const [state, setState] = useState<PetTimerState>({
    status: 'idle',
    mode: 'countdown',
    remainingTime: Math.max(1, countdownDefaultFocusMinutes) * 60,
    elapsedTime: 0,
    sessionKind: 'focus',
    pomodoroPhase: 'work'
  });
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!window.api?.timer?.onState) return;
    return window.api.timer.onState((s) => setState(s as PetTimerState));
  }, []);

  const effectiveMode = state.mode === 'pomodoro' ? 'countdown' : state.mode;
  const seconds = effectiveMode === 'stopwatch' || effectiveMode === 'forward_free' || effectiveMode === 'forward_stage'
    ? state.elapsedTime
    : state.remainingTime;

  // Format time for display
  const timeString = useMemo(() => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const secondsPart = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
  }, [seconds]);

  // Handle double click to open main window
  const handleDoubleClick = () => {
    window.api?.timer?.sendCommand({ type: 'showMain' });
  };

  // Toggle bubble on click
  const handleClick = () => {
    setShowBubble(!showBubble);
    if (!showBubble) {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = setTimeout(() => setShowBubble(false), 3000);
    }
  };

  // Auto-show bubble when timer ends
  useEffect(() => {
    if (effectiveMode === 'countdown' && state.remainingTime === 0 && state.status === 'idle') {
      setShowBubble(true);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = setTimeout(() => setShowBubble(false), 5000);
    }
  }, [effectiveMode, state.remainingTime, state.status]);

  // Determine pet mood/color based on timer status
  const getPetState = () => {
    if (state.status === 'running') return 'working';
    if (state.status === 'paused') return 'sleeping';
    return 'idle';
  };

  const petState = getPetState();

  return (
    <div className="pet-container">
      {/* Speech Bubble */}
      <div className={`pet-bubble ${showBubble ? 'visible' : ''}`}>
        {state.status === 'running' ? (
          <div className="bubble-content">
            <span className="timer-display">{timeString}</span>
            <span className="timer-label">计时中</span>
          </div>
        ) : state.status === 'paused' ? (
          <div className="bubble-content">
            <span>休息一下...</span>
            <span className="timer-display">{timeString}</span>
          </div>
        ) : (
          <div className="bubble-content">
            <span>你好呀！</span>
            <span className="sub-text">双击我打开主界面</span>
          </div>
        )}
      </div>

      {/* The Pet Character */}
      <div 
        className={`pet-body ${petState}`}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        <div className="pet-avatar">
          <Bot size={48} strokeWidth={1.5} />
          {/* Eyes animation could go here */}
          <div className="pet-eyes">
            <div className="eye left"></div>
            <div className="eye right"></div>
          </div>
        </div>
        
        {/* Status Indicator (Pulse) */}
        {state.status === 'running' && <div className="pet-pulse"></div>}
      </div>

      {/* Quick Actions (Show on Hover) */}
      <div className="pet-controls">
        <button
          className="pet-btn"
          onClick={(e) => {
            e.stopPropagation();
            window.api?.timer?.sendCommand({ type: 'toggle' });
          }}
        >
          {state.status === 'running' ? <Pause size={12} /> : <Play size={12} />}
        </button>
        
        {state.status !== 'idle' && (
          <button
            className="pet-btn stop"
            onClick={(e) => {
              e.stopPropagation();
              window.api?.timer?.sendCommand({ type: 'stop' });
            }}
          >
            <Square size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
