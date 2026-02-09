import { describe, it, expect } from 'vitest';
import { buildLxSearchPlayUrl } from '../../src/renderer/src/utils/lxScheme';

describe('lx scheme url', () => {
  it('builds searchPlay url with name and singer', () => {
    const url = buildLxSearchPlayUrl({ name: '青花瓷', singer: '周杰伦' });
    expect(url).toBe(`lxmusic://music/searchPlay/${encodeURIComponent('青花瓷-周杰伦')}`);
  });

  it('builds searchPlay url with name only', () => {
    const url = buildLxSearchPlayUrl({ name: '夜曲' });
    expect(url).toBe(`lxmusic://music/searchPlay/${encodeURIComponent('夜曲')}`);
  });
});
