import { getDb } from './db'
import { Task, TaskStatus, Priority } from '../../shared/models/task'

export function getAllTasks(): Task[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
  return rows.map(mapRowToTask)
}

export function addTask(task: Task): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO tasks (id, title, status, priority, category_id, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @categoryId, @createdAt, @updatedAt)
  `).run({
    ...task,
    categoryId: task.categoryId || null
  })
}

export function updateTask(task: Task): void {
  const db = getDb()
  db.prepare(`
    UPDATE tasks 
    SET title = @title, status = @status, priority = @priority, 
        category_id = @categoryId, updated_at = @updatedAt
    WHERE id = @id
  `).run({
    ...task,
    categoryId: task.categoryId || null
  })
}

export function deleteTask(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

type TaskRow = {
  id: string
  title: string
  status: string
  priority: string
  category_id: string | null
  created_at: string
  updated_at: string
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status as TaskStatus,
    priority: row.priority as Priority,
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
