export type SourceStatus = 'idle' | 'loading' | 'success' | 'error';

export const MUSIC_LAST_SOURCE_KEY = 'music_last_source';

export type LoadResult = { success: boolean; error?: string };
export type AutoLoadResult = { status: SourceStatus | 'skipped'; message?: string };

export async function autoLoadLastSource(
  lastSource: string | null | undefined,
  loader: (url: string) => Promise<LoadResult>
): Promise<AutoLoadResult> {
  if (!lastSource) {
    return { status: 'skipped' };
  }

  const result = await loader(lastSource);
  if (result.success) {
    return { status: 'success' };
  }

  return { status: 'error', message: result.error || '未知错误' };
}

export function shouldShowSearchGuide(status: SourceStatus) {
  return status !== 'success';
}

