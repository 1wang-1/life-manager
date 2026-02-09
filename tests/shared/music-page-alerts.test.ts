import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('MusicPage load source alerts', () => {
  it('uses localized alert messages for source loading', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes('音源加载成功，现在可以在线搜索了。')).toBe(true);
    expect(content.includes('音源加载失败：')).toBe(true);
    expect(content.includes('请尝试镜像或检查网络。')).toBe(true);
    expect(content.includes('加载失败：')).toBe(true);
    expect(content.includes('本地音源加载成功，现在可以在线搜索了。')).toBe(true);
    expect(content.includes('本地音源加载失败：')).toBe(true);
  });
});
