import { describe, it, expect } from 'vitest';
import { createSchemaSql } from '../../src/main/data/db';

describe('db schema', () => {
  it('creates tasks table', () => {
    expect(createSchemaSql()).toContain('CREATE TABLE IF NOT EXISTS tasks');
  });
});
