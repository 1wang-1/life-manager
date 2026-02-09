import { describe, it, expect } from 'vitest';
import { classifySourceError } from '../../src/renderer/src/utils/musicSourceErrors';

describe('classifySourceError', () => {
  it('detects disabled sources', () => {
    expect(
      classifySourceError('当前版本音源已关闭，请前往 https://example.com 下载最新版本')
    ).toBe('source_disabled');
  });

  it('detects network errors', () => {
    expect(classifySourceError('Failed to fetch')).toBe('network');
  });

  it('falls back to runtime for unknown errors', () => {
    expect(classifySourceError('Some random error')).toBe('runtime');
  });
});
