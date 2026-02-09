
import { ReactNode } from 'react';
import clsx from 'clsx';
import { Sidebar } from '../components/common/Sidebar';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={clsx('main-layout', className)}>
      <Sidebar />
      <main className="main-content custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
