
import { useState, useMemo, useEffect, useRef, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import './CalendarPicker.css';

interface CalendarPickerProps {
  initialSelectedDates?: string[]; // ISO Strings YYYY-MM-DD
  onSelect: (dates: string[]) => void;
  className?: string;
  style?: CSSProperties;
}

export function CalendarPicker({ initialSelectedDates = [], onSelect, className, style }: CalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Use a Set for easy toggling
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set(initialSelectedDates));

  // Get today's date for highlighting and disabling past dates
  const today = useMemo(() => {
    const now = new Date();
    return {
      date: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear(),
      dateStr: now.toISOString().split('T')[0]
    };
  }, []);

  const lastEmittedRef = useRef(JSON.stringify([...initialSelectedDates].sort()));
  const onSelectRef = useRef(onSelect);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysArray: (number | null)[] = [];
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < startOffset; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const isSelected = (day: number) => {
    return selectedDates.has(getDateStr(day));
  };

  const isToday = (day: number) => {
    return day === today.date && month === today.month && year === today.year;
  };

  const isPastDate = (day: number) => {
    const dateObj = new Date(year, month, day);
    return dateObj < new Date(today.year, today.month, today.date);
  };

  const updateDateSelection = (day: number, mode: 'select' | 'deselect') => {
    const dateStr = getDateStr(day);
    
    setSelectedDates(prev => {
      const newSelected = new Set(prev);
      if (mode === 'select') {
        newSelected.add(dateStr);
      } else {
        newSelected.delete(dateStr);
      }
      
      // We need to call onSelect with the NEW value.
      // Since we are inside the updater, we can't easily call the prop.
      // This is why useEffect is often used.
      // But to avoid the loop, we can just assume onSelect is stable enough or use a ref.
      return newSelected;
    });
  };

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const sorted = Array.from(selectedDates).sort();
    const lastEmitted = JSON.stringify(sorted);
    if (lastEmittedRef.current !== lastEmitted) {
      lastEmittedRef.current = lastEmitted;
      onSelectRef.current(sorted);
    }
  }, [selectedDates]);

  const handleMouseDown = (e: React.MouseEvent, day: number) => {
    e.preventDefault(); // Prevent text selection
    const mode = isSelected(day) ? 'deselect' : 'select';
    setDragMode(mode);
    setIsDragging(true);
    updateDateSelection(day, mode);
  };

  const handleMouseEnter = (day: number) => {
    if (isDragging) {
      updateDateSelection(day, dragMode);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={clsx('calendar-picker', className)}
      style={style}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      <div className="calendar-header">
        <button type="button" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
        <span>{year}年 {month + 1}月</span>
        <button type="button" onClick={handleNextMonth}><ChevronRight size={16} /></button>
      </div>
      <div className="calendar-grid">
        <div className="weekday">一</div>
        <div className="weekday">二</div>
        <div className="weekday">三</div>
        <div className="weekday">四</div>
        <div className="weekday">五</div>
        <div className="weekday">六</div>
        <div className="weekday">日</div>
        {days.map((day, index) => (
          <div 
            key={index} 
            className={clsx('day-cell', {
              'empty': day === null,
              'selected': day !== null && isSelected(day),
              'today': day !== null && isToday(day),
              'past': day !== null && isPastDate(day),
            })}
            onMouseDown={(e) => day !== null && !isPastDate(day) && handleMouseDown(e, day)}
            onMouseEnter={() => day !== null && handleMouseEnter(day)}
          >
            {day}
            {day !== null && isToday(day) && <span className="today-indicator">今</span>}
            {day !== null && isSelected(day) && <Check size={10} className="check-icon" />}
          </div>
        ))}
      </div>
      <div className="calendar-footer">
        <span className="selected-count">已选 {selectedDates.size} 天</span>
        <button 
          className="btn-text small" 
          onClick={() => {
            setSelectedDates(new Set());
            onSelect([]);
          }}
        >
          清除
        </button>
      </div>
    </div>
  );
}
