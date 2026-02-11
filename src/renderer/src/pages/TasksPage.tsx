import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, ListCheck, SlidersHorizontal, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useTaskStore, TaskItem, TaskStatus, Priority } from '../store/useTaskStore';
import { TaskCard } from '../components/common/TaskCard';
import { TaskForm } from '../components/common/TaskForm';
import { Confetti } from '../components/common/Confetti';
import { TaskDensityCalendar } from '../components/common/TaskDensityCalendar';
import { TaskDrawer } from '../components/common/TaskDrawer';
import { useTimerStore } from '../store/useTimerStore';
import { timerService } from '../services/TimerService';
import clsx from 'clsx';
import './TasksPage.css';

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const statusOrder: TaskStatus[] = [TaskStatus.NotStarted, TaskStatus.InProgress, TaskStatus.Completed];

const statusConfig: Record<TaskStatus, { label: string; desc: string; icon: React.ReactNode; colorVar: string }> = {
	[TaskStatus.NotStarted]: {
    label: '待办',
    desc: '准备开始',
    icon: <Circle size={16} />,
    colorVar: 'var(--color-text-secondary)'
  },
	[TaskStatus.InProgress]: {
    label: '进行中',
    desc: '保持专注',
    icon: <Clock size={16} />,
    colorVar: 'var(--color-info)'
  },
	[TaskStatus.Completed]: {
    label: '已完成',
    desc: '不错的工作',
    icon: <CheckCircle2 size={16} />,
    colorVar: 'var(--color-success)'
  }
};

