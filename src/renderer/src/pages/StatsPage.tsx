import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../store/useTaskStore';
import { useDiaryStore } from '../store/useDiaryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  TrendingUp, Calendar, Share2, Activity,
  Timer, CheckSquare, BookOpen, Target, Trophy, Zap, PenTool, Save, Sparkles, X,
  Smile, Meh, Frown, ThumbsUp, Gauge, ChevronLeft, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { adjustBrightness, hexToRgba, PRESET_COLORS, hexToRgb } from '../utils/theme';
import { StatsDatePicker } from '../components/common/StatsDatePicker';
import './StatsPage.css';

type ChartPeriod = 'day' | 'week' | 'month';
type ViewMode = 'dashboard' | 'calendar';

const generateTaskColors = () => {
  // TickTick inspired palette (Distinct, vibrant colors)
  const palette = [
    '#3D8BFF', // Blue
    '#FF4D4F', // Red
    '#FA8C16', // Orange
    '#52C41A', // Green
    '#722ED1', // Purple
    '#13C2C2', // Cyan
    '#EB2F96', // Magenta
    '#FADB14', // Yellow
    '#A0D911', // Lime
    '#FA541C', // Volcano
    '#2F54EB', // Geek Blue
    '#1890FF', // Daybreak Blue
  ];
  
  return palette.map(color => ({
    bg: hexToRgba(color, 0.12), // Light pastel background
    text: color, // Use the vibrant color for text
    bar: hexToRgba(color, 0.4), // Softer bar color for week view
    border: hexToRgba(color, 0.3)
  }));
};

const getTaskColor = (taskId: string, taskColors: Array<{ bg: string; text: string; border: string; bar: string }>) => {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return taskColors[Math.abs(hash) % taskColors.length];
};

type TaskColor = { bg: string; text: string; border: string; bar: string };

type TaskBreakdown = {
  id: string;
  title: string;
  duration: number;
  color: TaskColor;
};

type SelectedDayDetails = {
  date: Date;
  value: number;
  tasks: TaskBreakdown[];
};

type BarTooltipPayload = { value?: number };
type CustomBarTooltipProps = { active?: boolean; payload?: BarTooltipPayload[]; label?: string; themeColor?: string };

type PieTooltipPayload = { name: string; value: number; payload: { color?: string; colorText?: string } };
type CustomPieTooltipProps = { active?: boolean; payload?: PieTooltipPayload[] };

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
};

const hsla = (h: number, s: number, l: number, a: number) => {
  const hh = ((h % 360) + 360) % 360;
  return `hsla(${hh}, ${Math.max(0, Math.min(100, s))}%, ${Math.max(0, Math.min(100, l))}%, ${Math.max(0, Math.min(1, a))})`;
};

