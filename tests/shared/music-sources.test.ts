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
