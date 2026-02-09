import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { TaskItem } from '../../store/useTaskStore';
import { TaskCard } from './TaskCard';
import './TaskDrawer.css';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: TaskItem[];
}

export function TaskDrawer({ isOpen, onClose, title, tasks }: TaskDrawerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // match animation duration
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return createPortal(
    <div className={`task-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div 
        className={`task-drawer-panel ${isOpen ? 'open' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="task-drawer-header">
          <div className="drawer-title-group">
            <Calendar size={20} className="drawer-icon" />
            <h2>{title}</h2>
            <span className="task-count-badge">{tasks.length}</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="task-drawer-content">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>当天没有安排任务</p>
            </div>
          ) : (
            <div className="drawer-task-list">
              {tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  variant="list" 
                  onEdit={() => {}} // No-op
                  readOnly={true} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
