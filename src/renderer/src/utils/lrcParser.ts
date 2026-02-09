
export interface LyricLine {
  time: number; // Time in seconds
  text: string;
}

/**
 * Parses LRC content into structured lyric lines.
 * Handles:
 * - Standard [mm:ss.xx] or [mm:ss.xxx]
 * - Multiple timestamps [mm:ss][mm:ss]Text
 * - Metadata tags (ignored for now)
 * - Empty lines (filtered out)
 */
export function parseLrc(content: string): LyricLine[] {
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const result: LyricLine[] = [];
  
  // Regex to match timestamp: [00:00.00] or [00:00.000]
  // Capture groups: 1=mm, 2=ss, 3=.xx(x)
  const timeRegex = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // Get the text content after the last timestamp
    const lastMatch = matches[matches.length - 1];
    const textStartIndex = lastMatch.index! + lastMatch[0].length;
    const text = line.substring(textStartIndex).trim();

    if (!text) continue;

    // Create an entry for each timestamp
    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] ? match[3].substring(1) : '0'; // remove dot
      
      // Normalize ms: .5 -> 500ms, .05 -> 50ms, .005 -> 5ms
      // Usually lrc is .xx (hundredths) or .xxx (thousandths)
      // If 2 digits, it's hundredths (10ms). If 3, thousandths (1ms).
      let ms = parseInt(msStr, 10);
      if (msStr.length === 2) ms *= 10;
      else if (msStr.length === 1) ms *= 100;

      const timeInSeconds = minutes * 60 + seconds + ms / 1000;
      
      result.push({
        time: timeInSeconds,
        text: text
      });
    }
  }

  // Sort by time
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Binary search to find the active lyric index based on current time.
 */
export function getActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (lyrics.length === 0) return -1;
  if (currentTime < lyrics[0].time) return -1;

  // Find the last lyric that started before or at currentTime
  // Since array is sorted, we want the largest index i where lyrics[i].time <= currentTime
  
  let low = 0;
  let high = lyrics.length - 1;
  let idx = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= currentTime) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return idx;
}
