import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  BookOpen, Zap, Plus, ChevronLeft, Save, Trash2, 
  Smile, Meh, Frown, Loader2 
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { useDiaryStore, DiaryEntry } from '../../store/useDiaryStore';
import { getDailyEngagementStats } from '../../utils/growthFeedback';
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
  
  // Filter entries for this date
  const dayEntries = entries.filter(e => e.date === dateStr);

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

        {dayEntries.length === 0 ? (
          <div className="empty-diary-state">
            <p>今天还没有写日记哦</p>
            <div className="create-actions">
              <button 
                className="create-btn"
                onClick={() => {
                  const newEntry = createEntry({ date: dateStr, type: 'note' });
                  setEditingId(newEntry.id);
                }}
              >
                <Zap size={20} />
                <span>随心记</span>
              </button>
              <button 
                className="create-btn"
                onClick={() => {
                  const newEntry = createEntry({ 
                    date: dateStr, 
                    type: 'learning',
                    structuredContent: { keyPoints: [''] }
                  });
                  setEditingId(newEntry.id);
                }}
              >
                <BookOpen size={20} />
                <span>学习小结</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {dayEntries.map(entry => (
              <div 
                key={entry.id} 
                className="diary-entry-card"
                onClick={() => setEditingId(entry.id)}
              >
                <div className="entry-card-header">
                  <div className="entry-type-badge">
                    {entry.type === 'note' ? <Zap size={12} /> : <BookOpen size={12} />}
                    {entry.type === 'note' ? '随心记' : '学习小结'}
                  </div>
                  <span className="entry-time">
                    {format(entry.createdAt, 'HH:mm')}
                  </span>
                </div>
                <div className="entry-preview">
                  {entry.title && <div style={{fontWeight: 600, marginBottom: 4}}>{entry.title}</div>}
                  {entry.content || (entry.structuredContent?.keyPoints?.[0] || '无内容')}
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
              onClick={() => {
                const newEntry = createEntry({ date: dateStr, type: 'note' });
                setEditingId(newEntry.id);
              }}
            >
              <Plus size={16} />
              <span>写一条新日记</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-component: Editor
function DiaryEditor({ entryId, onBack, onDelete }: { entryId: string, onBack: () => void, onDelete: () => void }) {
  const { entries, updateEntry } = useDiaryStore();
  const entry = entries.find(e => e.id === entryId);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryEntry['mood']>();
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  useEffect(() => {
    const current = entries.find((e) => e.id === entryId);
    if (!current) return;
    setTitle(current.title || '');
    setContent(current.content || '');
    setMood(current.mood);
    setKeyPoints(current.structuredContent?.keyPoints || ['']);
  }, [entries, entryId]);

  if (!entry) return null;

  const handleSave = (overrides: Partial<{ mood: DiaryEntry['mood'] }> = {}) => {
    setIsSaving(true);
    updateEntry(entryId, {
      title,
      content,
      mood: overrides.mood ?? mood,
      structuredContent: {
        ...entry.structuredContent,
        keyPoints: keyPoints.filter(p => p.trim())
      }
    });
    setTimeout(() => setIsSaving(false), 300);
  };

  return (
    <div className="diary-editor">
      <div className="editor-toolbar">
        <button type="button" className="editor-back-btn" onClick={onBack}>
          <ChevronLeft size={18} /> 返回
        </button>
        <div className="editor-actions">
          <button 
            type="button"
            className="btn btn-ghost icon-only" 
            onClick={() => handleSave()}
            title="保存"
            style={{ color: isSaving ? 'var(--color-primary)' : 'inherit' }}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button 
            type="button"
            className="btn btn-ghost icon-only danger-hover" 
            onClick={() => {
              if(confirm('确定删除吗？')) onDelete();
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="editor-content custom-scrollbar">
        <input 
          className="editor-title-input"
          placeholder={entry.type === 'learning' ? '主题...' : '标题 (可选)...'}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => handleSave()}
        />

        {entry.type === 'note' && (
          <div className="mood-selector">
            <button
              type="button"
              className={`mood-chip ${mood === 'good' ? 'selected' : ''}`}
              onClick={() => {
                const nextMood = 'good' as const;
                setMood(nextMood);
                handleSave({ mood: nextMood });
              }}
            >
              <Smile size={16} /> 开心
            </button>
            <button
              type="button"
              className={`mood-chip ${mood === 'ok' ? 'selected' : ''}`}
              onClick={() => {
                const nextMood = 'ok' as const;
                setMood(nextMood);
                handleSave({ mood: nextMood });
              }}
            >
              <Meh size={16} /> 平淡
            </button>
            <button
              type="button"
              className={`mood-chip ${mood === 'bad' ? 'selected' : ''}`}
              onClick={() => {
                const nextMood = 'bad' as const;
                setMood(nextMood);
                handleSave({ mood: nextMood });
              }}
            >
              <Frown size={16} /> 难过
            </button>
          </div>
        )}

        {entry.type === 'note' ? (
          <textarea 
            className="editor-textarea"
            placeholder="记录当下..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={() => handleSave()}
          />
        ) : (
          <div className="learning-form">
            <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem'}}>关键知识点</label>
            {keyPoints.map((point, idx) => (
              <input
                key={idx}
                className="bullet-input"
                value={point}
                onChange={e => {
                  const newPoints = [...keyPoints];
                  newPoints[idx] = e.target.value;
                  setKeyPoints(newPoints);
                }}
                onBlur={() => handleSave()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const newPoints = [...keyPoints];
                    newPoints.splice(idx + 1, 0, '');
                    setKeyPoints(newPoints);
                  } else if (e.key === 'Backspace' && !point && keyPoints.length > 1) {
                    const newPoints = keyPoints.filter((_, i) => i !== idx);
                    setKeyPoints(newPoints);
                  }
                }}
                placeholder="• 输入知识点..."
                autoFocus={idx === keyPoints.length - 1 && idx > 0}
              />
            ))}
            <button type="button" className="add-bullet-btn" onClick={() => setKeyPoints([...keyPoints, ''])}>
              <Plus size={14} /> 添加知识点
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
