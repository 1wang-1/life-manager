export type SourceErrorCode = 'source_disabled' | 'network' | 'runtime';

export const classifySourceError = (message: string): SourceErrorCode => {
  const text = message || '';
  if (/音源已关闭|当前版本音源已关闭|不支持|请前往.*下载最新版本/.test(text)) {
    return 'source_disabled';
  }
  if (/Failed to fetch|NetworkError|ERR_CONNECTION|timeout/i.test(text)) {
    return 'network';
  }
  return 'runtime';
};
