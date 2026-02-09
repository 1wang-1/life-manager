
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CheckSquare, BarChart2, Settings, Menu, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/useUIStore';
import './Sidebar.css';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/tasks', label: '任务', icon: CheckSquare },
  { path: '/calendar', label: '日记', icon: BookOpen },
  { path: '/stats', label: '复盘', icon: BarChart2 },
  { path: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const { isSidebarCollapsed: collapsed, isSidebarHidden, setSidebarCollapsed, toggleSidebar } = useUIStore();

  // Auto collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width-current',
      collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)'
    );
  }, [collapsed]);

  if (isSidebarHidden) return null;

  return (
    <aside className={clsx('sidebar', { collapsed })}>
      <div className="brand">
        <div className="logo-icon">GM</div>
        {!collapsed && <span className="brand-text">生成管理器</span>}
      </div>
      
      <nav className="nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx('nav-item', { active: isActive })}
          >
            <item.icon size={20} />
            {!collapsed && <span className="label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
      </div>
    </aside>
  );
}
