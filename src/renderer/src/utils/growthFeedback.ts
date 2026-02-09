import { FocusRecord } from '../store/useTaskStore';

export interface EngagementStats {
  count: number;
  durationMinutes: number;
}

/**
 * Calculate daily engagement stats from focus records.
 * @param records All focus records
 * @param dateStr Date string in 'YYYY-MM-DD' format
 */
export function getDailyEngagementStats(records: FocusRecord[], dateStr: string): EngagementStats {
  // Parse dateStr manually to avoid timezone issues with new Date(string)
  // We assume dateStr matches the user's local calendar day expectation
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { count: 0, durationMinutes: 0 };
  }

  const targetYear = parseInt(parts[0], 10);
  const targetMonth = parseInt(parts[1], 10) - 1; // 0-based
  const targetDay = parseInt(parts[2], 10);
  
  const dailyRecords = records.filter(r => {
    // Use startTime to determine the day of the activity
    const recordDate = new Date(r.startTime);
    return recordDate.getFullYear() === targetYear &&
           recordDate.getMonth() === targetMonth &&
           recordDate.getDate() === targetDay;
  });

  const count = dailyRecords.length;
  const totalSeconds = dailyRecords.reduce((sum, r) => sum + r.duration, 0);
  
  return {
    count,
    durationMinutes: Math.floor(totalSeconds / 60)
  };
}
