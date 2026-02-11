import { useState } from 'react';
import { format } from 'date-fns';
import { 
  BookOpen, Zap, Plus, Trophy, ChevronLeft
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useDiaryStore } from '../../store/useDiaryStore';
import { getDailyEngagementStats } from '../../utils/growthFeedback';
import DiaryEditor from './DiaryEditor';
import './DiaryPanel.css';

interface DiaryPanelProps {
  date: Date;
}

export default function DiaryPanel({ date }: DiaryPanelProps) {
  const { entries, createEntry, deleteEntry } = useDiaryStore();
  const { focusRecords } = useTaskStore();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Growth Feedback Stats
  const { count: focusCount, durationMinutes: focusDuration } = getDailyEngagementStats(focusRecords, dateStr);

  // Local state for view mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Filter entries for this date
  const dayEntries = entries.filter(e => e.date === dateStr);

  // Helper to create entry
  const handleCreate = (type: 'note' | 'learning' | 'review') => {
    let newEntry;
    if (type === 'note') {
      newEntry = createEntry({ date: dateStr, type: 'note' });
    } else if (type === 'learning') {
      newEntry = createEntry({ 
        date: dateStr, 
        type: 'learning',
        structuredContent: { keyPoints: [''] }
      });
    } else {
      newEntry = createEntry({ 
        date: dateStr, 
        type: 'review',
        structuredContent: { 
          achievements: [''],
          challenges: [''],
          nextWeekPlan: ['']
        }
      });
    }
    setEditingId(newEntry.id);
    setIsCreating(false);
  };

  // If we are editing, show the editor
  if (editingId) {
    return (
      <DiaryEditor 
        entryId={editingId} 
        onBack={() => setEditingId(null)} 
        onDelete={() => {
          deleteEntry(editingId);
          setEditingId(null);
        }}
      />
    );
  }

  // Template Selection View
  if (dayEntries.length === 0 || isCreating) {
    return (
      <div className="diary-panel">
         {isCreating && (
          <div className="diary-panel-header">
             <button onClick={() => setIsCreating(false)} className="editor-back-btn">
               <ChevronLeft size={18} /> 返回列表
             </button>
          </div>
         )}
         <div className="template-selector-container">
            <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
              选择一个模板开始{isCreating ? '新' : '今天'}的记录
            </div>
            <div className="template-grid">
              <div className="template-card note" onClick={() => handleCreate('note')}>
                <div className="template-icon-wrapper"><Zap size={28} /></div>
                <div className="template-title">随心记</div>
                <div className="template-desc">记录当下的想法、心情与灵感，自由书写。</div>
              </div>

              <div className="template-card learning" onClick={() => handleCreate('learning')}>
                <div className="template-icon-wrapper"><BookOpen size={28} /></div>
                <div className="template-title">学习小结</div>
                <div className="template-desc">记录关键知识点、收获与笔记，结构化沉淀。</div>
              </div>

              <div className="template-card review" onClick={() => handleCreate('review')}>
                <div className="template-icon-wrapper"><Trophy size={28} /></div>
                <div className="template-title">周复盘</div>
                <div className="template-desc">总结本周成就、不足与下周计划，持续精进。</div>
              </div>
            </div>
          </div>
      </div>
    );
  }

  // List View
  return (
    <div className="diary-panel">
      <div className="diary-panel-header">
        <span className="diary-panel-title">我的日记</span>
      </div>

      <div className="diary-list custom-scrollbar">
        {/* Growth Feedback (MVP) */}
        {focusCount > 0 && (
          <div className="diary-growth-feedback">
            🌱 今日已投入专注 {focusCount} 次 · {focusDuration} 分钟
          </div>
        )}

        {dayEntries.map(entry => (
          <div 
            key={entry.id} 
            className="diary-entry-card"
            onClick={() => setEditingId(entry.id)}
          >
            <div className="entry-card-header">
              <div className="entry-type-badge">
                {entry.type === 'note' && <Zap size={12} />}
                {entry.type === 'learning' && <BookOpen size={12} />}
                {entry.type === 'review' && <Trophy size={12} />}
                
                {entry.type === 'note' && '随心记'}
                {entry.type === 'learning' && '学习小结'}
                {entry.type === 'review' && '周复盘'}
              </div>
              <span className="entry-time">
                {format(new Date(entry.createdAt), 'HH:mm')}
              </span>
            </div>
            <div className="entry-preview">
              {entry.title && <div className="entry-preview-title">{entry.title}</div>}
              <div className="entry-preview-content">
                {entry.content ? (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: entry.content
                        .replace(/<img[^>]*>/gi, '[图片]') // 简化图片替换正则
                        .replace(/<[^>]*>/g, '') // 移除所有HTML标签
                        .substring(0, 100) + (entry.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : '')
                    }} 
                  />
                ) : (
                  entry.structuredContent?.cornellSummary ||
                  entry.structuredContent?.keyPoints?.[0] || 
                  entry.structuredContent?.achievements?.[0] || 
                  '无内容'
                )}
              </div>
            </div>
          </div>
        ))}
        
        <button 
          className="add-more-btn"
          style={{
            marginTop: 'auto',
            padding: '0.75rem',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          onClick={() => setIsCreating(true)}
        >
          <Plus size={16} />
          <span>写一条新日记</span>
        </button>
      </div>
    </div>
  );
}
