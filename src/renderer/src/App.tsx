
import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import MiniTimerPage from './pages/MiniTimerPage';
import PetPage from './pages/PetPage';
import FocusPage from './pages/FocusPage';
import CalendarPage from './pages/CalendarPage';
import DesignSystemPage from './pages/DesignSystemPage';
import FloatingTimer from './components/FloatingTimer';
import { GlobalToast, StopConfirmSheet } from './components/common/FocusSummary';
import { useTimerStore } from './store/useTimerStore';
import { useTaskStore } from './store/useTaskStore';
import { ThemeManager } from './components/common/ThemeManager';
import { timerService } from './services/TimerService';
import './App.css';

function App() {
  const fetchTasks = useTaskStore((state) => state.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!window.api?.timer?.onCommand) return;
    return window.api.timer.onCommand((command) => {
      if (command.type === 'toggle') {
        const { status } = useTimerStore.getState();
        if (status === 'running') timerService.pauseTimer();
        else timerService.startTimer();
      } else if (command.type === 'stop') {
        timerService.requestStopTimer({ fromMini: command.fromMini });
      } else if (command.type === 'showMain') {
        window.focus();
      } else if (command.type === 'extendBreak') {
        timerService.extendBreak(Math.max(1, Math.floor(command.minutes || 5)));
      } else if (command.type === 'clearSummary') {
        useTimerStore.getState().setShowSummary(false);
      }
    });
  }, []);

  return (
    <HashRouter>
      <ThemeManager />
      <AppContent />
      <GlobalToast />
      <StopConfirmSheet />
    </HashRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isMini = location.pathname === '/mini';
  const isPet = location.pathname === '/pet';
  const isFocusPage = location.pathname === '/focus';

  if (isMini) {
    return <MiniTimerPage />;
  }

  if (isPet) {
    return <PetPage />;
  }

  if (isFocusPage) {
    return (
      <MainLayout>
        <FocusPage />
      </MainLayout>
    );
  }

  const showFloatingTimer = location.pathname !== '/';

  return (
    <MainLayout className={undefined}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignSystemPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showFloatingTimer && <FloatingTimer />}
    </MainLayout>
  );
}

export default App;