// Custom Tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload, label, themeColor }: CustomBarTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <div className="tooltip-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="tooltip-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: themeColor || '#1890ff' }}></span>
          <span className="tooltip-value">{payload[0].value} 分钟</span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }: CustomPieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-label" style={{ color: data.payload.colorText || data.payload.color }}>{data.name}</p>
        <div className="tooltip-item">
          <span className="tooltip-value">{data.value} 分钟</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function StatsPage() {
  const { tasks, focusRecords } = useTaskStore();
  const { entries, createEntry, updateEntry } = useDiaryStore();
  const { settings } = useSettingsStore();
  const theme = useMemo(() => {
    const rawColor = settings.themeColor || '#1890ff';
    const primary = PRESET_COLORS[rawColor] || rawColor;
    return {
      primary,
      primaryDark: adjustBrightness(primary, -20)
    };
  }, [settings.themeColor]);
  
  const piePalette = useMemo(() => {
    const rgb = hexToRgb(theme.primary);
    const baseHue = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b).h : 210;
    // Adjusted hues for better separation
    const hues = [baseHue, baseHue + 45, baseHue + 90, baseHue + 135, baseHue + 180, baseHue + 225, baseHue + 270, baseHue + 315];
    return hues.map((hh) => ({
      // Balanced palette: Moderate saturation (65%) and reduced lightness (60%)
      // Colorful enough to be happy, but not too bright/distracting
      fill: hsla(hh, 65, 60, 1),
      text: hsla(hh, 70, 20, 1)
    }));
  }, [theme.primary]);

  const taskColors = useMemo(() => generateTaskColors(), []);

  const [period, setPeriod] = useState<ChartPeriod>('day');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activePieIndex, setActivePieIndex] = useState<number>(-1);
  const [activeBarData, setActiveBarData] = useState<{ name: string; value: number } | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<SelectedDayDetails | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Review Logic
  const reviewContext = useMemo(() => {
    let targetDate = currentDate;
    let defaultTitle = '每日成长';
    let label = '今日成长';
    let placeholder = '今天过得怎么样？写下你的成长、感悟或明天的计划...';

    if (period === 'week') {
      const day = currentDate.getDay() || 7;
      const end = new Date(currentDate);
      end.setDate(currentDate.getDate() - day + 7);
      targetDate = end;
      defaultTitle = '本周成长';
      label = '本周成长';
      placeholder = '回顾本周，有哪些值得记录的成长或需要改进的地方？';
    } else if (period === 'month') {
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      targetDate = end;
      defaultTitle = '本月成长';
      label = '本月成长';
      placeholder = '这个月过得如何？写下你的月度成长和下月展望...';
    }

    return {
      targetDateIso: format(targetDate, 'yyyy-MM-dd'),
      defaultTitle,
      label,
      placeholder
    };
  }, [currentDate, period]);

  const activeReview = useMemo(() => {
    return entries.find(e => 
      e.date === reviewContext.targetDateIso && 
      (e.type === 'review' || (period !== 'day' && (e.title?.includes('复盘') || e.title?.includes('成长'))))
    );
  }, [entries, reviewContext, period]);

  const [reviewContent, setReviewContent] = useState('');
  const [reviewTitle, setReviewTitle] = useState('每日成长');
  const [mood, setMood] = useState<string>('neutral');
  const [isSavingReview, setIsSavingReview] = useState(false);

  useEffect(() => {
    if (activeReview) {
      setReviewContent(activeReview.content);
      setReviewTitle(activeReview.title || '');
      setMood(activeReview.mood || 'neutral');
    } else {
      setReviewContent('');
      setReviewTitle(reviewContext.defaultTitle);
      setMood('neutral');
    }
  }, [activeReview, reviewContext]);

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    
    if (activeReview) {
      await updateEntry(activeReview.id, { 
        title: reviewTitle,
        content: reviewContent,
        mood
      });
    } else {
      createEntry({
        date: reviewContext.targetDateIso,
        type: 'review',
        title: reviewTitle || reviewContext.defaultTitle,
        content: reviewContent,
        mood
      });
    }
    setTimeout(() => setIsSavingReview(false), 500);
  };
  
  const dateDisplay = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const d = currentDate.getDate();

    if (period === 'day') return y + '年' + m + '月' + d + '日';
    if (period === 'week') {
      const day = currentDate.getDay() || 7;
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - day + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const firstDayOfYear = new Date(start.getFullYear(), 0, 1);
      const pastDays = (start.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);

      return `${start.getFullYear()}年 第${weekNum}周 (${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()})`;
    }
    return y + '年' + m + '月';
  }, [currentDate, period]);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (period === 'day') newDate.setDate(newDate.getDate() - 1);
    if (period === 'week') newDate.setDate(newDate.getDate() - 7);
    if (period === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (period === 'day') newDate.setDate(newDate.getDate() + 1);
    if (period === 'week') newDate.setDate(newDate.getDate() + 7);
    if (period === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const isInPeriod = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    if (period === 'day') {
      const target = new Date(currentDate);
      return date.getDate() === target.getDate() && 
             date.getMonth() === target.getMonth() && 
             date.getFullYear() === target.getFullYear();
    }
    if (period === 'week') {
      const day = currentDate.getDay() || 7;
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - day + 1);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return timestamp >= start.getTime() && timestamp < end.getTime();
    }
    if (period === 'month') {
      return date.getMonth() === currentDate.getMonth() && 
             date.getFullYear() === currentDate.getFullYear();
    }
    return false;
  }, [period, currentDate]);

  const chartData = useMemo(() => {
    const data: { name: string; value: number; startDate: Date; endDate: Date }[] = [];

    if (period === 'day') {
      for (let i = 0; i < 24; i++) {
        const start = new Date(currentDate);
        start.setHours(i, 0, 0, 0);
        const end = new Date(start);
        end.setHours(i + 1, 0, 0, 0);
        data.push({ name: `${i}时`, value: 0, startDate: start, endDate: end });
      }
      focusRecords.forEach(r => {
        if (isInPeriod(r.startTime)) {
          const hour = new Date(r.startTime).getHours();
          data[Math.min(hour, data.length - 1)].value += r.duration;
        }
      });
    } else if (period === 'week') {
      const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const day = currentDate.getDay() || 7;
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - day + 1);
      startOfWeek.setHours(0,0,0,0);

      weekDays.forEach((dayName, idx) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + idx);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        data.push({ name: dayName, value: 0, startDate: d, endDate: end });
      });
      
      focusRecords.forEach(r => {
        if (isInPeriod(r.startTime)) {
          const dayIndex = (new Date(r.startTime).getDay() + 6) % 7;
          data[dayIndex].value += r.duration;
        }
      });
    } else if (period === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const end = new Date(year, month, i, 23, 59, 59, 999);
        data.push({ name: `${i}日`, value: 0, startDate: d, endDate: end });
      }
      focusRecords.forEach(r => {
        if (isInPeriod(r.startTime)) {
          const day = new Date(r.startTime).getDate();
          data[Math.max(0, Math.min(day - 1, data.length - 1))].value += r.duration;
        }
      });
    }

    return data.map(d => ({ ...d, value: Math.round(d.value / 60) }));
  }, [period, currentDate, focusRecords, isInPeriod]);

  const pieData = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    focusRecords.forEach(r => {
      if (isInPeriod(r.startTime)) {
        const key = r.taskId || 'unknown';
        distribution[key] = (distribution[key] || 0) + r.duration;
      }
    });

    const result = Object.entries(distribution)
      .map(([taskId, duration]) => {
        if (taskId === 'unknown') {
          // Use the first color from the palette for "Free Focus" to make it consistent with the theme
          const palette = piePalette[0];
          return {
            id: taskId,
            name: '自由专注',
            value: Math.round(duration / 60),
            color: palette.fill,
            colorText: palette.text
          };
        }
        const task = tasks.find(t => t.id === taskId);
        // Use hash to distribute colors, but skip index 0 if possible to avoid conflict with Free Focus (optional, but collision is fine)
        const palette = piePalette[(hashString(taskId) + 1) % piePalette.length];
        return {
          id: taskId,
          name: task ? task.title : '已删除任务',
          value: Math.round(duration / 60),
          color: palette.fill,
          colorText: palette.text
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    if (result.length > 5) {
      const top5 = result.slice(0, 5);
      const otherValue = result.slice(5).reduce((acc, curr) => acc + curr.value, 0);
      if (otherValue > 0) {
        // "Other" uses a very light, desaturated version of the theme color instead of gray
        const palette = piePalette[piePalette.length - 1]; 
        // Use a custom very light color derived from the palette's last color or just a soft neutral
        // Let's manually create a soft "sand" or "cloud" color based on the theme hue if possible, 
        // but since we don't have the hue here easily without recalculating, let's use the last palette color but lighter.
        // Or simply use a nice hardcoded "soft color" that isn't gray.
        // Let's use the last color in our generated palette which is usually distinct.
        top5.push({ 
          id: 'other', 
          name: '其他', 
          value: otherValue, 
          color: palette.fill, // Use the last color for "Other"
          colorText: palette.text 
        });
      }
      return top5;
    }

    return result;
  }, [focusRecords, tasks, isInPeriod, piePalette]);

  const gridData = useMemo(() => {
    if (viewMode === 'dashboard' && period === 'day') return null;

    const cells: { day: number | string | null; fullDate?: Date; value: number; intensity: number; tasks: TaskBreakdown[]; hasReview: boolean; mood?: string }[] = [];
    let maxMinutes = 0;

    const processDate = (date: Date) => {
      const dayValue = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      const dateIso = format(date, 'yyyy-MM-dd');

      let totalDuration = 0;
      const tasksMap: Record<string, number> = {};

      focusRecords.forEach(r => {
        const d = new Date(r.startTime);
        if (d.getDate() === dayValue && d.getMonth() === month && d.getFullYear() === year) {
          totalDuration += r.duration;
          const taskId = r.taskId || 'unknown';
          tasksMap[taskId] = (tasksMap[taskId] || 0) + r.duration;
        }
      });

      const value = Math.round(totalDuration / 60);
      if (value > maxMinutes) maxMinutes = value;

      let intensity = 0;
      if (value > 0) {
        if (value > 120) intensity = 4;
        else if (value > 60) intensity = 3;
        else if (value > 30) intensity = 2;
        else intensity = 1;
      }

      const taskList = Object.entries(tasksMap).map(([tid, dur]) => {
        const task = tasks.find(t => t.id === tid);
        const title = task ? task.title : (tid === 'unknown' ? '自由专注' : '已删除任务');
        return {
          id: tid,
          title,
          duration: Math.round(dur / 60),
          color: getTaskColor(tid, taskColors)
        };
      })
      .filter(t => t.duration > 0)
      .sort((a, b) => b.duration - a.duration);

      const reviewEntry = entries.find(e => e.date === dateIso && (e.type === 'review' || (e.title && (e.title.includes('复盘') || e.title.includes('成长')))));
      const hasReview = !!reviewEntry;
      const mood = reviewEntry?.mood;

      return { day: dayValue, fullDate: date, value, intensity, tasks: taskList, hasReview, mood };
    };

    if (period === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      for (let i = 0; i < startOffset; i++) {
        cells.push({ day: null, value: 0, intensity: 0, tasks: [], hasReview: false });
      }

      for (let i = 1; i <= daysInMonth; i++) {
        cells.push(processDate(new Date(year, month, i)));
      }
    } else if (period === 'week') {
      const day = currentDate.getDay() || 7;
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - day + 1);

      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cells.push(processDate(d));
      }
    } else if (period === 'day') {
      cells.push(processDate(new Date(currentDate)));
    }

    return { cells, maxMinutes };
  }, [period, currentDate, focusRecords, viewMode, tasks, entries, taskColors]);

  const dayTimelineData = useMemo(() => {
    if (period !== 'day') return [];

    const timelineItems: {
      id: string;
      type: 'focus' | 'task' | 'diary';
      time: string;
      timestamp: number;
      title: string;
      subtitle?: string;
      icon?: React.ReactNode;
      color?: string;
    }[] = [];

    const targetDateStr = currentDate.toDateString();
    const targetDateIso = currentDate.toISOString().split('T')[0];

    focusRecords.forEach(r => {
      const d = new Date(r.startTime);
      if (d.toDateString() === targetDateStr) {
        const task = tasks.find(t => t.id === r.taskId);
        timelineItems.push({
          id: r.id,
          type: 'focus',
          time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'),
          timestamp: r.startTime,
          title: task ? `专注 ${task.title}` : (r.taskId ? '专注（已删除任务）' : '自由专注'),
          subtitle: `${Math.round(r.duration / 60)}m`,
          icon: <Timer size={16} className="text-amber-500" strokeWidth={2.5} style={{ color: theme.primary }} />,
          color: theme.primary
        });
      }
    });

    tasks.forEach(t => {
      let isCompletedToday = false;
      let timestamp = 0;

      if (t.completedAt) {
        const completedDate = new Date(t.completedAt);
        if (completedDate.toDateString() === targetDateStr) {
          isCompletedToday = true;
          timestamp = t.completedAt;
        }
      }

      if (!isCompletedToday && t.completedCycles && t.completedCycles.includes(targetDateIso)) {
        isCompletedToday = true;
        timestamp = new Date(targetDateIso).setHours(12, 0, 0, 0); 
      }

      if (isCompletedToday) {
         const d = new Date(timestamp);
         timelineItems.push({
          id: t.id,
          type: 'task',
          time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'),
          timestamp: timestamp,
          title: `完成 ${t.title}`,
          subtitle: t.totalTimeSpent ? `累计投入 ${Math.round(t.totalTimeSpent / 60)}m` : undefined,
          icon: <CheckSquare size={16} className="text-emerald-500" strokeWidth={2.5} style={{ color: '#52c41a' }} />,
          color: '#52c41a'
        });
      }
    });

    entries.forEach(e => {
      if (e.date === targetDateIso) {
         const d = new Date(e.createdAt);
         timelineItems.push({
          id: e.id,
          type: 'diary',
          time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'),
          timestamp: e.createdAt,
          title: e.title || (e.type === 'review' ? '成长记录' : e.type === 'learning' ? '学习总结' : '随心记'),
          subtitle: e.content.slice(0, 30) + (e.content.length > 30 ? '...' : ''),
          icon: <BookOpen size={16} className="text-blue-500" strokeWidth={2.5} style={{ color: theme.primary }} />,
          color: theme.primary
        });
      }
    });

    return timelineItems.sort((a, b) => b.timestamp - a.timestamp);
  }, [period, currentDate, focusRecords, tasks, entries, theme.primary]);

  const periodSummary = useMemo(() => {
    const recordsInPeriod = focusRecords.filter(r => isInPeriod(r.startTime));
    const focusCount = recordsInPeriod.length;
    
    const totalMinutes = Math.round(recordsInPeriod.reduce((acc, r) => acc + r.duration, 0) / 60);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const avgDuration = focusCount > 0 ? Math.round(totalMinutes / focusCount) : 0;
    
    const mostFocused = pieData.length > 0 ? pieData[0] : null;

    return { totalMinutes, totalHours, focusCount, avgDuration, mostFocused };
  }, [focusRecords, isInPeriod, pieData]);

  const ruleBasedSummary = useMemo(() => {
    const { totalMinutes, totalHours, focusCount, avgDuration, mostFocused } = periodSummary;

    if (totalMinutes === 0) {
      return '暂无专注数据。随时开始一次专注（可不选任务）来记录你的进步吧！';
    }

    const timeScope = period === 'day' ? '今天' : period === 'week' ? '本周' : '本月';
    
    let summary = `【${timeScope}成长】\n\n`;
    summary += `⏱️ 专注时长：${totalMinutes}分钟 (${totalHours}小时)\n`;
    summary += `🎯 专注次数：${focusCount}次 (平均 ${avgDuration}分钟/次)\n`;

    if (mostFocused) {
      const percentage = totalMinutes > 0 ? Math.round((mostFocused.value / totalMinutes) * 100) : 0;
      summary += `🏆 核心任务：${mostFocused.name} (${mostFocused.value}分钟，占比 ${percentage}%)\n`;
    }

    summary += `\n💡 洞察：`;
    
    if (period === 'day') {
      if (totalMinutes > 300) summary += '今天全情投入，效率惊人！注意适当休息，保持可持续的节奏。';
      else if (totalMinutes > 180) summary += '今天表现不错，完成了大量专注工作，继续保持！';
      else if (totalMinutes > 60) summary += '稳定的专注节奏，积跬步以至千里。';
      else summary += '万事开头难，哪怕只专注几分钟也是进步的开始。';
    } else {
      if (totalMinutes > 1200) summary += '这段时间你非常自律，可以说是高效能人士了！';
      else if (totalMinutes > 600) summary += '这段时间投入度良好，保持这种节奏。';
      else summary += '继续加油，尝试在下个周期增加一点专注时间。';
    }

    return summary;
  }, [periodSummary, period]);


  return (
    <div className="page-container stats-page">
      <header className="page-header stats-header">
        <div className="header-content">
          <h1 className="page-title">数据复盘</h1>
          <p className="page-subtitle">回顾过去，优化未来 · {dateDisplay}</p>
        </div>
      </header>

      <div className="stats-content">
        {/* Control Bar */}
        <div className="stats-control-bar">
          <div className="view-toggles">
            <button 
              className={clsx('view-toggle-btn', { active: viewMode === 'dashboard' })}
              onClick={() => setViewMode('dashboard')}
              title="仪表盘"
            >
              <Gauge size={20} strokeWidth={1.5} />
              <span>仪表盘</span>
            </button>
            <button 
              className={clsx('view-toggle-btn', { active: viewMode === 'calendar' })}
              onClick={() => setViewMode('calendar')}
              title="日历"
            >
              <Calendar size={20} strokeWidth={1.5} />
              <span>日历</span>
            </button>
          </div>

          <div className="period-tabs">
            <button 
              className={clsx('period-tab', { active: period === 'day' })}
              onClick={() => setPeriod('day')}
            >日</button>
            <button 
              className={clsx('period-tab', { active: period === 'week' })}
              onClick={() => setPeriod('week')}
            >周</button>
            <button 
              className={clsx('period-tab', { active: period === 'month' })}
              onClick={() => setPeriod('month')}
            >月</button>
          </div>

          <div className="date-navigator">
            <button className="nav-btn" onClick={handlePrev}><ChevronLeft size={16} /></button>
            <span 
              className="date-display clickable" 
              title={dateDisplay}
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              {dateDisplay}
            </span>
            <button className="nav-btn" onClick={handleNext}><ChevronRight size={16} /></button>
            
            {isDatePickerOpen && (
              <StatsDatePicker 
                selectedDate={currentDate}
                onChange={setCurrentDate}
                onClose={() => setIsDatePickerOpen(false)}
                period={period}
              />
            )}
          </div>
        </div>

        {viewMode === 'dashboard' ? (
          <div className="stats-dashboard-grid">
            <div className="stats-kpis">
              <div className="kpi-card">
                <div className="kpi-icon-wrapper color-blue">
                  <Timer size={26} strokeWidth={2} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">专注时长</span>
                  <span className="kpi-value">{periodSummary.totalMinutes}<small>分钟</small></span>
                  <span className="kpi-sub">累计 {periodSummary.totalHours} 小时</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrapper color-green">
                  <Target size={26} strokeWidth={2} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">专注次数</span>
                  <span className="kpi-value">{periodSummary.focusCount}<small>次</small></span>
                  <span className="kpi-sub">平均 {periodSummary.avgDuration} 分钟/次</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrapper color-purple">
                  <Trophy size={26} strokeWidth={2} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">核心任务</span>
                  <span className="kpi-value" title={periodSummary.mostFocused?.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', display: 'block' }}>{periodSummary.mostFocused?.name || '暂无'}</span>
                  <span className="kpi-sub">{periodSummary.mostFocused ? `${periodSummary.mostFocused.value} 分钟` : '加油！'}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrapper color-orange">
                  <Zap size={26} strokeWidth={2} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-label">专注效率</span>
                  <span className="kpi-value">{periodSummary.focusCount ? Math.round(periodSummary.totalMinutes / periodSummary.focusCount) : 0}<small>分钟</small></span>
                  <span className="kpi-sub">平均每次专注时长</span>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card main-chart">
                <div className="chart-header">
                  <div className="chart-title">
                    <h3>专注趋势</h3>
                    <p className={clsx("chart-subtitle", { "text-primary font-medium": activeBarData })}>
                      {activeBarData 
                        ? `${activeBarData.name}：${activeBarData.value}分钟`
                        : `${period === 'day' ? '今日' : period === 'week' ? '本周' : '本月'}专注分布`
                      }
                    </p>
                  </div>
                  <div className="chart-unit">单位：分钟</div>
                </div>
                <div className="chart-container">
                  {periodSummary.totalMinutes >= 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData} 
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                        onClick={() => setActiveBarData(null)}
                        barSize={32}
                      >
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.primary} stopOpacity={0.85}/>
                            <stop offset="100%" stopColor={theme.primary} stopOpacity={0.4}/>
                          </linearGradient>
                          <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={theme.primaryDark} stopOpacity={0.95}/>
                            <stop offset="100%" stopColor={theme.primary} stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} 
                          dy={12}
                          interval={period === 'day' ? 3 : 0} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#94A3B8' }} 
                        />
                        <Tooltip 
                          content={<CustomBarTooltip themeColor={theme.primary} />} 
                          cursor={false}
                          isAnimationActive={true}
                          animationDuration={400}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                          onClick={(data, _index, e) => {
                            e.stopPropagation();

                            const maybeDatum = data as unknown;
                            if (!maybeDatum || typeof maybeDatum !== 'object') return;

                            const maybeName = (maybeDatum as Record<string, unknown>).name;
                            const maybeValue = (maybeDatum as Record<string, unknown>).value;

                            if (typeof maybeName !== 'string') return;

                            const value = typeof maybeValue === 'number'
                              ? maybeValue
                              : (Array.isArray(maybeValue) && typeof maybeValue[1] === 'number' ? maybeValue[1] : null);

                            if (typeof value === 'number') {
                              setActiveBarData({ name: maybeName, value });
                            }
                          }}
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                activeBarData?.name === entry.name
                                  ? 'url(#barGradientHover)'
                                  : (entry.value > 0 ? 'url(#barGradient)' : '#F1F5F9')
                              } 
                              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">
                      <TrendingUp size={48} strokeWidth={1} />
                      <p style={{ marginTop: '16px' }}>暂无专注数据</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="chart-card pie-chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <h3>任务分布</h3>
                    <p className="chart-subtitle">
                      {activePieIndex >= 0 && pieData[activePieIndex]
                        ? `${pieData[activePieIndex].name}: ${pieData[activePieIndex].value}分钟`
                        : (pieData.length > 0 ? '点击扇区查看详情' : '暂无数据')}
                    </p>
                  </div>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.length > 0 ? pieData : [{ name: '暂无', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                          onMouseEnter={(_, index) => pieData.length > 0 && setActivePieIndex(index)}
                          onMouseLeave={() => setActivePieIndex(-1)}
                          onClick={(_, index) => pieData.length > 0 && setActivePieIndex(index)}
                        >
                          {pieData.length > 0 ? pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              style={{ 
                                outline: 'none', 
                                transition: 'all 0.3s ease',
                                transform: activePieIndex === index ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: 'center center'
                              }}
                            />
                          )) : <Cell fill="#F1F5F9" />}
                        </Pie>
                        {pieData.length > 0 && (
                          <Tooltip content={<CustomPieTooltip />} />
                        )}
                        {pieData.length > 0 && (
                          <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle" 
                            iconSize={8}
                            formatter={(value) => <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 500 }}>{value}</span>}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="stats-lower-section">
              <div className="review-editor-card">
                <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', background: '#e6f7ff', borderRadius: '8px', color: '#1890ff' }}>
                      <PenTool size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{reviewContext.label}</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>记录当下的感悟与反思</p>
                    </div>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={handleSaveReview}
                    disabled={isSavingReview}
                  >
                    <Save size={16} />
                    {isSavingReview ? '保存中...' : '保存'}
                  </button>
                </div>
                
                <div className="mood-selector-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span className="mood-label" style={{ fontSize: '14px', color: '#595959' }}>今日心情:</span>
                  <div className="mood-buttons" style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'happy', icon: <Smile size={18} />, label: '开心' },
                      { id: 'excited', icon: <ThumbsUp size={18} />, label: '很棒' },
                      { id: 'neutral', icon: <Meh size={18} />, label: '平静' },
                      { id: 'tired', icon: <Activity size={18} />, label: '疲惫' },
                      { id: 'sad', icon: <Frown size={18} />, label: '低落' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        className={clsx('mood-btn', { active: mood === m.id })}
                        onClick={() => setMood(m.id)}
                        title={m.label}
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e8e8e8', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: mood === m.id ? theme.primary : '#8c8c8c',
                          background: '#fff',
                          borderColor: mood === m.id ? theme.primary : '#e8e8e8',
                          cursor: 'pointer'
                        }}
                      >
                        {m.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  className="review-input"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="成长主题"
                />

                <textarea
                  className="review-textarea custom-scrollbar"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder={reviewContext.placeholder}
                />
              </div>

              <div className="smart-summary-section">
                <div className="summary-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="smart-summary-header" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div className="smart-summary-icon" style={{ color: '#fa8c16' }}>
                      <Sparkles size={24} />
                    </div>
                    <div className="smart-summary-text">
                      <h3 style={{ margin: 0 }}>数据总结</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>洞察趋势，给出下一步建议</p>
                    </div>
                  </div>

                  <div className="summary-content" style={{ flex: 1 }}>
                    <div className="whitespace-pre-wrap leading-loose text-[14px] text-slate-700" style={{ lineHeight: 1.8, color: '#595959' }}>
                      {ruleBasedSummary}
                    </div>
                  </div>
                  <button 
                    className="summary-action-btn"
                    onClick={() => navigator.clipboard.writeText(ruleBasedSummary)}
                    style={{ 
                      marginTop: '16px', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', 
                      background: 'transparent', border: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '13px' 
                    }}
                  >
                    <Share2 size={16} />
                    <span>复制总结</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="calendar-view-container">
            {period === 'month' && (
              <div className="calendar-header-row">
                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => (
                  <div key={day} className="calendar-weekday-header">{day}</div>
                ))}
              </div>
            )}
            <div className={clsx({
              'calendar-grid-large': period === 'month',
              'calendar-list-week': period === 'week',
              'calendar-grid-day': period === 'day'
            })}>
              {gridData?.cells.map((cell, index) => (
                <div 
                  key={index} 
                  className={clsx(
                    period === 'day' ? 'calendar-cell-day-view' : period === 'week' ? '' : 'calendar-cell-large', 
                    { 'empty': cell.day === null }
                  )}
                  onClick={() => {
                    if (cell.fullDate && period !== 'day') {
                      setSelectedDayDetails({
                        date: cell.fullDate,
                        value: cell.value,
                        tasks: cell.tasks
                      });
                    }
                  }}
                  style={{ cursor: cell.fullDate && period !== 'day' ? 'pointer' : 'default' }}
                >
                  {cell.day && (
                    period === 'day' ? (
                      <div className="day-timeline" style={{ padding: '24px' }}>
                        <div className="day-header-simple" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: '#262626' }}>
                           {format(new Date(currentDate), 'yyyy年M月d日')} {['周日','周一','周二','周三','周四','周五','周六'][new Date(currentDate).getDay()]}
                        </div>
                        {dayTimelineData.length > 0 ? (
                          <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {dayTimelineData.map((item, i) => (
                              <div 
                                key={`${item.id}-${i}`} 
                                className="timeline-item"
                                style={{ 
                                  display: 'flex', gap: '16px', 
                                  padding: '12px', borderRadius: '8px', 
                                  background: '#fff', border: '1px solid #e8e8e8',
                                   borderLeft: `4px solid ${item.color || theme.primary}`
                                }}
                              >
                                <div className="timeline-time" style={{ width: '48px', fontWeight: 600, color: '#595959' }}>{item.time}</div>
                                <div className="timeline-content" style={{ flex: 1 }}>
                                  <div className="timeline-title" style={{ fontSize: '15px', fontWeight: 500, color: '#262626' }}>{item.title}</div>
                                  {item.subtitle && (
                                    <div className="timeline-meta" style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {item.icon}
                                      <span>{item.subtitle}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-timeline" style={{ textAlign: 'center', padding: '48px', color: '#bfbfbf' }}>
                            <p>今天还没有记录哦</p>
                          </div>
                        )}
                      </div>
                    ) : period === 'week' ? (
                      <div className="week-row-card" style={{ display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                         <div className="week-row-date" style={{ width: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{['周日','周一','周二','周三','周四','周五','周六'][(cell.fullDate as Date).getDay()]}</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>{(cell.fullDate as Date).getDate()}</div>
                         </div>
                         
                         <div className="week-row-content" style={{ flex: 1 }}>
                           {cell.value > 0 ? (
                             <>
                               <div className="week-stacked-bar" style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                                   {cell.tasks.map((task: TaskBreakdown, idx: number) => (
                                     <div 
                                       key={task.id} 
                                       style={{ 
                                        width: `${(task.duration / cell.value) * 100}%`,
                                        backgroundColor: task.color.bar,
                                        borderRight: idx < cell.tasks.length - 1 ? '1px solid rgba(255,255,255,0.5)' : 'none'
                                      }}
                                     />
                                   ))}
                               </div>
                               <div className="week-row-details" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                 {cell.tasks.slice(0, 3).map((task: TaskBreakdown) => (
                                   <div key={task.id} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: task.color.bg, color: task.color.text }}>
                                      {task.title} {task.duration}m
                                   </div>
                                 ))}
                               </div>
                             </>
                           ) : (
                             <div style={{ color: '#bfbfbf', fontSize: '13px', paddingTop: '8px' }}>休息日</div>
                           )}
                         </div>

                         <div className="week-row-stats" style={{ width: '80px', textAlign: 'right' }}>
                           {cell.value > 0 && (
                             <span style={{ fontSize: '16px', fontWeight: 600, color: theme.primary }}>{cell.value}<small style={{ fontSize: '12px', color: '#8c8c8c' }}>m</small></span>
                           )}
                         </div>
                      </div>
                    ) : (
                      // Month View Cell
                      <>
                        <div className="cell-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="cell-date-number" style={{ fontWeight: 500, color: '#595959' }}>{cell.day}</span>
                          <div className="cell-header-right" style={{ display: 'flex', gap: '4px' }}>
                             {cell.mood && (
                               <div className="mood-indicator">
                                 {cell.mood === 'happy' && <Smile size={14} className="text-orange-500" />}
                                 {cell.mood === 'excited' && <ThumbsUp size={14} className="text-green-500" />}
                                 {cell.mood === 'neutral' && <Meh size={14} className="text-blue-500" />}
                                 {cell.mood === 'tired' && <Activity size={14} className="text-purple-500" />}
                                 {cell.mood === 'sad' && <Frown size={14} className="text-gray-500" />}
                               </div>
                             )}
                          </div>
                        </div>
                        
                        <div className="cell-tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cell.tasks.slice(0, 2).map((task: TaskBreakdown) => (
                            <div 
                              key={task.id} 
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 4px', 
                                borderRadius: '2px', 
                                background: task.color.bg, 
                                color: task.color.text,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {task.title}
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedDayDetails && (
        <div className="stats-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="stats-modal-content" style={{ background: '#fff', borderRadius: '12px', width: '400px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
            <div className="stats-modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>
                  {period === 'day' 
                    ? `${format(selectedDayDetails.date, 'H:00')} - ${format(new Date(selectedDayDetails.date.getTime() + 3600000), 'H:00')}`
                    : format(selectedDayDetails.date, 'M月d日')
                  }
                </h3>
                <span style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  {period === 'day'
                    ? format(selectedDayDetails.date, 'yyyy年M月d日')
                    : ['周日','周一','周二','周三','周四','周五','周六'][selectedDayDetails.date.getDay()]
                  }
                </span>
              </div>
              <button onClick={() => setSelectedDayDetails(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c8c8c' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="stats-modal-body">
              <div className="stats-modal-tasks custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedDayDetails.tasks.length > 0 ? (
                  selectedDayDetails.tasks.map((task: TaskBreakdown) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f5f7fa', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: task.color.text, border: `1px solid ${task.color.border}` }}></div>
                        <span style={{ fontWeight: 500 }}>{task.title}</span>
                      </div>
                      <span style={{ color: '#8c8c8c' }}>{task.duration}分钟</span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: '#bfbfbf', padding: '24px' }}>
                    <span>本日无专注记录</span>
                  </div>
                )}
              </div>
              
              <div className="stats-modal-footer" style={{ marginTop: '24px', textAlign: 'right' }}>
                 <button 
                   onClick={() => {
                     setCurrentDate(selectedDayDetails.date);
                     setPeriod('day');
                     setSelectedDayDetails(null);
                   }}
                   style={{ background: theme.primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                 >
                   查看完整时间轴
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
