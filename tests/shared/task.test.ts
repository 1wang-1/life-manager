import { describe, it, expect } from 'vitest';
import { createTask, TaskStatus, Priority } from '../../src/shared/models/task';

describe('task model', () => {
  it('defaults to not started with normal priority', () => {
    const task = createTask('Write plan');
    expect(task.status).toBe(TaskStatus.NotStarted);
    expect(task.priority).toBe(Priority.Normal);
  });
});
