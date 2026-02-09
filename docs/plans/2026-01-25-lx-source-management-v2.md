# LX Source Management v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatic fallback to recommended LX sources plus local .js import with persistent storage and clear error handling.

**Architecture:** Introduce a small source-management utility for migration, storage, and fallback selection, extend `LxPluginAdapter` to load script content directly, and update `MusicPage` UI/logic to drive the new flow. Keep legacy `customSources` compatible by migrating to a new structured storage key.

**Tech Stack:** React + TypeScript, Zustand store, localStorage via `StorageService`, Vitest.

---

### Task 1: Add source error classification helper

**Files:**
- Create: `src/renderer/src/utils/musicSourceErrors.ts`
- Test: `tests/shared/music-source-errors.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { classifySourceError } from '../../src/renderer/src/utils/musicSourceErrors';

describe('classifySourceError', () => {
  it('detects disabled sources', () => {
    expect(classifySourceError('当前版本音源已关闭，请前往 https://example.com 下载最新版本')).toBe('source_disabled');
  });

  it('detects network errors', () => {
    expect(classifySourceError('Failed to fetch')).toBe('network');
  });

  it('falls back to runtime for unknown errors', () => {
    expect(classifySourceError('Some random error')).toBe('runtime');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- tests/shared/music-source-errors.test.ts`
Expected: FAIL (module not found / function missing)

**Step 3: Write minimal implementation**

```ts
export type SourceErrorCode = 'source_disabled' | 'network' | 'runtime';

export const classifySourceError = (message: string) => {
  const text = message || '';
  if (/音源已关闭|当前版本音源已关闭|不支持|请前往.*下载最新版本/.test(text)) return 'source_disabled';
  if (/Failed to fetch|NetworkError|ERR_CONNECTION|timeout/i.test(text)) return 'network';
  return 'runtime';
};
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- tests/shared/music-source-errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/shared/music-source-errors.test.ts src/renderer/src/utils/musicSourceErrors.ts
git commit -m "test: add source error classifier"
```

---

### Task 2: Add source storage/migration helpers

**Files:**
- Create: `src/renderer/src/utils/musicSources.ts`
- Test: `tests/shared/music-sources.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { migrateLegacySources, dedupeSources, SourceEntry } from '../../src/renderer/src/utils/musicSources';

describe('musicSources helpers', () => {
  it('migrates legacy URL list into source entries', () => {
    const legacy = ['https://a.example/source.js', 'https://a.example/source.js'];
    const migrated = migrateLegacySources(legacy);
    expect(migrated.length).toBe(1);
    expect(migrated[0].type).toBe('url');
    expect(migrated[0].value).toBe('https://a.example/source.js');
  });

  it('dedupes by type/value', () => {
    const entries: SourceEntry[] = [
      { id: '1', type: 'url', label: 'A', value: 'https://a', enabled: true, updatedAt: 1 },
      { id: '2', type: 'url', label: 'A2', value: 'https://a', enabled: true, updatedAt: 2 },
    ];
    const result = dedupeSources(entries);
    expect(result.length).toBe(1);
    expect(result[0].value).toBe('https://a');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- tests/shared/music-sources.test.ts`
Expected: FAIL (module not found / function missing)

**Step 3: Write minimal implementation**

```ts
export type SourceEntry = {
  id: string;
  type: 'url' | 'file';
  label: string;
  value: string;
  content?: string;
  enabled: boolean;
  updatedAt: number;
};

export const migrateLegacySources = (legacy: string[] | null): SourceEntry[] => {
  if (!legacy?.length) return [];
  return dedupeSources(legacy.map((url) => ({
    id: crypto.randomUUID(),
    type: 'url' as const,
    label: url,
    value: url,
    enabled: true,
    updatedAt: Date.now()
  })));
};

export const dedupeSources = (entries: SourceEntry[]) => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.type}:${entry.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- tests/shared/music-sources.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/shared/music-sources.test.ts src/renderer/src/utils/musicSources.ts
git commit -m "test: add source migration helpers"
```

---

### Task 3: Add script-content loading + error codes in LxPluginAdapter

**Files:**
- Modify: `src/renderer/src/utils/LxPluginAdapter.ts`
- Test: `tests/shared/lx-plugin-adapter.test.ts`
- Modify: `src/renderer/src/utils/musicSourceErrors.ts` (reuse code)

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';

