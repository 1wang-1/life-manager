import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, subWeeks, getWeek, getWeekYear, differenceInCalendarDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { 
    Search, 
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    Edit2,
    Tag,
    BarChart2,
    Zap,
    BookOpen,
    PenTool,
    ChevronDown,
    Flame
} from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useDiaryStore, DiaryType } from '../store/useDiaryStore';
import DiaryEditor from '../components/diary/DiaryEditor';
import { GrowthIcon } from '../components/GrowthStageIcons';
import { computeWeeklyGrowth } from '../utils/growthLogic';
import clsx from 'clsx';
import './CalendarPage.css';

const TABS = [
    { id: 'all', label: '全部' },
    { id: 'note', label: '随心记' },
    { id: 'learning', label: '学习总结' },
    { id: 'review', label: '本周成长' }
];

type TabId = DiaryType | 'all';

export default function CalendarPage() {
  const { entries, createEntry, deleteEntry } = useDiaryStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { focusRecords, tasks } = useTaskStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isClosingMenu, setIsClosingMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [isWeekRecordsOpen, setIsWeekRecordsOpen] = useState(false);
  const weekRecordsRef = useRef<HTMLDivElement>(null);

  const [isSidebarCollapsed] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>('all');

  // Filter State
  const selectedTag = searchParams.get('tag');

  // Helper to set tag
  const setSelectedTag = (tag: string | null) => {
      if (tag) {
          setSearchParams({ tag });
          setActiveTab('all');
          setSelectedDate(null);
      } else {
          setSearchParams({});
      }
  };

  // Close Menu Logic
  const closeMenu = useCallback(() => {
    if (!showCreateMenu) return;
    setIsClosingMenu(true);
    setTimeout(() => {
        setShowCreateMenu(false);
        setIsClosingMenu(false);
    }, 200);
  }, [showCreateMenu]);

  // Click Outside & ESC Handler
  useEffect(() => {
      if (!showCreateMenu) return;

      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
          if (
              menuRef.current && 
              !menuRef.current.contains(event.target as Node) &&
              buttonRef.current &&
              !buttonRef.current.contains(event.target as Node)
          ) {
              closeMenu();
          }
      };

      const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
              closeMenu();
          }
      };

      const timer = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
          document.addEventListener('touchstart', handleClickOutside);
          document.addEventListener('keydown', handleKeyDown);
      }, 50);

      return () => {
          clearTimeout(timer);
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('touchstart', handleClickOutside);
          document.removeEventListener('keydown', handleKeyDown);
      };
  }, [showCreateMenu, closeMenu]);

  // Compute Weekly Growth Logic - Moved to utils/growthLogic.ts

  const currentWeekGrowth = useMemo(() => {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 });
      start.setHours(0, 0, 0, 0);
      const end = endOfWeek(now, { weekStartsOn: 1 });
      end.setHours(23, 59, 59, 999);

      const records = focusRecords
          .filter(r => r.startTime >= start.getTime() && r.startTime <= end.getTime())
          .sort((a, b) => b.startTime - a.startTime);

      const totalMinutes = Math.floor(records.reduce((sum, r) => sum + (r.duration || 0), 0) / 60);
      const growth = computeWeeklyGrowth(totalMinutes);

      return {
          totalMinutes,
          records,
          ...growth
      };
  }, [focusRecords]);

  const nextSynthesis = useMemo(() => {
      const weekMinutes = currentWeekGrowth.totalMinutes;
      const units = Math.floor(Math.max(0, weekMinutes) / 25);

      const getNext = ():
          | { nextUnits: number; nextStageName: string }
          | null => {
          if (units < 1) return { nextUnits: 1, nextStageName: '萌芽' };
          if (units < 3) return { nextUnits: 3, nextStageName: '生长' };
          if (units < 8) return { nextUnits: 8, nextStageName: '树苗' };
          if (units < 18) return { nextUnits: 18, nextStageName: '小树' };
          if (units < 32) return { nextUnits: 32, nextStageName: '茂盛' };
          return null;
      };

      const next = getNext();
      if (!next) return null;

      const minutesToNext = Math.max(0, next.nextUnits * 25 - weekMinutes);
      const sessionsToNext = Math.ceil(minutesToNext / 25);

      const now = new Date();
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const remainingDays = Math.max(1, differenceInCalendarDays(end, now) + 1);
      const dailyTargetMinutes = Math.ceil(minutesToNext / remainingDays);

      return {
          ...next,
          minutesToNext,
          sessionsToNext,
          remainingDays,
          dailyTargetMinutes
      };
  }, [currentWeekGrowth.totalMinutes]);

  const historyForest = useMemo(() => {
      const now = new Date();
      return Array.from({ length: 6 }).map((_, idx) => {
          const weekDate = subWeeks(now, idx);
          const start = startOfWeek(weekDate, { weekStartsOn: 1 });
          start.setHours(0, 0, 0, 0);
          const end = endOfWeek(weekDate, { weekStartsOn: 1 });
          end.setHours(23, 59, 59, 999);

          const totalMinutes = Math.floor(
              focusRecords
                  .filter(r => r.startTime >= start.getTime() && r.startTime <= end.getTime())
                  .reduce((sum, r) => sum + (r.duration || 0), 0) / 60
          );

          const growth = computeWeeklyGrowth(totalMinutes);
          const year = getWeekYear(weekDate, { weekStartsOn: 1 });
          const week = getWeek(weekDate, { weekStartsOn: 1 });

          return {
              key: `${year}-${week}`,
              label: `${format(start, 'MM/dd', { locale: zhCN })}–${format(end, 'MM/dd', { locale: zhCN })}`,
              stage: growth.stage,
              stageName: growth.stageName,
              stageAriaLabel: growth.stageAriaLabel,
              totalMinutes
          };
      });
  }, [focusRecords]);

  // Derived Data: Tab Counts
  const tabCounts = useMemo(() => {
    const contextEntries = entries.filter(entry => {
      const matchesSearch = 
        (entry.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.structuredContent?.keyPoints?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesTag = selectedTag ? entry.tags?.includes(selectedTag) : true;

      return matchesSearch && matchesTag;
    });

    const counts = {
      all: contextEntries.length,
      note: 0,
      learning: 0,
      review: 0
    };

    contextEntries.forEach(entry => {
      if (entry.type in counts) {
        counts[entry.type as DiaryType]++;
      }
    });

    return counts;
  }, [entries, searchTerm, selectedTag]);

  // Derived Data: Tag Stats
  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(stats.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Derived Data: Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (selectedDate && entry.date !== selectedDate) return false;
      if (activeTab !== 'all' && activeTab !== 'review' && entry.type !== activeTab) return false; // Review tab has its own view

      const matchesSearch = 
        (entry.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.content?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.structuredContent?.keyPoints?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesTag = selectedTag ? entry.tags?.includes(selectedTag) : true;

      return matchesSearch && matchesTag;
    });
  }, [entries, searchTerm, selectedTag, activeTab, selectedDate]);

  // Calendar Data
  const calendarDays = useMemo(() => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const activeDates = useMemo(() => {
      const dates = new Set<string>();
      entries.forEach(entry => {
          dates.add(entry.date);
      });
      return dates;
  }, [entries]);

  // Derived Data: Streak
  const streak = useMemo(() => {
      const sortedDates = Array.from(activeDates).sort((a, b) => b.localeCompare(a));
      if (sortedDates.length === 0) return 0;

      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      // If neither today nor yesterday has entry, streak is 0
      if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

      let count = 1;
      let currentDate = new Date(sortedDates[0]);

      for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i]);
          const diff = differenceInCalendarDays(currentDate, prevDate);
          
          if (diff === 1) {
              count++;
              currentDate = prevDate;
          } else {
              break;
          }
      }
      return count;
  }, [activeDates]);

  const totalWords = useMemo(() => {
      return entries.reduce((sum, entry) => sum + (entry.content?.length || 0), 0);
  }, [entries]);



  const handleAddDiary = (type: DiaryType | unknown = 'note') => {
    const validTypes: DiaryType[] = ['note', 'learning', 'review'];
    const safeType = (typeof type === 'string' && validTypes.includes(type as DiaryType)) 
      ? type as DiaryType 
      : 'note';

    const today = selectedDate || format(new Date(), 'yyyy-MM-dd');
    const newEntry = createEntry({
      date: today,
      type: safeType,
      title: '',
      content: ''
    });
    setEditingEntryId(newEntry.id);
    setShowCreateMenu(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条日记吗？')) {
      deleteEntry(id);
      if (editingEntryId === id) {
        setEditingEntryId(null);
      }
    }
  };

  if (editingEntryId) {
    return (
      <div className="calendar-layout single-column-mode">
        <div className="calendar-main full-width">
          <DiaryEditor 
            entryId={editingEntryId} 
            onBack={() => setEditingEntryId(null)}
            onDelete={() => {
              deleteEntry(editingEntryId);
              setEditingEntryId(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container calendar-page">
      <div className="calendar-header-row page-header">
          <div>
              <h1 className="page-title">每日随记</h1>
              <p className="page-subtitle">记录生活，反思成长</p>
          </div>
          <div className="header-actions">
              <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input 
                      type="text" 
                      placeholder="搜索..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="create-menu-container" style={{ position: 'relative' }}>
                  <button 
                      className="btn-primary" 
                      onClick={() => setShowCreateMenu(!showCreateMenu)}
                      ref={buttonRef}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                      <Plus size={18} />
                      <span>新建</span>
                      <ChevronDown size={14} style={{ opacity: 0.8 }} />
                  </button>
                  
                  {showCreateMenu && (
                            <div 
                                ref={menuRef}
                                className={clsx("create-menu-dropdown", { "closing": isClosingMenu })}
                            >
                                <button className="dropdown-item" onClick={() => handleAddDiary('note')}>
                                    <div className="icon-box note-icon"><Zap size={20} /></div>
                                    <div className="dropdown-text">
                                        <span className="label">随心记</span>
                                        <span className="desc">快速记录当下的想法</span>
                                    </div>
                                </button>
                                <button className="dropdown-item" onClick={() => handleAddDiary('learning')}>
                                    <div className="icon-box learning-icon"><BookOpen size={20} /></div>
                                    <div className="dropdown-text">
                                        <span className="label">学习总结</span>
                                        <span className="desc">记录知识点和感悟</span>
                                    </div>
                                </button>
                                <button className="dropdown-item" onClick={() => handleAddDiary('review')}>
                                    <div className="icon-box review-icon"><PenTool size={20} /></div>
                                    <div className="dropdown-text">
                                        <span className="label">本周成长</span>
                                        <span className="desc">回顾一周的成长</span>
                                    </div>
                                </button>
                            </div>
                        )}
              </div>
          </div>
      </div>

      <div className={clsx('calendar-layout', { 'sidebar-collapsed': isSidebarCollapsed })}>
        <div className="calendar-main">
            <div className="header-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={clsx('tab-btn', { active: activeTab === tab.id })}
                            onClick={() => {
                                setActiveTab(tab.id as TabId);
                                setSelectedDate(null);
                            }}
                        >
                            {tab.label}
                            <span className="tab-count">
                                {tabCounts[tab.id as keyof typeof tabCounts] || 0}
                            </span>
                        </button>
                    ))}
                </div>
                
                {selectedTag && (
                    <div className="active-filters">
                        <span className="filter-chip">
                            <Tag size={12} />
                            {selectedTag}
                            <button onClick={() => setSelectedTag(null)}>×</button>
                        </span>
                    </div>
                )}


            {activeTab === 'review' ? (
                <div className="weekly-growth-view custom-scrollbar">
                    <div className="weekly-growth-card">
                        <div className="weekly-growth-card__header">
                            <h3 className="weekly-growth-card__title">本周成长</h3>
                        </div>

                        <div className="weekly-growth-card__hero">
                            <div className="weekly-growth-card__icon-wrapper" role="img" aria-label={currentWeekGrowth.stageAriaLabel}>
                                <GrowthIcon stage={currentWeekGrowth.stage} size={80} />
                            </div>
                            <div className="weekly-growth-card__stage">{currentWeekGrowth.stageName}</div>
                            {currentWeekGrowth.helper && (
                                <div className="weekly-growth-card__helper">{currentWeekGrowth.helper}</div>
                            )}
                        </div>

                        {currentWeekGrowth.totalMinutes > 0 && (
                            <div className="weekly-growth-card__meta">本周专注：{currentWeekGrowth.totalMinutes} 分钟</div>
                        )}

                        {nextSynthesis && (
                            <div className="weekly-growth-card__meta weekly-growth-card__next">
                                距离合成到 {nextSynthesis.nextStageName}：{nextSynthesis.minutesToNext} 分钟（约 {nextSynthesis.sessionsToNext} 次 25m）
                            </div>
                        )}

                        {nextSynthesis && nextSynthesis.minutesToNext > 0 && (
                            <div className="weekly-growth-card__meta weekly-growth-card__next-hint">
                                本周剩余 {nextSynthesis.remainingDays} 天，平均每天再专注 {nextSynthesis.dailyTargetMinutes} 分钟
                            </div>
                        )}

                        {currentWeekGrowth.progress && (
                            <div className="weekly-growth-card__meta weekly-growth-card__progress">
                                <span className="progress-label">合成进度：</span>
                                <div className="progress-icons">
                                    {Array.from({ length: currentWeekGrowth.progress.total }).map((_, idx) => (
                                        <GrowthIcon 
                                            key={idx} 
                                            stage={currentWeekGrowth.progress!.unitIcon} 
                                            size={20} 
                                            style={{ 
                                                opacity: idx < currentWeekGrowth.progress!.current ? 1 : 0.3,
                                                filter: idx < currentWeekGrowth.progress!.current ? 'none' : 'grayscale(100%)'
                                            }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            className="btn-ghost weekly-growth-card__action"
                            onClick={() => {
                                setIsWeekRecordsOpen(v => !v);
                                setTimeout(() => weekRecordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                            }}
                        >
                            查看本周记录
                        </button>
                    </div>

                    {isWeekRecordsOpen && (
                        <div ref={weekRecordsRef} className="weekly-growth-records">
                            {currentWeekGrowth.records.length === 0 ? (
                                <div className="weekly-growth-records__empty">还没有本周专注记录</div>
                            ) : (
                                <div className="weekly-growth-records__list">
                                    {currentWeekGrowth.records.map(r => {
                                        const task = r.taskId ? tasks.find(t => t.id === r.taskId) : null;
                                        const title = task ? task.title : (r.taskId ? '已删除任务' : '自由专注');
                                        const minutes = Math.round((r.duration || 0) / 60);
                                        return (
                                            <div key={r.id} className="weekly-growth-record">
                                                <div className="weekly-growth-record__left">
                                                    <div className="weekly-growth-record__title">{title}</div>
                                                    <div className="weekly-growth-record__sub">
                                                        {format(new Date(r.startTime), 'M/d HH:mm', { locale: zhCN })}
                                                    </div>
                                                </div>
                                                <div className="weekly-growth-record__right">{minutes}m</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="history-forest-section">
                        <h3 className="history-forest-title">历史森林</h3>
                        <div className="history-forest-list">
                            {historyForest.map(week => (
                                <div key={week.key} className="history-forest-row">
                                    <div className="history-forest-row__info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="history-forest-row__label">{week.label}</div>
                                        {week.stage !== 'empty' && (() => {
                                            const colors = {
                                                forest: { text: '#14532D', bg: '#DCFCE7', border: '#86EFAC' },
                                                tree: { text: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
                                                sapling: { text: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                                                seedling: { text: '#4ADE80', bg: '#F0FDF4', border: 'transparent' },
                                                sprout: { text: '#65A30D', bg: '#F7FEE7', border: 'transparent' }
                                            }[week.stage as string] || { text: '#6B7280', bg: '#F3F4F6', border: 'transparent' };
                                            
                                            return (
                                                <span 
                                                    className="history-forest-row__stage-name" 
                                                    style={{ 
                                                        fontSize: '12px', 
                                                        fontWeight: 600,
                                                        color: colors.text,
                                                        background: colors.bg,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid',
                                                        borderColor: colors.border
                                                    }}
                                                >
                                                    {week.stageName}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="history-forest-row__icon" role="img" aria-label={week.stageAriaLabel}>
                                        <GrowthIcon stage={week.stage} size={28} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="diary-list custom-scrollbar">
                    {filteredEntries.length > 0 ? (
                        filteredEntries.map(entry => (
                            <div 
                              key={entry.id} 
                              className="diary-item"
                              onClick={() => setEditingEntryId(entry.id)}
                            >
                                <div className="diary-date-col">
                                    <span className="day">{format(new Date(entry.date), 'dd')}</span>
                                    <span className="month">{format(new Date(entry.date), 'M月')}</span>
                                    <span className="year">{format(new Date(entry.date), 'yyyy')}</span>
                                </div>
                                
                                <div className="diary-content-col">
                                    <div className="diary-header">
                                        <h3 className="diary-title">
                                            {entry.title || (entry.type === 'review' ? '本周成长' : '无标题')}
                                        </h3>
                                        <div className="diary-actions">
                                            <span className="time-badge">
                                                {format(new Date(entry.createdAt), 'HH:mm')}
                                            </span>
                                            <button 
                                              className="action-btn edit-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingEntryId(entry.id);
                                              }}
                                              title="编辑"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button 
                                              className="action-btn delete-btn"
                                              onClick={(e) => handleDelete(e, entry.id)}
                                              title="删除"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="diary-preview">
                                        {entry.structuredContent?.keyPoints ? (
                                            <div className="key-points">
                                                {entry.structuredContent.keyPoints.slice(0, 3).map((p, i) => (
                                                    <div key={i} className="point-item">
                                                        <span className="dot"></span>
                                                        {p}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-preview">
                                                {entry.content || '暂无内容...'}
                                            </p>
                                        )}
                                    </div>

                                    {entry.tags && entry.tags.length > 0 && (
                                        <div className="diary-tags">
                                            {entry.tags.map(tag => (
                                                <span key={tag} className="mini-tag">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <Edit2 size={48} strokeWidth={1} />
                            </div>
                            <p className="empty-text">
                                {activeTab === 'all' 
                                ? '还没有相关记录，开始记录第一笔...' 
                                : `还没有${TABS.find(t => t.id === activeTab)?.label ?? ''}...`}
                            </p>
                            
                            {activeTab === 'all' ? (
                                <div className="empty-actions-grid">
                                    <button className="empty-action-card" onClick={() => handleAddDiary('note')}>
                                        <div className="icon-box note-icon"><Zap size={20} /></div>
                                        <span>随心记</span>
                                    </button>
                                    <button className="empty-action-card" onClick={() => handleAddDiary('learning')}>
                                        <div className="icon-box learning-icon"><BookOpen size={20} /></div>
                                        <span>学习总结</span>
                                    </button>
                                    <button className="empty-action-card" onClick={() => handleAddDiary('review')}>
                                        <div className="icon-box review-icon"><PenTool size={20} /></div>
                                        <span>本周成长</span>
                                    </button>
                                </div>
                            ) : (
                                <button className="btn-primary" onClick={() => handleAddDiary(activeTab as DiaryType)}>
                                    <Plus size={18} />
                                    立即开始
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right Sidebar */}
        <aside className="calendar-sidebar">
            {/* Mini Calendar Widget */}
            <div className="sidebar-card calendar-widget">
                <div className="mini-calendar-header">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16}/></button>
                    <span>{format(currentMonth, 'yyyy年 M月', { locale: zhCN })}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16}/></button>
                </div>
                <div className="mini-calendar-grid">
                    {['日','一','二','三','四','五','六'].map(d => (
                        <div key={d} className="day-label">{d}</div>
                    ))}
                    {/* Padding for start of month */}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                        <div key={`pad-${i}`} className="mini-day empty" />
                    ))}
                    {calendarDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const hasEntry = activeDates.has(dateStr);
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate === dateStr;
                        return (
                            <button 
                                key={dateStr} 
                                className={clsx('mini-day', { 
                                    'has-entry': hasEntry,
                                    'is-today': isToday,
                                    'is-selected': isSelected
                                })}
                                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tags Card */}
            <div className="sidebar-card tags-card">
                <div className="widget-title">
                    <Tag size={16} />
                    <span>常用标签</span>
                </div>
                
                {tagStats.length > 0 ? (
                    <div className="tags-cloud">
                        <button 
                            className={clsx('tag-chip', { active: !selectedTag })}
                            onClick={() => setSelectedTag(null)}
                        >
                            全部
                        </button>
                        {tagStats.slice(0, 15).map(({ tag, count }) => (
                            <button 
                                key={tag}
                                className={clsx('tag-chip', { active: selectedTag === tag })}
                                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                            >
                                {tag} <span className="count">{count}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="empty-tags-hint">
                        暂无标签，写日记时添加 #标签 吧
                    </div>
                )}
            </div>

            {/* Stats Overview Card */}
            <div className="sidebar-card stats-overview-card">
                <div className="widget-title">
                    <BarChart2 size={16} />
                    <span>数据概览</span>
                </div>
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-value">{entries.length}</span>
                        <span className="stat-label">总篇数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {entries.filter(e => isSameMonth(new Date(e.date), new Date())).length}
                        </span>
                        <span className="stat-label">本月篇数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value highlight-fire">
                             <div className="value-with-icon">
                                {streak} <Flame size={14} className={streak > 0 ? 'icon-flame active' : 'icon-flame'} />
                             </div>
                        </span>
                        <span className="stat-label">连更天数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
                        </span>
                        <span className="stat-label">总字数</span>
                    </div>
                </div>
            </div>
        </aside>
      </div>
    </div>
  );
}
