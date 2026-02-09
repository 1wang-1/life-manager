import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, 
  endOfMonth, isWithinInterval, addYears, subYears, setMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import './StatsDatePicker.css';

interface StatsDatePickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  period: 'day' | 'week' | 'month';
}

export function StatsDatePicker({ selectedDate, onChange, onClose, period }: StatsDatePickerProps) {
  const [viewDate, setViewDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<'day' | 'month'>(period === 'month' ? 'month' : 'day');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync viewDate when selectedDate changes (optional, but good if prop updates externally)
  // But we mostly want to keep user's browsing position if they are browsing
  // So we only set it on mount or if period changes drastically
  
  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // If period changes to month, switch to month view
  useEffect(() => {
    if (period === 'month') setViewMode('month');
    else setViewMode('day');
  }, [period]);

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

  const handleToday = () => {
    const today = new Date();
    onChange(today);
    setViewDate(today);
    // Auto close only if selecting a specific date/month finishes the action
    // But 'Today' button usually just jumps. Let's keep it open or close? 
    // Usually jumping to today implies selection.
    onClose();
  };

  const handleDateClick = (date: Date) => {
    onChange(date);
    onClose();
  };

  const handleMonthClick = (monthIndex: number) => {
    const newDate = setMonth(viewDate, monthIndex);
    if (period === 'month') {
      onChange(newDate);
      onClose();
    } else {
      setViewDate(newDate);
      setViewMode('day');
    }
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewDate]);

  const isSelected = (date: Date) => {
    if (period === 'day') {
      return isSameDay(date, selectedDate);
    }
    if (period === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return isWithinInterval(date, { start, end });
    }
    return false;
  };

  const getWeekClasses = (date: Date) => {
    if (period !== 'week') return '';
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    if (isWithinInterval(date, { start, end })) {
      let classes = 'in-week';
      if (isSameDay(date, start)) classes += ' week-start';
      if (isSameDay(date, end)) classes += ' week-end';
      return classes;
    }
    return '';
  };

  return (
    <div className={clsx("stats-date-picker", { "mode-week": period === 'week' })} ref={containerRef}>
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
        <>
          <div className="picker-grid-days">
            {['一', '二', '三', '四', '五', '六', '日'].map(d => (
              <div key={d} className="picker-weekday">{d}</div>
            ))}
            {days.map((date, idx) => (
              <div
                key={idx}
                className={clsx(
                  'picker-day-cell',
                  {
                    'other-month': !isSameMonth(date, viewDate),
                    'today': isSameDay(date, new Date()),
                    'selected': isSelected(date)
                  },
                  getWeekClasses(date)
                )}
                onClick={() => handleDateClick(date)}
              >
                {date.getDate()}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="picker-grid-months">
          {Array.from({ length: 12 }).map((_, i) => {
            const currentMonthDate = setMonth(startOfMonth(viewDate), i);
            const isSelectedMonth = period === 'month' && isSameMonth(currentMonthDate, selectedDate);
            const isCurrentMonth = isSameMonth(currentMonthDate, new Date());
            
            return (
              <div
                key={i}
                className={clsx('picker-month-cell', {
                  'selected': isSelectedMonth,
                  'current': isCurrentMonth
                })}
                onClick={() => handleMonthClick(i)}
              >
                {i + 1}月
              </div>
            );
          })}
        </div>
      )}

      <div className="picker-footer">
        <button className="picker-btn-today" onClick={handleToday}>
          回到今天
        </button>
      </div>
    </div>
  );
}