describe('LxPluginAdapter loadScriptContent', () => {
  it('loads script content without fetch', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis };
    const originalWindow = g.window;
    g.window = g;

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');

    const result = await lxAdapter.loadScriptContent(`(() => { lx.on('search', () => []); })();`, 'local-test');
    g.window = originalWindow;

    expect(result.success).toBe(true);
  });

  it('returns source_disabled for closed sources', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis; fetch?: typeof fetch };
    const originalWindow = g.window;
    const originalFetch = g.fetch;
    g.window = g;
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `(() => { throw new Error('当前版本音源已关闭，请前往 http://example.com'); })();`,
    } as Response);

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');
    const result = await lxAdapter.loadScript('http://example.com/source.js');

    g.window = originalWindow;
    g.fetch = originalFetch;

    expect(result.success).toBe(false);
    expect(result.code).toBe('source_disabled');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- tests/shared/lx-plugin-adapter.test.ts`
Expected: FAIL (loadScriptContent missing / code missing)

**Step 3: Write minimal implementation**

```ts
import { classifySourceError, SourceErrorCode } from './musicSourceErrors';

async loadScriptContent(content: string, label?: string) {
  try {
    this.installErrorHooks();
    const scriptInfo = this.extractScriptInfo(content);
    this.context.currentScriptInfo = scriptInfo;
    const scriptFn = new Function(content);
    scriptFn();
    this.context.currentScript = label ? `local:${label}` : 'local:script';
    return { success: true as const };
  } catch (error: any) {
    const message = error?.message || String(error);
    return { success: false as const, error: message, code: classifySourceError(message) as SourceErrorCode };
  }
}
```

Also update `loadScript` return type to include `code` using `classifySourceError`.

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- tests/shared/lx-plugin-adapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/shared/lx-plugin-adapter.test.ts src/renderer/src/utils/LxPluginAdapter.ts src/renderer/src/utils/musicSourceErrors.ts
git commit -m "test: add loadScriptContent and error codes"
```

---

### Task 4: Update MusicPage to use sources v2 + local import + auto fallback

**Files:**
- Modify: `src/renderer/src/pages/MusicPage.tsx`
- Modify: `src/renderer/src/store/useMusicStore.ts` (optional: keep legacy list or migrate)
- Test: `tests/shared/music-page-source.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('MusicPage source management UI', () => {
  it('includes local file import button and auto-switch helper text', () => {
    const fileUrl = new URL('../../src/renderer/src/pages/MusicPage.tsx', import.meta.url);
    const content = fs.readFileSync(fileUrl, 'utf8');
    expect(content.includes('选择本地音源脚本')).toBe(true);
    expect(content.includes('自动切换到可用源')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- tests/shared/music-page-source.test.ts`
Expected: FAIL (strings missing)

**Step 3: Write minimal implementation**

Add in `MusicPage.tsx`:
- recommended sources array (with multiple URLs)
- local file input + button label `选择本地音源脚本`
- auto-switch button text `自动切换到可用源`
- storage/migration using `music_sources_v2` and `music_last_source_id`
- when load fails with `source_disabled` or `network`, iterate recommended sources and update storage/last source
- use `lxAdapter.loadScriptContent` for local file

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- tests/shared/music-page-source.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/shared/music-page-source.test.ts src/renderer/src/pages/MusicPage.tsx src/renderer/src/store/useMusicStore.ts
git commit -m "feat: add local source import and auto fallback"
```

---

### Task 5: Validate integration + clean up

**Files:**
- Modify: `tests/shared/music-page-alerts.test.ts` (if copy changes)
- Modify: `src/renderer/src/pages/MusicPage.tsx` (align alerts with tests)

**Step 1: Write the failing test**

Adjust alerts to match the new UX copy if needed. Example:

```ts
expect(content.includes('音源加载成功')).toBe(true);
expect(content.includes('音源加载失败')).toBe(true);
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- tests/shared/music-page-alerts.test.ts`
Expected: FAIL if copy mismatch

**Step 3: Write minimal implementation**

Update `MusicPage.tsx` alerts to match the new copy (or update tests to current copy).

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- tests/shared/music-page-alerts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/shared/music-page-alerts.test.ts src/renderer/src/pages/MusicPage.tsx
git commit -m "test: align music page alerts copy"
```

---

Plan complete and saved to `docs/plans/2026-01-25-lx-source-management-v2.md`. Two execution options:

1. Subagent-Driven (this session) — I dispatch a fresh subagent per task, review between tasks, fast iteration  
2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints

Which approach?
