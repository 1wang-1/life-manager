export type SourceEntry = {
  id: string;
  type: 'url' | 'file';
  label: string;
  value: string;
  content?: string;
  enabled: boolean;
  updatedAt: number;
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

export const migrateLegacySources = (legacy: string[] | null): SourceEntry[] => {
  if (!legacy?.length) return [];
  return dedupeSources(
    legacy.map((url) => ({
      id: crypto.randomUUID(),
      type: 'url' as const,
      label: url,
      value: url,
      enabled: true,
      updatedAt: Date.now(),
    }))
  );
};
