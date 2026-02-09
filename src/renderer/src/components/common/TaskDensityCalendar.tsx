import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, startOfMonth, 
  endOfMonth, setMonth, addYears, subYears
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { TaskItem } from '../../store/useTaskStore';
import './StatsDatePicker.css'; // Reuse basic layout
import './TaskDensityCalendar.css'; // Add density specific styles

interface TaskDensityCalendarProps {
  tasks: TaskItem[];
  onDateClick: (date: Date) => void;
  onClose: () => void;
}

export function TaskDensityCalendar({ tasks, onDateClick, onClose }: TaskDensityCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handlePrev = () => {
    if (viewMode === 'day') {
      setViewDate(d => subMonths(d, 1));
    } else {
      setViewDate(d => subYears(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setViewDate(d => addMonths(d, 1));
    } else {
      setViewDate(d => addYears(d, 1));
    }
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  // Pre-calculate density map for current view
  const densityMap = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach(task => {
        if (task.status === 'completed' || !task.selectedDates) return;
        task.selectedDates.forEach(dateStr => {
            map.set(dateStr, (map.get(dateStr) || 0) + 1);
        });
    });
    return map;
  }, [tasks]);

  const getDensityLevel = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = densityMap.get(dateStr) || 0;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    return 3;
  };

  const handleMonthClick = (monthIndex: number) => {
    const newDate = setMonth(viewDate, monthIndex);
    setViewDate(newDate);
    setViewMode('day');
  };

  return (
    <div className="stats-date-picker task-density-calendar" ref={containerRef}>
      <div className="picker-header">
        <button className="picker-nav-btn" onClick={handlePrev}>
          <ChevronLeft size={16} />
        </button>
        <div 
          className="picker-title"
          onClick={() => setViewMode(viewMode === 'day' ? 'month' : 'day')}
        >
          {viewMode === 'day' 
            ? format(viewDate, 'yyyy年 M月') 
            : format(viewDate, 'yyyy年')
          }
        </div>
        <button className="picker-nav-btn" onClick={handleNext}>
          <ChevronRight size={16} />
        </button>
      </div>

      {viewMode === 'day' ? (
        <div className="picker-grid-days">
            {['一', '二', '三', '四', '五', '六', '日'].map(d => (
              <div key={d} className="picker-weekday">{d}</div>
            ))}
            {days.map((date, idx) => {
              const density = getDensityLevel(date);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={idx}
                  className={clsx(
                    'picker-day-cell',
                    {
                      'other-month': !isSameMonth(date, viewDate),
                      'is-today': isToday
                    }
                  )}
                  onClick={() => onDateClick(date)}
                >
                  {format(date, 'd')}
                  {density > 0 && (
                      <div className={clsx("density-indicator", `level-${density}`)}></div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="picker-grid-months">
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className={clsx("picker-month-cell", { selected: i === viewDate.getMonth() })}
              onClick={() => handleMonthClick(i)}
            >
              {i + 1}月
            </div>
          ))}
        </div>
      )}
      
      <div className="density-legend">
          <div className="legend-item"><span className="dot level-1"></span> 轻度</div>
          <div className="legend-item"><span className="dot level-2"></span> 中度</div>
          <div className="legend-item"><span className="dot level-3"></span> 繁忙</div>
      </div>
    </div>
  );
}
