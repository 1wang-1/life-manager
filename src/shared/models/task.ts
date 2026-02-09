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

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  categoryId?: string;
};

export function createTask(title: string): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    status: TaskStatus.NotStarted,
    priority: Priority.Normal,
    createdAt: now,
    updatedAt: now
  };
}
