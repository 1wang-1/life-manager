import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Save, Trash2, 
  Smile, Meh, Frown, Loader2, Plus, X, Sparkles,
  Zap, Coffee, CloudRain
} from 'lucide-react';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useTaskStore } from '../../store/useTaskStore';
import './DiaryPanel.css'; // Reusing styles

interface DiaryEditorProps {
  entryId: string;
  onBack: () => void;
  onDelete: () => void;
}

// Helper component for bullet lists
const BulletListInput = ({ 
  label, 
  items, 
  onChange, 
  onBlur,
  placeholder = "• 输入内容..." 
}: { 
  label: string; 
  items: string[]; 
  onChange: (items: string[]) => void;
  onBlur: () => void;
  placeholder?: string;
}) => {
  return (
    <div className="learning-form" style={{ marginBottom: '1.5rem' }}>
      <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
      {items.map((point, idx) => (
        <input
          key={idx}
          className="bullet-input"
          value={point}
          onChange={e => {
            const newPoints = [...items];
            newPoints[idx] = e.target.value;
            onChange(newPoints);
          }}
          onBlur={onBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const newPoints = [...items];
              newPoints.splice(idx + 1, 0, '');
              onChange(newPoints);
            } else if (e.key === 'Backspace' && !point && items.length > 1) {
              e.preventDefault();
              const newPoints = items.filter((_, i) => i !== idx);
              onChange(newPoints);
            }
          }}
          placeholder={placeholder}
          autoFocus={idx === items.length - 1 && idx > 0}
        />
      ))}
      <button type="button" className="add-bullet-btn" onClick={() => onChange([...items, ''])}>
        <Plus size={14} /> 添加条目
      </button>
    </div>
  );
};

