import { useMemo } from 'react';
import clsx from 'clsx';
import './TimerRing.css';

interface TimerRingProps {
  progress: number; // 0 to 1
  state: 'running' | 'paused' | 'finished' | 'idle';
  totalTicks?: number;
  variant?: 'ticks' | 'ring';
}

export function TimerRing({ progress, state, totalTicks = 60, variant = 'ticks' }: TimerRingProps) {
  // Ensure progress is between 0 and 1
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  
  // Radius and positioning (matching previous dimensions)
  const radius = 140;
  const center = 160; // 320 / 2
  const tickLength = 12;

  const activeTicks = state === 'finished'
    ? totalTicks
    : Math.floor(clampedProgress * totalTicks);

  const ticks = useMemo(() => {
    return Array.from({ length: totalTicks }).map((_, i) => {
      const angleDeg = (i * 360) / totalTicks - 90;
      const angleRad = (angleDeg * Math.PI) / 180;

      const x1 = center + (radius - tickLength) * Math.cos(angleRad);
      const y1 = center + (radius - tickLength) * Math.sin(angleRad);
      const x2 = center + radius * Math.cos(angleRad);
      const y2 = center + radius * Math.sin(angleRad);

      return { x1, y1, x2, y2, id: i };
    });
  }, [totalTicks, center, radius, tickLength]);

  // Ring Variant Logic
  if (variant === 'ring') {
    const circumference = 2 * Math.PI * radius;
    // Calculate offset: 
    // progress 0 -> offset = circumference (empty)
    // progress 1 -> offset = 0 (full)
    const strokeDashoffset = circumference * (1 - clampedProgress);

    return (
      <div className={clsx('timer-ring-wrapper', state, 'variant-ring')}>
        <svg className="timer-component-svg" viewBox="0 0 320 320">
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="timer-ring-circle-bg"
            fill="none"
            strokeWidth="6"
          />
          {/* Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="timer-ring-circle"
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
      </div>
    );
  }
  
  return (
    <div className={clsx('timer-ring-wrapper', state, 'variant-ticks')}>
      <svg className="timer-component-svg" viewBox="0 0 320 320">
        {ticks.map((tick, i) => {
            const isActive = i < activeTicks;
            return (
              <line
                key={tick.id}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className={clsx('timer-tick', { active: isActive })}
              />
            );
        })}
      </svg>
    </div>
  );
}
