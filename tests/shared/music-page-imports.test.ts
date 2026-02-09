import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('MusicPage imports', () => {
  it('imports Track as a type-only import', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes('import type { Track }')).toBe(true);
    expect(content.includes('import { Track,')).toBe(false);
  });
});
