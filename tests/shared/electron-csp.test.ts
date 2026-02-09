import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('electron CSP header', () => {
  it('does not set an invalid wildcard directive', () => {
    const fileUrl = new URL('../../electron/main.ts', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');

    expect(content.includes("'Content-Security-Policy': ['*']")).toBe(false);
    expect(content.includes('default-src')).toBe(true);
  });
});