export default function TasksPage() {
  const { tasks, addTask, updateTask, fetchTasks, completeTask, isTaskTitleTaken } = useTaskStore();
  const { activeTaskId, status: timerStatus } = useTimerStore();
  
  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  
  // Calendar & Drawer State
  const [showDensityCalendar, setShowDensityCalendar] = useState(false);
  const [drawerState, setDrawerState] = useState<{ isOpen: boolean; date: Date | null }>({ isOpen: false, date: null });
  
  // Filters
  const [filterPriority, setFilterPriority] = useState<Priority[]>([]);
	const [filterTodayOnly, setFilterTodayOnly] = useState(true);
	const [overdueExpanded, setOverdueExpanded] = useState(false);
	const [boardDragOverStatus, setBoardDragOverStatus] = useState<TaskStatus | null>(null);
  
  const prevTasksRef = useRef<TaskItem[]>(tasks);
  const filterRef = useRef<HTMLDivElement>(null);
	const completedColumnRef = useRef<HTMLDivElement>(null);

  // Initial Fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Click Outside for Filter
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    }

    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  // Confetti Logic
  useEffect(() => {
    const prevTasks = prevTasksRef.current;
    const completedNow = tasks.some(
      (task) =>
        task.status === TaskStatus.Completed &&
        prevTasks.find((prev) => prev.id === task.id && prev.status !== TaskStatus.Completed)
    );

    const isWindowLargeEnough = window.innerWidth > 400;

    prevTasksRef.current = tasks;

    if (completedNow && isWindowLargeEnough) {
      setShowConfetti(true);
      setConfettiKey(prev => prev + 1);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  // Data Filtering
	const tasksByStatus = useMemo(() => {
		const today = getTodayDate();

    // Initialize buckets
    const acc: Record<TaskStatus, TaskItem[]> = {
      [TaskStatus.NotStarted]: [],
      [TaskStatus.InProgress]: [],
      [TaskStatus.Completed]: []
    };

    tasks.forEach((task) => {
      // 1. Priority Filter (Common)
      const matchesPriority = filterPriority.length === 0 || filterPriority.includes(task.priority);
      if (!matchesPriority) return;

      if (filterTodayOnly) {
        // Daily View Logic
        const isScheduledForToday = task.selectedDates?.includes(today);
        if (!isScheduledForToday) return;

        const isCompletedToday = task.completedCycles?.includes(today);

        if (task.status === TaskStatus.Completed) {
          if (isCompletedToday) acc[TaskStatus.Completed].push(task);
        } else if (task.status === TaskStatus.InProgress) {
          if (!isCompletedToday) acc[TaskStatus.InProgress].push(task);
        } else {
          // NotStarted column includes tasks that are not completed today and not in progress
          // (Recycled tasks or fresh tasks)
          if (!isCompletedToday) {
            acc[TaskStatus.NotStarted].push(task);
          }
        }
      } else {
        // Normal View Logic
        if (acc[task.status]) {
          acc[task.status].push(task);
        }
      }
    });

    statusOrder.forEach((status) => {
      acc[status] = acc[status]
        .slice()
        .sort((a, b) => {
          if (status === TaskStatus.Completed) {
            const aDone = a.completedAt ?? 0;
            const bDone = b.completedAt ?? 0;
            if (aDone !== bDone) return bDone - aDone;
          }

          const ao = a.order ?? 0;
          const bo = b.order ?? 0;
          if (ao !== bo) return ao - bo;
          return a.title.localeCompare(b.title, 'zh-CN');
        });
    });

    return acc;
	}, [tasks, filterPriority, filterTodayOnly]);

  const buildSelectedDatesWithTodayFirst = (task: TaskItem, today: string) => {
    const base = task.selectedDates || [];
    const unique = Array.from(new Set([...base, today]));
    const rest = unique.filter((d) => d !== today).sort((a, b) => a.localeCompare(b));
    return [today, ...rest];
  };

  const buildSelectedDatesForOverdueMoveToToday = (task: TaskItem, today: string) => {
    const completed = new Set(task.completedCycles || []);
    const base = (task.selectedDates || []).filter((d) => d >= today || completed.has(d));
    const unique = Array.from(new Set([...base, today]));
    const rest = unique.filter((d) => d !== today).sort((a, b) => a.localeCompare(b));
    return [today, ...rest];
  };

  const overdueData = useMemo(() => {
    if (!filterTodayOnly) return { count: 0, items: [] as Array<{ task: TaskItem; earliestDate: string; daysOverdue: number }> };

    const today = getTodayDate();
    const todayMs = new Date(`${today}T00:00:00`).getTime();

    const matchesPriority = (task: TaskItem) =>
      filterPriority.length === 0 || filterPriority.includes(task.priority);

    const isVisibleInTodayBoard = (task: TaskItem) => matchesPriority(task) && (task.selectedDates || []).includes(today);

    const candidates = tasks
      .filter((task) => matchesPriority(task))
      .map((task) => {
        const completed = new Set(task.completedCycles || []);
        const overdueDates = (task.selectedDates || []).filter((d) => d < today && !completed.has(d));
        if (overdueDates.length === 0) return null;
        const earliest = overdueDates.reduce((min, d) => (d < min ? d : min), overdueDates[0]);
        const earliestMs = new Date(`${earliest}T00:00:00`).getTime();
        const days = Math.max(1, Math.floor((todayMs - earliestMs) / 86400000));
        return { task, earliestDate: earliest, daysOverdue: days, visibleInToday: isVisibleInTodayBoard(task) };
      })
      .filter((x): x is { task: TaskItem; earliestDate: string; daysOverdue: number; visibleInToday: boolean } => x !== null);

    const items = candidates
      .filter((x) => !x.visibleInToday)
      .map((x) => ({ task: x.task, earliestDate: x.earliestDate, daysOverdue: x.daysOverdue }))
      .sort((a, b) => {
        if (a.earliestDate !== b.earliestDate) return a.earliestDate.localeCompare(b.earliestDate);
        return a.task.title.localeCompare(b.task.title, 'zh-CN');
      });

    return { count: items.length, items };
  }, [filterPriority, filterTodayOnly, tasks]);

  const drawerTasks = useMemo(() => {
    if (!drawerState.date) return [];
    const dateStr = format(drawerState.date, 'yyyy-MM-dd');
    return tasks.filter(t => 
        t.status !== 'completed' &&
        t.selectedDates?.includes(dateStr)
    );
  }, [tasks, drawerState.date]);

  const handleDateClick = (date: Date) => {
    setDrawerState({ isOpen: true, date });
    setShowDensityCalendar(false);
  };

  const closeDrawer = () => setDrawerState(prev => ({ ...prev, isOpen: false }));

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
		setBoardDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

	const handleColumnDragOver = (e: React.DragEvent, status: TaskStatus) => {
		handleDragOver(e);
		if (boardDragOverStatus !== status) setBoardDragOverStatus(status);
	};

  const handleColumnDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setBoardDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const scrollToCompleted = () => {
        if (status !== TaskStatus.Completed) return;
        requestAnimationFrame(() => {
          completedColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        });
      };

      const applyDrop = () => {
        if (filterTodayOnly) {
          const today = getTodayDate();
          const task = tasks.find((t) => t.id === taskId);
          if (status === TaskStatus.Completed) {
            if (task) {
              updateTask(taskId, { selectedDates: buildSelectedDatesWithTodayFirst(task, today) });
            }
            completeTask(taskId);
				scrollToCompleted();
          } else {
            if (task) {
              const cycles = new Set(task.completedCycles || []);
              cycles.delete(today);
              updateTask(taskId, {
                status,
                selectedDates: buildSelectedDatesWithTodayFirst(task, today),
                completedCycles: Array.from(cycles),
                completedAt: undefined
              });
            }
          }
          return;
        }

        updateTask(taskId, { status });
			scrollToCompleted();
      };

      if (status === TaskStatus.Completed && activeTaskId === taskId && timerStatus !== 'idle') {
        timerService.requestStopTimer({ onStopped: applyDrop });
        return;
      }

      applyDrop();
    }
  };

	const handleColumnDrop = (e: React.DragEvent, status: TaskStatus) => {
		handleDrop(e, status);
		setBoardDragOverStatus(null);
	};

  const handleMoveOverdueToToday = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    const today = getTodayDate();
    updateTask(task.id, { selectedDates: buildSelectedDatesForOverdueMoveToToday(task, today) });
  };

  const handleSubmit = (taskData: Partial<TaskItem>) => {
    if (editingTask) {
      if (typeof taskData.title === 'string' && isTaskTitleTaken(taskData.title, editingTask.id)) {
        window.alert('任务名称已存在，请换一个名称');
        return;
      }
      updateTask(editingTask.id, taskData);
      setEditingTask(null);
      return;
    }

    if (typeof taskData.title === 'string' && isTaskTitleTaken(taskData.title)) {
      window.alert('任务名称已存在，请换一个名称');
      return;
    }

    addTask({
      title: taskData.title!,
      priority: taskData.priority || Priority.Normal,
      selectedDates: taskData.selectedDates && taskData.selectedDates.length > 0 ? taskData.selectedDates : [getTodayDate()],
      plannedTime: taskData.plannedTime
    });
    setIsCreating(false);
  };

  return (
    <div className="page-container tasks-page">
      {/* Header */}
      <header className="page-header tasks-header-row">
        <div className="header-content">
          <h1 className="page-title">任务看板</h1>
          <p className="page-subtitle">管理您的日常工作流</p>
        </div>
        
        <div className="page-header-actions header-actions">
          {/* Calendar Toggle */}
          <div className="filter-wrapper relative-container" style={{ marginRight: 8 }}>
            <button 
              className={clsx('btn-ghost', { active: showDensityCalendar })}
              onClick={() => setShowDensityCalendar(!showDensityCalendar)}
            >
              <CalendarIcon size={18} />
              <span className="btn-text">日历</span>
            </button>
            {showDensityCalendar && (
              <TaskDensityCalendar
                tasks={tasks}
                onDateClick={handleDateClick}
                onClose={() => setShowDensityCalendar(false)}
              />
            )}
          </div>

          {/* Filter/View Toggle */}
          <div className="filter-wrapper" ref={filterRef}>
            <button
              className={clsx('btn-ghost', { active: showFilter })}
              onClick={() => setShowFilter(!showFilter)}
            >
              <SlidersHorizontal size={18} />
              <span className="btn-text">筛选</span>
              {(filterPriority.length > 0 || !filterTodayOnly) && <span className="filter-badge">!</span>}
            </button>

            {showFilter && (
              <div className="filter-dropdown-menu">
                <div className="filter-group">
                  <label>时间范围</label>
                  <label className="filter-checkbox-item">
                    <input
                      type="checkbox"
                      checked={filterTodayOnly}
                      onChange={(e) => setFilterTodayOnly(e.target.checked)}
                    />
                    <span>仅显示今日任务</span>
                  </label>
                </div>
                
                <div className="filter-group">
                  <label>优先级</label>
                  <div className="filter-options">
                    {([Priority.High, Priority.Normal, Priority.Low] as const).map((p) => (
                      <label key={p} className="filter-checkbox-item">
                        <input
                          type="checkbox"
                          checked={filterPriority.includes(p)}
                          onChange={(e) => {
                            if (e.target.checked) setFilterPriority([...filterPriority, p]);
                            else setFilterPriority(filterPriority.filter((x) => x !== p));
                          }}
                        />
                        <span>{p === Priority.High ? '高' : p === Priority.Normal ? '中' : '低'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New Task Action */}
          <button 
            className="btn-new-task-primary"
            onClick={() => setIsCreating(true)}
          >
            <div className="btn-icon-wrapper">
              <Plus size={18} strokeWidth={3} />
            </div>
            新建任务
          </button>
        </div>
      </header>

      {/* Confetti & Modals */}
      {showConfetti && <Confetti key={confettiKey} duration={3000} />}

      {(isCreating || editingTask) && (
        <TaskForm
          key={editingTask ? editingTask.id : 'create'}
          initialData={editingTask || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsCreating(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Kanban Board */}
      <div className="tasks-container view-board">
        {statusOrder.map((status) => (
          (() => {
            const isNotStarted = status === TaskStatus.NotStarted;
				const showOverdue = filterTodayOnly && isNotStarted && overdueData.count > 0;
				const displayCount = showOverdue ? tasksByStatus[status].length + overdueData.items.length : tasksByStatus[status].length;
				const showEmpty = tasksByStatus[status].length === 0 && (!showOverdue || overdueData.items.length === 0);

            return (
          <div
            key={status}
				ref={status === TaskStatus.Completed ? completedColumnRef : undefined}
            className={clsx('kanban-column', { 'is-drop-target': boardDragOverStatus === status })}
				onDragOver={(event) => handleColumnDragOver(event, status)}
				onDragLeave={handleColumnDragLeave}
				onDrop={(event) => handleColumnDrop(event, status)}
          >
            <div className="kanban-column-header">
              <span className="status-indicator" style={{ backgroundColor: statusConfig[status].colorVar }} />
              <div>
                <h3 className="status-title">{statusConfig[status].label}</h3>
                <p className="status-subtitle">{statusConfig[status].desc}</p>
              </div>
              <span className="kanban-column-count">{displayCount}</span>
            </div>
            
            <div
					className="kanban-column-body custom-scrollbar"
					onDragOver={(event) => handleColumnDragOver(event, status)}
					onDragLeave={handleColumnDragLeave}
					onDrop={(event) => handleColumnDrop(event, status)}
				>
              {showOverdue && (
                <div className={clsx('overdue-group', { collapsed: !overdueExpanded })}>
                  <button className="overdue-header" type="button" onClick={() => setOverdueExpanded((v) => !v)}>
                    <div className="overdue-header-left">
                      <Clock size={14} />
							<span className="overdue-title">逾期（{overdueData.items.length}）</span>
                    </div>
                    {overdueExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
						{overdueExpanded && overdueData.items.length > 0 && (
                    <div className="overdue-list">
								{overdueData.items.map(({ task, earliestDate, daysOverdue }) => (
                        <div key={task.id} className="overdue-item">
                          <div className="overdue-meta-row">
                            <div className="overdue-meta">
                              <span>最早 {earliestDate}</span>
                              <span>逾期 {daysOverdue} 天</span>
                            </div>
                            <button className="overdue-move-btn" type="button" onClick={(e) => handleMoveOverdueToToday(e, task)}>
                              移到今天
                            </button>
                          </div>
                          <TaskCard
                            task={task}
                            onEdit={(t) => setEditingTask(t)}
                            onDragStart={handleDragStart}
                            variant="card"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showEmpty ? (
                <div
						className="kanban-column-empty"
						onDragOver={(event) => handleColumnDragOver(event, status)}
						onDrop={(event) => handleColumnDrop(event, status)}
					>
                  {status === TaskStatus.Completed ? (
                     <CheckCircle2 size={36} strokeWidth={1.5} />
                  ) : (
                     <ListCheck size={36} strokeWidth={1.5} />
                  )}
                  <p>{status === TaskStatus.Completed ? '还没有已完成的任务' : '暂无任务'}</p>
                  {status === TaskStatus.NotStarted && (
                    <button className="btn-new-task-orange" onClick={() => setIsCreating(true)} style={{ marginTop: '12px', padding: '0 16px', fontSize: '13px', height: '36px' }}>
                      新建任务
                    </button>
                  )}
                </div>
              ) : (
                tasksByStatus[status].map((task: TaskItem) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => setEditingTask(t)}
                    onDragStart={handleDragStart}
                    variant="card"
                  />
                ))
              )}
            </div>
          </div>
            );
          })()
        ))}
      </div>
      
      <TaskDrawer 
        isOpen={drawerState.isOpen}
        onClose={closeDrawer}
        title={drawerState.date ? `${format(drawerState.date, 'yyyy年M月d日')} 任务` : ''}
        tasks={drawerTasks}
      />
    </div>
  );
}
