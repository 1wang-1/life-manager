import { useEffect, useRef, useState, useMemo } from 'react';
import { Priority, TaskItem } from '../../store/useTaskStore';
import { X, Calendar, Clock, Flag, Layout, Tag, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { CalendarPicker } from './CalendarPicker';
import './TaskForm.css';

interface TaskFormProps {
  initialData?: TaskItem;
  onSubmit: (task: Partial<TaskItem>) => void;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [theme, setTheme] = useState(initialData?.theme || '');
  const [priority, setPriority] = useState<TaskItem['priority']>(initialData?.priority || Priority.Normal);
  const [selectedDates, setSelectedDates] = useState<string[]>(initialData?.selectedDates || []);
  const [plannedTime, setPlannedTime] = useState(initialData?.plannedTime || '25');
  const [expectedPomodoros, setExpectedPomodoros] = useState<number>(initialData?.expectedPomodoros || 1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDetails, setShowDetails] = useState(true); // 默认展开更多选项
  const [isCustomTime, setIsCustomTime] = useState(false);

  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);
  const formBodyRef = useRef<HTMLDivElement | null>(null);
  const [calendarPlacement, setCalendarPlacement] = useState<'bottom' | 'top'>('bottom');
  const [calendarMaxHeight, setCalendarMaxHeight] = useState<number | undefined>(undefined);
  const [calendarPos, setCalendarPos] = useState<{ left: number; top?: number; bottom?: number }>(() => ({ left: 0 }));

  // Helper to display dates
  const dateDisplay = selectedDates.length > 0 
    ? `${selectedDates.length} 个日期已选`
    : '今天'; // 更明确的默认提示

  const handleDateSelect = (dates: string[]) => {
    setSelectedDates(dates);
  };

  const handleQuickTime = (count: number, minutes: number) => {
    setExpectedPomodoros(count);
    setPlannedTime(minutes.toString());
    setIsCustomTime(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // 确保有默认的预计时间，防止任务立即逾期
    const finalPlannedTime = plannedTime || '25'; // 默认25分钟
    const finalExpectedPomodoros = expectedPomodoros || 1; // 默认1个番茄钟

    onSubmit({
      title,
      theme,
      priority,
      selectedDates: selectedDates.length > 0 ? selectedDates : [new Date().toISOString().split('T')[0]],
      plannedTime: finalPlannedTime,
      expectedPomodoros: finalExpectedPomodoros
    });
  };

  // 使用 useMemo 优化日历位置计算，减少重复计算
  const calendarPosition = useMemo(() => {
    if (!showCalendar || !calendarTriggerRef.current) return null;
    
    const el = calendarTriggerRef.current;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const nextPlacement = spaceBelow < 360 && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const available = nextPlacement === 'bottom' ? spaceBelow - 16 : spaceAbove - 16;
    const nextMax = Math.max(240, Math.min(420, Math.floor(available)));
    const pickerWidth = 320;
    const nextLeft = Math.min(Math.max(12, rect.left), window.innerWidth - pickerWidth - 12);

    if (nextPlacement === 'bottom') {
      const nextTop = Math.min(rect.bottom + 8, window.innerHeight - 12 - nextMax);
      return {
        placement: nextPlacement,
        maxHeight: Number.isFinite(nextMax) ? nextMax : 420,
        left: nextLeft,
        top: Math.max(12, nextTop)
      };
    }
    const nextBottom = window.innerHeight - rect.top + 8;
    return {
      placement: nextPlacement,
      maxHeight: Number.isFinite(nextMax) ? nextMax : 420,
      left: nextLeft,
      bottom: Math.max(12, nextBottom)
    };
  }, [showCalendar]);

  // 分离位置设置逻辑，只在位置变化时更新状态
  useEffect(() => {
    if (!calendarPosition) return;
    
    setCalendarPlacement(calendarPosition.placement as 'bottom' | 'top');
    setCalendarMaxHeight(calendarPosition.maxHeight);
    setCalendarPos({
      left: calendarPosition.left,
      ...(calendarPosition.top !== undefined ? { top: calendarPosition.top } : null),
      ...(calendarPosition.bottom !== undefined ? { bottom: calendarPosition.bottom } : null)
    });
  }, [calendarPosition]);

  return (
    <div className="task-form-overlay">
      <div className="task-form-modal">
        <div className="modal-header">
          <h3>{initialData ? '编辑任务' : '新建任务'}</h3>
          <button onClick={onCancel} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form-content">
          <div className="form-body" ref={formBodyRef}>
            {/* 1. Title (Required & Prominent) */}
            <div className="form-section main-input">
              <div className="input-icon-wrapper">
                <Layout size={18} className="input-icon" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="准备做什么？"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="title-input"
              />
            </div>

            {/* Toggle Details */}
            <button 
              type="button" 
              className="details-toggle-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>{showDetails ? '收起选项' : '更多选项 (优先级、时间、标签...)'}</span>
            </button>

            {/* Collapsible Section */}
            <div className={clsx('details-section', { collapsed: !showDetails })}>
                
              {/* Row: Priority + Time */}
              <div className="form-row-split">
                {/* Priority */}
                <div className="form-group flex-1">
                  <label>优先级</label>
                  <div className="priority-select-group small">
                    {[Priority.Low, Priority.Normal, Priority.High].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={clsx('priority-option', p, { active: priority === p })}
                        onClick={() => setPriority(p)}
                      >
                        <Flag size={14} className={clsx('flag-icon', p)} />
                        <span>{p === Priority.Low ? '低' : p === Priority.Normal ? '中' : '高'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time / Focus */}
                <div className="form-group flex-1">
                  <label>预计时长</label>
                  <div className="quick-select-chips small">
                    <button 
                      type="button"
                      className={clsx('chip', { active: !isCustomTime && expectedPomodoros === 1 })}
                      onClick={() => handleQuickTime(1, 25)}
                      title="25 分钟"
                    >
                      25m
                    </button>
                    <button 
                      type="button"
                      className={clsx('chip', { active: !isCustomTime && expectedPomodoros === 2 })}
                      onClick={() => handleQuickTime(2, 50)}
                      title="50 分钟"
                    >
                      50m
                    </button>
                    <button 
                      type="button"
                      className={clsx('chip', { active: isCustomTime })}
                      onClick={() => setIsCustomTime(true)}
                    >
                      自定义
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Time Input (Conditional) */}
               {isCustomTime && (
                  <div className="form-group">
                     <div className="theme-input-container">
                       <Clock size={16} className="input-icon" style={{ color: 'var(--color-text-muted)' }} />
                       <input
                         type="number"
                         placeholder="输入分钟数"
                         value={plannedTime}
                         onChange={(e) => setPlannedTime(e.target.value)}
                         className="theme-input"
                         autoFocus
                       />
                       <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>分钟</span>
                     </div>
                  </div>
               )}

              {/* Date Picker */}
              <div className="form-group">
                <label>日期安排</label>
                <div className="date-picker-trigger-wrapper">
                  <button 
                    type="button" 
                    className={clsx('input-trigger', { active: showCalendar || selectedDates.length > 0 })}
                    onClick={() => setShowCalendar(!showCalendar)}
                    ref={calendarTriggerRef}
                  >
                    <Calendar size={16} />
                    <span>{dateDisplay}</span>
                  </button>
                  
                  {showCalendar && (
                    <>
                      <div className="calendar-backdrop-transparent" onClick={() => setShowCalendar(false)} />
                      <CalendarPicker 
                        initialSelectedDates={selectedDates}
                        onSelect={handleDateSelect} 
                        className={calendarPlacement === 'top' ? 'placement-top' : undefined}
                        style={{
                          ...(calendarMaxHeight ? { maxHeight: calendarMaxHeight } : null),
                          left: calendarPos.left,
                          ...(typeof calendarPos.top === 'number' ? { top: calendarPos.top } : null),
                          ...(typeof calendarPos.bottom === 'number' ? { bottom: calendarPos.bottom } : null)
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Tag/Category */}
              <div className="form-group">
                 <label>标签 / 分类</label>
                 <div className="theme-input-container">
                    <Tag size={16} className="input-icon" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      type="text"
                      placeholder="例如：工作、学习"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="theme-input"
                    />
                 </div>
              </div>

            </div>
          </div>

          <div className="form-footer">
            <div className="form-footer-divider"></div>
            <div className="form-actions">
              <button type="button" onClick={onCancel} className="btn btn-secondary">
                取消
              </button>
              <button type="submit" className="btn btn-submit">
                确认保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}