import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('MusicPage recommended source', () => {
  it('does not use raw.gitmirror for the recommended source button', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes('raw.gitmirror.com')).toBe(false);
    expect(
      content.includes(
        'https://ghproxy.net/https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js'
      )
    ).toBe(true);
  });

  it('includes local file import button and auto-switch text', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes('选择本地音源脚本')).toBe(true);
    expect(content.includes('自动切换到可用源')).toBe(true);
  });

  it('wraps handleLoadSource to avoid event argument', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes('onClick={() => handleLoadSource()}')).toBe(true);
  });
});
