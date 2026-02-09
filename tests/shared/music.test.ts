import { describe, it, expect } from 'vitest';
import { MusicSource, defaultMusicState } from '../../src/shared/models/music';

describe('music state', () => {
  it('defaults to no source', () => {
    expect(defaultMusicState().source).toBe(MusicSource.None);
  });
});
