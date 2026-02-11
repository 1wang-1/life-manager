import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link, 
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Table,
  Heading1,
  Heading2,
  Heading3,
  X,
  Download,
  Upload,
  FileDown
} from 'lucide-react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '开始输入...',
  className = '',
  onBlur
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isMarkdownMenuOpen, setIsMarkdownMenuOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
    editorRef.current?.focus();
  };

  const handleTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    handleInput();
    editorRef.current?.focus();
    setIsColorPickerOpen(false);
  };

  const handleHighlight = (color: string) => {
    document.execCommand('hiliteColor', false, color);
    handleInput();
    editorRef.current?.focus();
    setIsColorPickerOpen(false);
  };

  const handleHeading = (level: number) => {
    document.execCommand('formatBlock', false, `h${level}`);
    handleInput();
    editorRef.current?.focus();
  };

  const handleTable = () => {
    const table = `
<table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;">单元格1</td>
    <td style="border: 1px solid #ccc; padding: 8px;">单元格2</td>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px;">单元格3</td>
    <td style="border: 1px solid #ccc; padding: 8px;">单元格4</td>
  </tr>
</table>
    `.trim();
    document.execCommand('insertHTML', false, table);
    handleInput();
    editorRef.current?.focus();
  };

  // HTML to Markdown conversion
  const htmlToMarkdown = (html: string): string => {
    let markdown = html;
    
    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
    
    // Bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // Strikethrough
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
    
    // Code
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
    markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n');
    
    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_match, p1) => {
      const lines = p1.trim().split('\n');
      return lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n';
    });
    
    // Lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match, p1) => {
      const items = p1.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      return items.map((item: string) => {
        const content = item.replace(/<[^>]*>/g, '');
        return `- ${content.trim()}`;
      }).join('\n') + '\n\n';
    });
    
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, p1) => {
      const items = p1.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      return items.map((item: string, index: number) => {
        const content = item.replace(/<[^>]*>/g, '');
        return `${index + 1}. ${content.trim()}`;
      }).join('\n') + '\n\n';
    });
    
    // Line breaks and paragraphs
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/p>/gi, '\n\n');
    markdown = markdown.replace(/<p[^>]*>/gi, '');
    
    // Clean up remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    // Clean up excessive whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();
    
    return markdown;
  };

  // Markdown to HTML conversion (basic)
  const markdownToHtml = (markdown: string): string => {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />');
    
    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Lists
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    
    // Wrap lists in proper tags
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  };

  const exportToMarkdown = () => {
    const markdown = htmlToMarkdown(value);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importMarkdown = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const markdown = e.target?.result as string;
          const html = markdownToHtml(markdown);
          onChange(html);
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setIsMarkdownMenuOpen(false);
  };

  const handleFormat = (command: string) => {
    execCommand(command);
  };

  const handleList = (ordered: boolean) => {
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    execCommand(command);
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setLinkText(selection.toString());
      setIsLinkModalOpen(true);
    } else {
      setLinkText('');
      setIsLinkModalOpen(true);
    }
  };

  const insertLink = () => {
    if (linkUrl) {
      if (linkText) {
        const selection = window.getSelection();
        if (selection) {
          const range = selection.getRangeAt(0);
          const link = document.createElement('a');
          link.href = linkUrl;
          link.textContent = linkText;
          link.target = '_blank';
          range.deleteContents();
          range.insertNode(link);
        }
      } else {
        execCommand('createLink', linkUrl);
      }
      handleInput();
    }
    setIsLinkModalOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processImageFile(file, imageSize);
      }
    };
    input.click();
  };

  const processImageFile = (file: File, size: 'small' | 'medium' | 'large' = 'medium') => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgDataUrl = e.target?.result as string;
        setSelectedImage(imgDataUrl);
        setImageSize(size);
        setIsImageModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const insertImageWithSize = () => {
    if (!selectedImage) return;

    const sizeStyles = {
      small: 'max-width: 200px;',
      medium: 'max-width: 400px;',
      large: 'max-width: 100%;'
    };

    const img = `<img src="${selectedImage}" alt="插入的图片" style="${sizeStyles[imageSize]} height: auto; border-radius: 8px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" />`;
    
    // 使用 pasteHTML 而不是 insertHTML，并确保更新状态
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = img;
        range.insertNode(div.firstChild || div);
      } else {
        // 如果没有选区，直接追加到内容末尾
        editorRef.current.innerHTML += img;
      }
      
      // 确保状态更新
      setTimeout(() => {
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }, 0);
    }
    
    setIsImageModalOpen(false);
    setSelectedImage('');
    setImageSize('medium');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editorRef.current) {
      editorRef.current.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editorRef.current) {
      editorRef.current.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editorRef.current) {
      editorRef.current.classList.remove('drag-over');
    }
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => processImageFile(file));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
      });
    }
  };

  const handleAlign = (alignment: 'left' | 'center' | 'right') => {
    execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      execCommand('insertText', '    ');
    }
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      <div className="rich-text-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleFormat('bold')}
            title="加粗 (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleFormat('italic')}
            title="斜体 (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleFormat('underline')}
            title="下划线 (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleFormat('strikeThrough')}
            title="删除线"
          >
            <Strikethrough size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleList(false)}
            title="无序列表"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleList(true)}
            title="有序列表"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => document.execCommand('formatBlock', false, 'blockquote') || handleInput()}
            title="引用"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => document.execCommand('formatBlock', false, 'pre') || handleInput()}
            title="代码块"
          >
            <Code size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleHeading(1)}
            title="标题1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleHeading(2)}
            title="标题2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleHeading(3)}
            title="标题3"
          >
            <Heading3 size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <div className="color-picker-wrapper">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
              title="文字颜色"
            >
              <Palette size={16} />
            </button>
            {isColorPickerOpen && (
              <div className="color-picker-popup">
                <div className="color-picker-section">
                  <div className="color-label">文字颜色</div>
                  <div className="color-options">
                    {['#000000', 'var(--color-primary)', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map(color => (
                      <button
                        key={color}
                        className="color-option"
                        style={{ backgroundColor: color === 'var(--color-primary)' ? 'var(--color-primary)' : color }}
                        onClick={() => handleTextColor(color === 'var(--color-primary)' ? 'var(--color-primary)' : color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="color-picker-section">
                  <div className="color-label">背景高亮</div>
                  <div className="color-options">
                    {['transparent', 'var(--color-primary-light)', '#00ff00', '#ff9900', '#99ccff', '#ffcc99', '#ccffcc', '#ffcccc'].map(color => (
                      <button
                        key={color}
                        className="color-option highlight"
                        style={{ backgroundColor: color === 'transparent' ? '#fff' : (color === 'var(--color-primary-light)' ? 'var(--color-primary-light)' : color) }}
                        onClick={() => handleHighlight(color === 'var(--color-primary-light)' ? 'var(--color-primary-light)' : color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="toolbar-btn"
            onClick={handleTable}
            title="插入表格"
          >
            <Table size={16} />
          </button>
        </div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleAlign('left')}
            title="左对齐"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleAlign('center')}
            title="居中对齐"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => handleAlign('right')}
            title="右对齐"
          >
            <AlignRight size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={handleLink}
            title="插入链接"
          >
            <Link size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={handleImage}
            title="插入图片"
          >
            <Image size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <div className="markdown-menu-wrapper">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setIsMarkdownMenuOpen(!isMarkdownMenuOpen)}
              title="Markdown 导入/导出"
            >
              <FileDown size={16} />
            </button>
            {isMarkdownMenuOpen && (
              <div className="markdown-menu-popup">
                <button
                  type="button"
                  className="markdown-menu-item"
                  onClick={exportToMarkdown}
                >
                  <Download size={14} />
                  导出为 Markdown
                </button>
                <button
                  type="button"
                  className="markdown-menu-item"
                  onClick={importMarkdown}
                >
                  <Upload size={14} />
                  导入 Markdown
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        onInput={handleInput}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />

      {isLinkModalOpen && (
        <div className="link-modal-overlay">
          <div className="link-modal">
            <h3>插入链接</h3>
            <input
              type="text"
              placeholder="链接文本"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="link-input"
            />
            <input
              type="url"
              placeholder="链接地址 (https://...)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="link-input"
              autoFocus
            />
            <div className="link-modal-buttons">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={insertLink}
                disabled={!linkUrl}
              >
                插入
              </button>
            </div>
          </div>
        </div>
      )}

      {isImageModalOpen && (
        <div className="image-modal-overlay">
          <div className="image-modal">
            <div className="image-modal-header">
              <h3>图片预览与设置</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setIsImageModalOpen(false);
                  setSelectedImage('');
                  setImageSize('medium');
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="image-preview-container">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="预览" 
                  className="image-preview"
                  style={{ 
                    maxWidth: imageSize === 'small' ? '200px' : imageSize === 'medium' ? '400px' : '100%',
                    height: 'auto'
                  }}
                />
              )}
            </div>

            <div className="image-size-selector">
              <label className="size-label">图片尺寸:</label>
              <div className="size-options">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    className={`size-option ${imageSize === size ? 'active' : ''}`}
                    onClick={() => setImageSize(size)}
                  >
                    {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>

            <div className="image-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setIsImageModalOpen(false);
                  setSelectedImage('');
                  setImageSize('medium');
                }}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={insertImageWithSize}
              >
                插入图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;