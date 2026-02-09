import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import { TimerMode } from './useSettingsStore';

// Export as Enum to satisfy TasksPage usage (TaskStatus.NotStarted)
// and compatible with string values used in DB/Storage
export enum TaskStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed'
}

export enum Priority {
  Low = 'low',
  Normal = 'normal',
  High = 'high'
}

export type TaskItem = {
  id: string;
  title: string;
  theme?: string; // Theme/Category name
  status: TaskStatus;
  priority: Priority;
  selectedDates: string[];
  plannedTime?: string; // HH:mm
  expectedPomodoros?: number; // Estimated number of pomodoros
  totalTimeSpent?: number; // Seconds
  completedAt?: number; // timestamp
  order?: number; // For manual sorting
  focusPreference?: {
    mode: TimerMode;
    duration?: number; // minutes
  };
  completedCycles?: string[]; // For recurring tasks
};

export type FocusRecord = {
  id: string;
  taskId: string | null;
  startTime: number; // timestamp
  endTime: number; // timestamp
  duration: number; // seconds
  mode: TimerMode;
  completedAt: string; // ISO Date string for grouping
  rating?: number;
  note?: string;
};

interface TaskState {
  tasks: TaskItem[];
  focusRecords: FocusRecord[];
  selectedTaskId: string | null;

  setSelectedTask: (taskId: string | null) => void;
  
  fetchTasks: () => void;
  isTaskTitleTaken: (title: string, excludeTaskId?: string) => boolean;
  addTask: (task: Omit<TaskItem, 'id' | 'status' | 'totalTimeSpent'>) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  completeTaskFinal: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  reorderTask: (taskId: string, targetStatus: TaskStatus, newOrder: number) => void;
  toggleCycleCompletion: (taskId: string, date: string) => void;
  
  addFocusRecord: (record: FocusRecord) => void;
  updateFocusRecord: (recordId: string, updates: Partial<FocusRecord>) => void;
  getTaskById: (id: string) => TaskItem | undefined;
}

function normalizeTaskTitle(title: string) {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function cleanTaskTitle(title: string) {
  return title.trim().replace(/\s+/g, ' ');
}

const initialTasks: TaskItem[] = [
  {
    id: 't1',
    title: '界面布局优化',
    status: TaskStatus.InProgress,
    priority: Priority.High,
    selectedDates: [new Date().toISOString().split('T')[0]],
    totalTimeSpent: 1200
  },
  {
    id: 't2',
    title: '音乐入口设计',
    status: TaskStatus.NotStarted,
    priority: Priority.Normal,
    selectedDates: [new Date().toISOString().split('T')[0]]
  }
];

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: StorageService.get<TaskItem[]>('tasks', initialTasks),
  focusRecords: StorageService.get<FocusRecord[]>('focus_records', []),
  selectedTaskId: null,

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),

  fetchTasks: () => {
    // Re-read from storage or just sync
    const tasks = StorageService.get<TaskItem[]>('tasks', initialTasks);
    set({ tasks });
  },

  isTaskTitleTaken: (title, excludeTaskId) => {
    const normalized = normalizeTaskTitle(title);
    if (!normalized) return false;
    return get().tasks.some((t) => t.id !== excludeTaskId && normalizeTaskTitle(t.title) === normalized);
  },

  addTask: (taskInput) =>
    set((state) => {
      const cleanedTitle = cleanTaskTitle(taskInput.title);
      const normalizedTitle = normalizeTaskTitle(cleanedTitle);
      if (!normalizedTitle) return state;
      const exists = state.tasks.some((t) => normalizeTaskTitle(t.title) === normalizedTitle);
      if (exists) return state;

      const maxOrder = state.tasks.reduce((max, t) => (t.order && t.order > max ? t.order : max), 0);
      const newTask: TaskItem = {
        ...taskInput,
        title: cleanedTitle,
        id: crypto.randomUUID(),
        status: TaskStatus.NotStarted,
        totalTimeSpent: 0,
        order: maxOrder + 1000,
        completedCycles: []
      };
      const newTasks = [...state.tasks, newTask];
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  updateTask: (taskId, updates) =>
    set((state) => {
      if (typeof updates.title === 'string') {
        const cleanedTitle = cleanTaskTitle(updates.title);
        const normalizedTitle = normalizeTaskTitle(cleanedTitle);
        if (!normalizedTitle) return state;
        const exists = state.tasks.some((t) => t.id !== taskId && normalizeTaskTitle(t.title) === normalizedTitle);
        if (exists) return state;
        updates = { ...updates, title: cleanedTitle };
      }

      const newTasks = state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  deleteTask: (taskId) =>
    set((state) => {
      const newTasks = state.tasks.filter((t) => t.id !== taskId);
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  completeTask: (taskId) =>
    set((state) => {
      const today = new Date().toISOString().split('T')[0];
      const newTasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const cycles = new Set(t.completedCycles || []);
        cycles.add(today);
        return { 
          ...t, 
          status: TaskStatus.Completed, 
          completedAt: Date.now(),
          completedCycles: Array.from(cycles)
        };
      });
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  completeTaskFinal: (taskId) =>
    set((state) => {
      const today = new Date().toISOString().split('T')[0];
      const newTasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const cycles = new Set(t.completedCycles || []);
        cycles.add(today);
        const nextDates = (t.selectedDates || []).filter((d) => d <= today);
        return {
          ...t,
          status: TaskStatus.Completed,
          completedAt: Date.now(),
          completedCycles: Array.from(cycles),
          selectedDates: nextDates.length > 0 ? nextDates : [today]
        };
      });
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  updateTaskStatus: (taskId, status) =>
    set((state) => {
      const newTasks = state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedAt: status === TaskStatus.Completed ? Date.now() : undefined
            }
          : t
      );
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  reorderTask: (taskId, targetStatus, newOrder) =>
    set((state) => {
      const newTasks = state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: targetStatus,
              order: newOrder,
              completedAt: targetStatus === TaskStatus.Completed ? Date.now() : undefined
            }
          : t
      );
      StorageService.set('tasks', newTasks);
      return { tasks: newTasks };
    }),

  toggleCycleCompletion: (taskId, date) => 
    set((state) => {
        const newTasks = state.tasks.map(t => {
            if (t.id !== taskId) return t;
            const cycles = new Set(t.completedCycles || []);
            if (cycles.has(date)) {
                cycles.delete(date);
            } else {
                cycles.add(date);
            }
            return { ...t, completedCycles: Array.from(cycles) };
        });
        StorageService.set('tasks', newTasks);
        return { tasks: newTasks };
    }),

  addFocusRecord: (record) =>
    set((state) => {
      const newRecords = [...state.focusRecords, record];
      StorageService.set('focus_records', newRecords);
      
      // Update task total time if related
      if (record.taskId) {
        const task = state.tasks.find(t => t.id === record.taskId);
        if (task) {
           const updatedTasks = state.tasks.map(t => 
             t.id === record.taskId 
             ? { ...t, totalTimeSpent: (t.totalTimeSpent || 0) + record.duration }
             : t
           );
           StorageService.set('tasks', updatedTasks);
           return { focusRecords: newRecords, tasks: updatedTasks };
        }
      }
      
      return { focusRecords: newRecords };
    }),

  updateFocusRecord: (recordId, updates) =>
    set((state) => {
      const newRecords = state.focusRecords.map((r) =>
        r.id === recordId ? { ...r, ...updates } : r
      );
      StorageService.set('focus_records', newRecords);
      return { focusRecords: newRecords };
    }),

  getTaskById: (id) => get().tasks.find((t) => t.id === id)
}));
