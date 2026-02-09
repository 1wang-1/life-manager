import { ipcMain } from 'electron'
import { getAllTasks, addTask, updateTask, deleteTask } from '../data/task-repo'
import { createTask, Task } from '../../shared/models/task'

export function registerTaskIpc(): void {
  ipcMain.handle('tasks:list', async () => {
    try {
      return getAllTasks()
    } catch (e) {
      console.error('Failed to list tasks:', e)
      return []
    }
  })

  ipcMain.handle('tasks:create', async (_event, payload: { title: string }) => {
    try {
      const task = createTask(payload.title)
      addTask(task)
      return task
    } catch (e) {
      console.error('Failed to create task:', e)
      throw e
    }
  })

  ipcMain.handle('tasks:update', async (_event, task: Task) => {
    try {
      updateTask(task)
      return task
    } catch (e) {
      console.error('Failed to update task:', e)
      throw e
    }
  })

  ipcMain.handle('tasks:delete', async (_event, id: string) => {
    try {
      deleteTask(id)
      return true
    } catch (e) {
      console.error('Failed to delete task:', e)
      throw e
    }
  })
}
