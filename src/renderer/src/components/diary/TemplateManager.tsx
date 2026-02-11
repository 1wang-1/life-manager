import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, FileText, Star, Clock, FolderOpen, Search } from 'lucide-react';
import './TemplateManager.css';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  isRichText: boolean;
  isFavorite: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  description?: string;
}

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 默认模板
  const defaultTemplates: Template[] = [
    {
      id: 'default-daily',
      name: '每日随记',
      content: '<h2>今天发生了什么有趣的事？</h2><p>记录下今天的点点滴滴...</p><h3>心情记录</h3><p>今天的心情如何？</p><h3>今日收获</h3><p>学到了什么新东西？</p><h3>明日计划</h3><p>明天有什么安排？</p>',
      category: 'daily',
      isRichText: true,
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['日常', '心情', '计划'],
      description: '适合日常记录和心情抒发'
    },
    {
      id: 'default-study',
      name: '学习总结',
      content: '<h2>学习内容</h2><p>今天学习了什么？</p><h3>关键知识点</h3><ul><li>要点1</li><li>要点2</li></ul><h3>实践应用</h3><p>如何应用到实际中？</p><h3>遇到的问题</h3><p>学习过程中遇到了什么困难？</p><h3>解决方案</h3><p>如何解决这些问题？</p>',
      category: 'study',
      isRichText: true,
      isFavorite: true,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['学习', '总结', '知识点'],
      description: '结构化的学习笔记模板'
    },
    {
      id: 'default-growth',
      name: '本周成长',
      content: '<h2>本周成就</h2><ul><li>完成了什么重要事项</li></ul><h2>学到的新技能</h2><p>掌握了什么新能力？</p><h2>需要改进的地方</h2><p>哪些方面还需要提升？</p><h2>下周目标</h2><ol><li>目标1</li><li>目标2</li></ol>',
      category: 'growth',
      isRichText: true,
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['成长', '复盘', '规划'],
      description: '周度成长复盘和计划模板'
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplates = () => {
    const savedTemplates = localStorage.getItem('diary-templates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      setTemplates(defaultTemplates);
      localStorage.setItem('diary-templates', JSON.stringify(defaultTemplates));
    }
  };

  const saveTemplates = (updatedTemplates: Template[]) => {
    setTemplates(updatedTemplates);
    localStorage.setItem('diary-templates', JSON.stringify(updatedTemplates));
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: '新模板',
      content: '',
      category: 'custom',
      isRichText: false,
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      description: ''
    };
    setEditingTemplate(newTemplate);
    setIsCreating(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    const updatedTemplates = isCreating
      ? [...templates, editingTemplate]
      : templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);

    saveTemplates(updatedTemplates);
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(updatedTemplates);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleSelectTemplate = (template: Template) => {
    // Increment usage count
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1, updatedAt: Date.now() }
        : t
    );
    saveTemplates(updatedTemplates);
    
    onSelectTemplate(template);
    onClose();
  };

  const toggleFavorite = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTemplates = templates.map(t =>
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    saveTemplates(updatedTemplates);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Sort by favorites first, then by usage count
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'daily', label: '日常' },
    { value: 'study', label: '学习' },
    { value: 'growth', label: '成长' },
    { value: 'custom', label: '自定义' }
  ];

  if (!isOpen) return null;

  return (
    <div className="template-manager-overlay">
      <div className="template-manager">
        <div className="template-manager-header">
          <h2>模板管理</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="template-manager-content">
          <div className="template-sidebar">
            <div className="template-actions">
              <button className="create-btn" onClick={handleCreateTemplate}>
                <Plus size={16} />
                新建模板
              </button>
            </div>

            <div className="template-filters">
              <div className="search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="搜索模板名称、内容、标签..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="template-list">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`template-item ${editingTemplate?.id === template.id ? 'active' : ''}`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="template-info">
                    <div className="template-header">
                      <div className="template-name">
                        <FileText size={14} />
                        {template.name}
                        {template.isRichText && <span className="rich-text-badge">富文本</span>}
                      </div>
                      <button
                        className={`favorite-btn ${template.isFavorite ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(template.id, e)}
                        title={template.isFavorite ? '取消收藏' : '收藏'}
                      >
                        <Star size={14} fill={template.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    {template.description && (
                      <div className="template-description">{template.description}</div>
                    )}
                    <div className="template-meta">
                      <span className="template-category">
                        <FolderOpen size={12} />
                        {categories.find(c => c.value === template.category)?.label}
                      </span>
                      <span className="template-usage">
                        <Clock size={12} />
                        使用 {template.usageCount} 次
                      </span>
                    </div>
                    {template.tags && template.tags.length > 0 && (
                      <div className="template-tags">
                        {template.tags.map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="template-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="action-btn"
                      onClick={() => handleEditTemplate(template)}
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="template-editor">
            {editingTemplate ? (
              <div className="template-form">
                <div className="form-header">
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      name: e.target.value
                    })}
                    className="template-name-input"
                    placeholder="模板名称"
                  />
                  
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      category: e.target.value
                    })}
                    className="template-category-select"
                  >
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-meta">
                  <input
                    type="text"
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      description: e.target.value
                    })}
                    className="template-description-input"
                    placeholder="模板描述（可选）"
                  />
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingTemplate.isRichText}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        isRichText: e.target.checked
                      })}
                    />
                    启用富文本格式
                  </label>
                </div>

                <textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    content: e.target.value
                  })}
                  className="template-content-input"
                  placeholder={editingTemplate.isRichText ? "使用HTML标签编写富文本模板..." : "模板内容..."}
                  rows={15}
                />

                {editingTemplate.isRichText && (
                  <div className="rich-text-help">
                    <h4>富文本模板提示：</h4>
                    <ul>
                      <li>使用 &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt; 等标签创建标题</li>
                      <li>使用 &lt;strong&gt; 或 &lt;b&gt; 创建粗体</li>
                      <li>使用 &lt;em&gt; 或 &lt;i&gt; 创建斜体</li>
                      <li>使用 &lt;ul&gt; 和 &lt;li&gt; 创建列表</li>
                      <li>使用 &lt;p&gt; 标签分段</li>
                    </ul>
                  </div>
                )}

                <div className="form-actions">
                  <button className="save-btn" onClick={handleSaveTemplate}>
                    <Save size={16} />
                    保存
                  </button>
                  <button className="cancel-btn" onClick={() => {
                    setEditingTemplate(null);
                    setIsCreating(false);
                  }}>
                    <X size={16} />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="template-preview">
                <div className="preview-placeholder">
                  <FileText size={48} />
                  <p>选择一个模板进行预览或编辑</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;