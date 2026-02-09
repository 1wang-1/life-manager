import { describe, it, expect } from 'vitest';
import { createCategory } from '../../src/shared/models/category';
import { createTask } from '../../src/shared/models/task';

describe('category', () => {
  it('task can attach category', () => {
    const category = createCategory('Work', '#66CC99');
    const task = createTask('Prepare slides');
    task.categoryId = category.id;
    expect(task.categoryId).toBe(category.id);
  });
});
