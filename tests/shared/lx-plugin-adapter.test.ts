import { describe, it, expect, vi } from 'vitest';

const createScript = () => `
(() => {
  const evt = lx.EVENT_NAMES.updateAlert;
  if (!evt) throw new Error('missing updateAlert');
})();
`;

describe('LxPluginAdapter', () => {
  it('loads scripts that expect EVENT_NAMES.updateAlert', async () => {
    const g = globalThis as typeof globalThis & {
      window?: typeof globalThis;
      fetch?: typeof fetch;
    };
    const originalWindow = g.window;
    const originalFetch = g.fetch;

    g.window = g;
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => createScript(),
    } as Response);

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');
    const result = await lxAdapter.loadScript('http://example.com/source.js');

    g.window = originalWindow;
    g.fetch = originalFetch;

    expect(result.success).toBe(true);
  });

  it('falls back from raw.gitmirror to ghproxy when fetch fails', async () => {
    const g = globalThis as typeof globalThis & {
      window?: typeof globalThis;
      fetch?: typeof fetch;
    };
    const originalWindow = g.window;
    const originalFetch = g.fetch;

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => createScript(),
      } as Response);

    g.window = g;
    g.fetch = fetchMock;

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');
    const result = await lxAdapter.loadScript(
      'https://raw.gitmirror.com/pdone/lx-music-source/main/sixyin/latest.js'
    );

    g.window = originalWindow;
    g.fetch = originalFetch;

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://ghproxy.net/https://raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js'
    );
  });

  it('loads script content without fetch', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis };
    const originalWindow = g.window;
    g.window = g;

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');

    const result = await lxAdapter.loadScriptContent(
      `(() => { lx.on('search', () => []); })();`,
      'local-test'
    );

    g.window = originalWindow;

    expect(result.success).toBe(true);
  });

  it('provides rawScript for scripts that expect it', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis; fetch?: typeof fetch };
    const originalWindow = g.window;
    const originalFetch = g.fetch;

    g.window = g;
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `(() => { lx.currentScriptInfo.rawScript.trim(); })();`,
    } as Response);

    vi.resetModules();
    const { lxAdapter } = await import('../../src/renderer/src/utils/LxPluginAdapter');
    const result = await lxAdapter.loadScript('http://example.com/source.js');

    g.window = originalWindow;
    g.fetch = originalFetch;

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

  it('returns parsed JSON body with raw body text', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis; fetch?: typeof fetch };
    const originalWindow = g.window;
    const originalFetch = g.fetch;

    g.window = g;
    g.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { entries: () => [] },
      text: async () => JSON.stringify({ ok: true }),
    } as Response);

    vi.resetModules();
    await import('../../src/renderer/src/utils/LxPluginAdapter');
    const win = g.window as typeof globalThis & {
      lx: {
        request: (url: string, options?: unknown, callback?: unknown) => Promise<{ body: unknown; bodyText: string; bodyJSON?: unknown }>;
      };
    };
    const result = await win.lx.request('http://example.com');

    g.window = originalWindow;
    g.fetch = originalFetch;

    expect(result.body).toEqual({ ok: true });
    expect(result.bodyText).toBe(JSON.stringify({ ok: true }));
    expect(result.bodyJSON).toEqual({ ok: true });
  });

  it('decodes hex-prefixed URLs before fetching', async () => {
    const g = globalThis as typeof globalThis & { window?: typeof globalThis; fetch?: typeof fetch };
    const originalWindow = g.window;
    const originalFetch = g.fetch;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { entries: () => [] },
      text: async () => 'ok',
    } as Response);

    g.window = g;
    g.fetch = fetchMock;

    vi.resetModules();
    await import('../../src/renderer/src/utils/LxPluginAdapter');

    const hexPrefix = '687474703a2f2f6578616d706c652e636f6d2f3f713d';
    const win = g.window as typeof globalThis & {
      lx: { request: (url: string, options?: unknown, callback?: unknown) => Promise<unknown> };
    };
    await win.lx.request(`${hexPrefix}test`);

    g.window = originalWindow;
    g.fetch = originalFetch;

    expect(fetchMock.mock.calls[0][0]).toBe('http://example.com/?q=test');
  });
});