export default function DiaryEditor({ entryId, onBack, onDelete }: DiaryEditorProps) {
  const { entries, updateEntry } = useDiaryStore();
  const { getTaskById } = useTaskStore();
  const entry = entries.find(e => e.id === entryId);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string>();
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  
  // Review specific fields
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [challenges, setChallenges] = useState<string[]>(['']);
  const [nextWeekPlan, setNextWeekPlan] = useState<string[]>(['']);

  const [tags, setTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate tags logic
  useEffect(() => {
    if (!entry) return;
    const suggestions = new Set<string>();
    
    // 1. Linked Task Title
    if (entry.linkedTaskId) {
      const task = getTaskById(entry.linkedTaskId);
      if (task) {
        // Heuristic: If title is short, use it as tag
        if (task.title.length <= 8) {
            suggestions.add(task.title);
        }
        // Extract potential keywords (English words, or specific patterns)
        const englishWords = task.title.match(/[a-zA-Z0-9#+]{2,}/g) || [];
        englishWords.forEach(w => suggestions.add(w));
      }
    }

    // 2. Content Extraction
    const textToScan = `${title} ${content} ${keyPoints.join(' ')} ${achievements.join(' ')} ${challenges.join(' ')} ${nextWeekPlan.join(' ')}`;
    // Extract English/Tech keywords
    const words = textToScan.match(/[a-zA-Z0-9#+]{2,}/g) || [];
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'have', 'from', 'what', 'when', 'where', 'which'];
    
    words.forEach(w => {
      if (!stopWords.includes(w.toLowerCase()) && isNaN(Number(w))) {
        suggestions.add(w);
      }
    });

    // Filter out existing tags
    const filtered = Array.from(suggestions).filter(s => !tags.includes(s));
    setSuggestedTags(filtered.slice(0, 8));
  }, [entry, title, content, keyPoints, achievements, challenges, nextWeekPlan, tags, getTaskById]);

  // Load data
  useEffect(() => {
    const current = entries.find((e) => e.id === entryId);
    if (!current) return;
    setTitle(current.title || '');
    setContent(current.content || '');
    setMood(current.mood);
    setKeyPoints(current.structuredContent?.keyPoints || ['']);
    setAchievements(current.structuredContent?.achievements || ['']);
    setChallenges(current.structuredContent?.challenges || ['']);
    setNextWeekPlan(current.structuredContent?.nextWeekPlan || ['']);
    setTags(current.tags || []);
  }, [entries, entryId]);

  if (!entry) return null;

  const handleSave = (
    overrides: Partial<{
      title: string;
      content: string;
      mood: string | undefined;
      tags: string[];
      keyPoints: string[];
      achievements: string[];
      challenges: string[];
      nextWeekPlan: string[];
    }> = {}
  ) => {
    setIsSaving(true);
    const nextTitle = overrides.title ?? title;
    const nextContent = overrides.content ?? content;
    const nextMood = overrides.mood ?? mood;
    const nextTags = overrides.tags ?? tags;
    const nextKeyPoints = overrides.keyPoints ?? keyPoints;
    const nextAchievements = overrides.achievements ?? achievements;
    const nextChallenges = overrides.challenges ?? challenges;
    const nextNextWeekPlan = overrides.nextWeekPlan ?? nextWeekPlan;

    updateEntry(entryId, {
      title: nextTitle,
      content: nextContent,
      mood: nextMood,
      tags: nextTags,
      structuredContent: {
        ...entry.structuredContent,
        keyPoints: nextKeyPoints.filter(p => p.trim()),
        achievements: nextAchievements.filter(p => p.trim()),
        challenges: nextChallenges.filter(p => p.trim()),
        nextWeekPlan: nextNextWeekPlan.filter(p => p.trim()),
      }
    });
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleBack = () => {
    const hasContent =
      content.trim() ||
      keyPoints.some((k) => k.trim()) ||
      achievements.some((a) => a.trim()) ||
      challenges.some((c) => c.trim()) ||
      nextWeekPlan.some((p) => p.trim());

    if (!title.trim() && !hasContent) {
      onDelete();
      return;
    }

    onBack();
  };

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (nextTag && !tags.includes(nextTag)) {
      const nextTags = [...tags, nextTag];
      setTags(nextTags);
      setTagInput('');
      handleSave({ tags: nextTags });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter(tag => tag !== tagToRemove);
    setTags(nextTags);
    handleSave({ tags: nextTags });
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const getPlaceholder = () => {
    if (entry.type === 'learning') return '✨ 学习主题...';
    if (entry.type === 'review') return '📅 本周成长...';
    return '📝 标题 (可选)...';
  };

  return (
    <div className="diary-editor">
      <div className="editor-toolbar">
        <button type="button" className="editor-back-btn" onClick={handleBack}>
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
        <div className="editor-paper">
          <input 
            className="editor-title-input"
            placeholder={getPlaceholder()}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => handleSave()}
          />

          {/* Tags Section */}
          <div className="editor-input-group">
            <div className="tags-container">
                {tags.map(tag => (
                    <span key={tag} className="tag-chip">
                        #{tag}
                        <X 
                            size={12} 
                            className="remove-tag-icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(tag);
                            }}
                        />
                    </span>
                ))}
                <input 
                    className="tag-input"
                    placeholder={tags.length === 0 ? "🏷️ 添加标签..." : "+ 标签"}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDownTag}
                    onBlur={() => {
                        if(tagInput.trim()) handleAddTag();
                    }}
                />
            </div>
            
            {/* Auto-generated Suggestions */}
            {suggestedTags.length > 0 && (
                <div className="suggested-tags">
                    <div className="suggestion-label">
                        <Sparkles size={12} />
                        <span>智能推荐:</span>
                    </div>
                    {suggestedTags.map(tag => (
                        <button
                            type="button"
                            key={tag}
                            onClick={() => {
                                const nextTags = [...tags, tag];
                                setTags(nextTags);
                                handleSave({ tags: nextTags });
                            }}
                            className="suggestion-chip"
                        >
                            <Plus size={10} />
                            {tag}
                        </button>
                    ))}
                </div>
            )}
          </div>

          {entry.type === 'note' && (
            <div className="mood-selector" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`mood-chip ${mood === 'good' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'good';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <Smile size={16} /> 开心
              </button>
              <button
                type="button"
                className={`mood-chip ${mood === 'excited' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'excited';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <Zap size={16} /> 激动
              </button>
              <button
                type="button"
                className={`mood-chip ${mood === 'ok' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'ok';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <Meh size={16} /> 平淡
              </button>
              <button
                type="button"
                className={`mood-chip ${mood === 'tired' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'tired';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <Coffee size={16} /> 疲惫
              </button>
              <button
                type="button"
                className={`mood-chip ${mood === 'bad' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'bad';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <Frown size={16} /> 难过
              </button>
              <button
                type="button"
                className={`mood-chip ${mood === 'emo' ? 'selected' : ''}`}
                onClick={() => {
                  const nextMood = 'emo';
                  setMood(nextMood);
                  handleSave({ mood: nextMood });
                }}
              >
                <CloudRain size={16} /> EMO
              </button>
            </div>
          )}

          {entry.type === 'note' && (
            <textarea 
              className="editor-textarea"
              placeholder="✨ 记录当下此刻的想法、心情或是灵感..."
              value={content}
              onChange={e => setContent(e.target.value)}
              onBlur={() => handleSave()}
            />
          )}

          {entry.type === 'learning' && (
            <BulletListInput 
              label="💡 关键知识点"
              items={keyPoints}
              onChange={setKeyPoints}
              onBlur={() => handleSave()}
              placeholder="• 输入知识点..."
            />
          )}

          {entry.type === 'review' && (
            <div className="review-section">
              <BulletListInput 
                label="🌟 本周成就 (Done)"
                items={achievements}
                onChange={setAchievements}
                onBlur={() => handleSave()}
                placeholder="• 完成了什么..."
              />
              <BulletListInput 
                label="🤔 不足与挑战 (Challenges)"
                items={challenges}
                onChange={setChallenges}
                onBlur={() => handleSave()}
                placeholder="• 遇到了什么问题..."
              />
              <BulletListInput 
                label="🚀 下周计划 (Next Steps)"
                items={nextWeekPlan}
                onChange={setNextWeekPlan}
                onBlur={() => handleSave()}
                placeholder="• 下周重点做什么..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
