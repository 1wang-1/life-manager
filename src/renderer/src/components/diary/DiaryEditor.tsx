import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Save, Trash2, 
  Smile, Meh, Frown, Loader2, Plus, X, Sparkles,
  Zap, Coffee, CloudRain, Tag, Lightbulb, Trophy, Target, Calendar, BookOpen, Check, Type
} from 'lucide-react';
import { useDiaryStore } from '../../store/useDiaryStore';
import { useTaskStore } from '../../store/useTaskStore';
import RichTextEditor from './RichTextEditor';
import './DiaryPanel.css'; // Reusing styles

interface DiaryEditorProps {
  entryId: string;
  onBack: () => void;
  onDelete: () => void;
}

// Helper component for bullet lists
const BulletListInput = ({ 
  label, 
  icon: Icon,
  items, 
  onChange, 
  placeholder = "输入内容..." 
}: { 
  label: string; 
  icon?: React.ElementType;
  items: string[]; 
  onChange: (items: string[]) => void;
  placeholder?: string;
}) => {
  return (
    <div className="learning-form" style={{ marginBottom: '2rem' }}>
      <label style={{
        display: 'flex', 
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.9rem', 
        color: 'var(--color-text-secondary)', 
        marginBottom: '0.75rem', 
        fontWeight: 600 
      }}>
        {Icon && <Icon size={16} />}
        {label}
      </label>
      {items.map((point, idx) => (
        <div key={idx} className="bullet-item-wrapper">
          <span className="bullet-dot">•</span>
          <input
            className="bullet-input"
            value={point}
            onChange={e => {
              const newPoints = [...items];
              newPoints[idx] = e.target.value;
              onChange(newPoints);
            }}
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
        </div>
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

  // Cornell Notes specific fields
  const [cornellCues, setCornellCues] = useState('');
  const [cornellSummary, setCornellSummary] = useState('');
  
  // Review specific fields
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [challenges, setChallenges] = useState<string[]>(['']);
  const [nextWeekPlan, setNextWeekPlan] = useState<string[]>(['']);

  const [tags, setTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRichTextMode, setIsRichTextMode] = useState(false);
  const [placeholderPrompt, setPlaceholderPrompt] = useState('');

  // 字数统计和阅读时间
  const calculateWordCount = () => {
    const allText = `${title} ${content} ${keyPoints.join(' ')} ${achievements.join(' ')} ${challenges.join(' ')} ${nextWeekPlan.join(' ')} ${cornellCues} ${cornellSummary}`;
    const chineseChars = (allText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (allText.match(/[a-zA-Z]+/g) || []).length;
    return { chineseChars, englishWords, total: chineseChars + englishWords };
  };



  const calculateReadingTime = () => {
    const { total } = calculateWordCount();
    // 中文阅读速度约300字/分钟，英文约200词/分钟
    const readingTime = Math.max(1, Math.ceil(total / 250));
    return readingTime;
  };

  useEffect(() => {
    const prompts = [
      "今天发生了什么有趣的事？",
      "记录下一个让你会心的瞬间...",
      "此刻你的心情颜色是什么？",
      "写给未来的自己...",
      "今天最想感谢的人或事...",
      "有什么新的感悟吗？",
      "记录下今天的闪光点 ✨",
      "今天的天气怎么样，心情呢？"
    ];
    setPlaceholderPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  }, []);

  // Auto-generate tags logic
  useEffect(() => {
    if (!entry) return;
    const suggestions = new Set<string>();
    
    // 1. Linked Task Title
    if (entry?.linkedTaskId) {
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

  // Auto-resize textarea logic
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };

  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    const handlers: { element: HTMLTextAreaElement; handler: (e: Event) => void }[] = [];

    textareas.forEach(textarea => {
      adjustTextareaHeight(textarea);
      const handleInput = (e: Event) => adjustTextareaHeight(e.target as HTMLTextAreaElement);
      textarea.addEventListener('input', handleInput);
      handlers.push({ element: textarea, handler: handleInput });
    });

    return () => {
      handlers.forEach(({ element, handler }) => {
        element.removeEventListener('input', handler);
      });
    };
  }, [content, cornellCues, cornellSummary, entry?.type]); // Re-run when content or type changes

  // Load data
  useEffect(() => {
    const current = entries.find((e) => e.id === entryId);
    if (!current) return;
    setTitle(current.title || '');
    setContent(current.content || '');
    setMood(current.mood);
    setCornellCues(current.structuredContent?.cornellCues || '');
    setCornellSummary(current.structuredContent?.cornellSummary || '');
    setKeyPoints(current.structuredContent?.keyPoints || ['']);
    setAchievements(current.structuredContent?.achievements || ['']);
    setChallenges(current.structuredContent?.challenges || ['']);
    setNextWeekPlan(current.structuredContent?.nextWeekPlan || ['']);
    setTags(current.tags || []);
  }, [entries, entryId]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 或 Cmd+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Esc 退出
      else if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
      // Ctrl+Enter 快速保存并退出
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
        setTimeout(() => onBack(), 300);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  if (!entry) return null;



  const handleSave = async (
    overrides: Partial<{
      title: string;
      content: string;
      mood: string | undefined;
      tags: string[];
      keyPoints: string[];
      achievements: string[];
      challenges: string[];
      nextWeekPlan: string[];
      cornellCues: string;
      cornellSummary: string;
    }> = {}
  ) => {
    if (!entry) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const nextTitle = overrides.title ?? title;
      const nextContent = overrides.content ?? content;
      const nextMood = overrides.mood ?? mood;
      const nextTags = overrides.tags ?? tags;
      const nextKeyPoints = overrides.keyPoints ?? keyPoints;
      const nextAchievements = overrides.achievements ?? achievements;
      const nextChallenges = overrides.challenges ?? challenges;
      const nextNextWeekPlan = overrides.nextWeekPlan ?? nextWeekPlan;
      const nextCornellCues = overrides.cornellCues ?? cornellCues;
      const nextCornellSummary = overrides.cornellSummary ?? cornellSummary;

      await updateEntry(entry.id, {
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
          cornellCues: nextCornellCues,
          cornellSummary: nextCornellSummary,
        }
      });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save entry:', error);
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    const hasContent =
      content.trim() ||
      keyPoints.some((k) => k.trim()) ||
      achievements.some((a) => a.trim()) ||
      challenges.some((c) => c.trim()) ||
      nextWeekPlan.some((p) => p.trim()) ||
      cornellCues.trim() ||
      cornellSummary.trim();

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



  return (
    <div className="diary-editor">
      <div className="editor-toolbar">
        <button type="button" className="editor-back-btn" onClick={handleBack}>
          <ChevronLeft size={18} />
          <span>返回</span>
        </button>
        
        {entry.type !== 'note' && (
          <span className="editor-toolbar-date">
            {new Date(entry.date).toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </span>
        )}

        <div className="editor-actions">

          <button 
            type="button"
            className={`editor-action-btn primary ${saveStatus === 'saved' ? 'saved' : ''}`} 
            onClick={() => handleSave()}
            title="保存"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saveStatus === 'saved' ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>
              {isSaving ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存'}
            </span>
          </button>
          <button 
            type="button"
            className="editor-action-btn danger" 
            onClick={() => {
              if(confirm('确定删除吗？')) onDelete();
            }}
            title="删除"
          >
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      </div>

      <div className="editor-content custom-scrollbar">
        <div className="editor-paper">
            <input
              type="text"
              className="editor-title-input"
              placeholder={entry.type === 'note' ? '随心记标题...' : entry.type === 'learning' ? '学习主题...' : '复盘标题...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />

            {entry.type === 'note' && (
              <div className="editor-date-display">
                <span className="date-main">
                  {new Date(entry.date).toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="date-weekday">
                  {new Date(entry.date).toLocaleDateString('zh-CN', {
                    weekday: 'long'
                  })}
                </span>
                <span className="date-year">
                  {new Date(entry.date).getFullYear()}
                </span>
              </div>
            )}

            {entry.type === 'note' && (
                <div className="note-container">
                  <div className="editor-mode-toggle">
                    <button
                      type="button"
                      className={`mode-btn ${!isRichTextMode ? 'active' : ''}`}
                      onClick={() => setIsRichTextMode(false)}
                    >
                      纯文本
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${isRichTextMode ? 'active' : ''}`}
                      onClick={() => setIsRichTextMode(true)}
                    >
                      <Type size={14} />
                      富文本
                    </button>
                  </div>
                  
                  {!isRichTextMode ? (
                    <textarea 
                      className="editor-textarea page-mode"
                      placeholder={placeholderPrompt}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                    />
                  ) : (
                    <RichTextEditor
                      value={content}
                      onChange={setContent}
                      placeholder={placeholderPrompt}
                      className="rich-text-mode"
                    />
                  )}
                </div>
            )}

            {entry.type === 'learning' && (
            <div className="cornell-layout">
              <div className="cornell-main">
                <div className="cornell-cues">
                  <label className="cornell-label">
                    <Lightbulb size={16} />
                    线索 (Cues)
                  </label>
                  <textarea
                    className="cornell-textarea"
                    style={{ flex: 1 }}
                    placeholder="关键词、问题..."
                    value={cornellCues}
                    onChange={e => setCornellCues(e.target.value)}
                  />
                </div>
                <div className="cornell-notes">
                  <label className="cornell-label">
                    <BookOpen size={16} />
                    笔记 (Notes)
                  </label>
                  <textarea
                    className="cornell-textarea"
                    style={{ flex: 1 }}
                    placeholder="详细记录、定义、解释..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>
              </div>
              <div className="cornell-footer">
                <label className="cornell-label">
                  <Target size={16} />
                  总结 (Summary)
                </label>
                  <textarea
                    className="cornell-textarea"
                    style={{ height: '120px' }}
                    placeholder="用一两句话总结核心内容..."
                    value={cornellSummary}
                    onChange={e => setCornellSummary(e.target.value)}
                  />
              </div>
            </div>
          )}

          {entry.type === 'review' && (
            <div className="review-section">
              <div className="review-mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${!isRichTextMode ? 'active' : ''}`}
                  onClick={() => setIsRichTextMode(false)}
                >
                  结构化
                </button>
                <button
                  type="button"
                  className={`mode-btn ${isRichTextMode ? 'active' : ''}`}
                  onClick={() => setIsRichTextMode(true)}
                >
                  <Type size={14} />
                  富文本
                </button>
              </div>

              {!isRichTextMode ? (
                <>
                  <BulletListInput 
                    label="本周成就 (Done)"
                    icon={Trophy}
                    items={achievements}
                    onChange={setAchievements}
                    placeholder="完成了什么..."
                  />
                  <BulletListInput 
                    label="不足与挑战 (Challenges)"
                    icon={Target}
                    items={challenges}
                    onChange={setChallenges}
                    placeholder="遇到了什么问题..."
                  />
                  <BulletListInput 
                    label="下周计划 (Next Steps)"
                    icon={Calendar}
                    items={nextWeekPlan}
                    onChange={setNextWeekPlan}
                    placeholder="下周重点做什么..."
                  />
                </>
              ) : (
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="本周复盘总结..."
                  className="rich-text-mode"
                />
              )}
            </div>
          )}

            {/* Meta Info moved to bottom/side for less distraction */}
            <div className="editor-meta-bar">
              {entry.type === 'note' && (
                <div className="meta-group mood-group">
                  <div className="mood-selector compact">
                    <button
                      type="button"
                      className={`mood-chip mood-happy ${mood === 'good' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'good';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="开心"
                    >
                      <Smile size={18} />
                    </button>
                    <button
                      type="button"
                      className={`mood-chip mood-excited ${mood === 'excited' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'excited';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="激动"
                    >
                      <Zap size={18} />
                    </button>
                    <button
                      type="button"
                      className={`mood-chip mood-ok ${mood === 'ok' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'ok';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="平淡"
                    >
                      <Meh size={18} />
                    </button>
                    <button
                      type="button"
                      className={`mood-chip mood-tired ${mood === 'tired' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'tired';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="疲惫"
                    >
                      <Coffee size={18} />
                    </button>
                    <button
                      type="button"
                      className={`mood-chip mood-bad ${mood === 'bad' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'bad';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="难过"
                    >
                      <Frown size={18} />
                    </button>
                    <button
                      type="button"
                      className={`mood-chip mood-emo ${mood === 'emo' ? 'selected' : ''}`}
                      onClick={() => {
                        const nextMood = 'emo';
                        setMood(nextMood);
                        handleSave({ mood: nextMood });
                      }}
                      title="EMO"
                    >
                      <CloudRain size={18} />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="meta-divider-dot"></div>

              <div className="meta-group tags-group">
                <div className="tags-container compact">
                    <Tag size={14} className="tags-icon-indicator"/>
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
                        placeholder={tags.length === 0 ? "添加标签..." : "+"}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDownTag}
                        onBlur={() => {
                            if(tagInput.trim()) handleAddTag();
                        }}
                    />
                </div>
              </div>

              <div className="meta-divider-dot"></div>

              <div className="meta-group word-count-group">
                <div className="word-count-info">
                  <span className="word-count-text">
                    {calculateWordCount().total} 字
                  </span>
                  <span className="reading-time-text">
                    约 {calculateReadingTime()} 分钟
                  </span>
                </div>
              </div>
            </div>
            
            {/* Auto-generated Suggestions - Enhanced */}
            {suggestedTags.length > 0 && (
                <div className="suggested-tags-row">
                    <div className="suggestion-header">
                        <Sparkles size={14} className="suggestion-icon" />
                        <span className="suggestion-text">智能建议</span>
                    </div>
                    <div className="suggestion-chips">
                        {suggestedTags.map(tag => (
                            <button
                                type="button"
                                key={tag}
                                onClick={() => {
                                    if (!tags.includes(tag)) {
                                        const nextTags = [...tags, tag];
                                        setTags(nextTags);
                                        handleSave({ tags: nextTags });
                                    }
                                }}
                                className={`suggestion-chip ${tags.includes(tag) ? 'added' : ''}`}
                                title={tags.includes(tag) ? '已添加' : '点击添加'}
                            >
                                {tags.includes(tag) ? <Check size={12} /> : <Plus size={12} />}
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
