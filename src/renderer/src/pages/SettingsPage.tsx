
import { useEffect, useState } from 'react';
import { useSettingsStore, TimerMode } from '../store/useSettingsStore';
import { RefreshCw, Clock, Monitor, Palette, Moon, Sun, Check, Laptop, Database } from 'lucide-react';
import { THEME_PRESETS } from '../utils/theme';
import '../App.css';
import './SettingsPage.css';
import clsx from 'clsx';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [dataDir, setDataDir] = useState<string>('');
  const [isPickingDataDir, setIsPickingDataDir] = useState(false);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ defaultTimerMode: e.target.value as TimerMode });
  };

  useEffect(() => {
    if (!window.api?.app?.getDataDir) return;
    window.api.app.getDataDir().then(setDataDir).catch(() => setDataDir(''));
  }, []);

  const handlePickDataDir = async () => {
    if (!window.api?.app?.pickDataDir) return;
    if (isPickingDataDir) return;
    setIsPickingDataDir(true);
    try {
      const next = await window.api.app.pickDataDir();
      if (typeof next === 'string' && next.trim()) setDataDir(next);
    } finally {
      setIsPickingDataDir(false);
    }
  };

  return (
    <div className="page-container settings-page">
      <header className="page-header settings-header">
        <div className="header-content">
          <h1 className="page-title">设置</h1>
          <p className="page-subtitle">管理您的偏好设置和个性化体验</p>
        </div>
      </header>

      <div className="settings-content-area">
        <div className="settings-dashboard">
          {/* Appearance Card - New! */}
          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon">
                <Palette size={20} />
              </div>
              <h3>外观与主题</h3>
            </div>
            
            <div className="card-body">
              <div className="form-group">
                <label>主题模式</label>
                <div className="settings-theme-pills">
                  <button
                    className={clsx('settings-theme-pill', { active: settings.theme === 'light' })}
                    onClick={() => updateSettings({ theme: 'light' })}
                  >
                    <Sun size={20} />
                    <span>浅色</span>
                  </button>
                  <button
                    className={clsx('settings-theme-pill', { active: settings.theme === 'dark' })}
                    onClick={() => updateSettings({ theme: 'dark' })}
                  >
                    <Moon size={20} />
                    <span>深色</span>
                  </button>
                  <button
                    className={clsx('settings-theme-pill', { active: settings.theme === 'system' })}
                    onClick={() => updateSettings({ theme: 'system' })}
                  >
                    <Laptop size={20} />
                    <span>跟随系统</span>
                  </button>
                </div>
              </div>

              <div className="setting-divider" style={{ margin: '8px 0', borderTop: '1px solid var(--gray-100)' }}></div>

              <div className="form-group">
                <label>主题色</label>
                <div className="theme-grid">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      className={clsx('theme-option', { active: settings.themeColor === preset.key })}
                      onClick={() => updateSettings({ themeColor: preset.key })}
                    >
                      <div 
                        className="color-preview" 
                        style={{ backgroundColor: preset.color }}
                      >
                        {settings.themeColor === preset.key && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      <span className="color-label">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Focus Settings Card */}
          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon">
                <Clock size={20} />
              </div>
              <h3>专注设置</h3>
            </div>
            
            <div className="card-body">
              <div className="form-group">
                <label>默认计时模式</label>
                <div className="select-wrapper">
                  <select 
                    value={settings.defaultTimerMode} 
                    onChange={handleModeChange}
                    className="input-field"
                  >
                    <option value="stopwatch">正向计时 (Stopwatch)</option>
                    <option value="countdown">倒数计时 (Countdown)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>倒计时默认专注时长</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={settings.countdownDefaultFocusMinutes}
                  onChange={(e) => updateSettings({ countdownDefaultFocusMinutes: Number(e.target.value) })}
                  className="input-field"
                  placeholder="例如：25"
                />
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.autoBreak}
                    onChange={(e) => updateSettings({ autoBreak: e.target.checked })}
                  />
                  <div className="checkbox-text">
                    <span className="primary-text">专注结束后自动进入休息</span>
                    <span className="secondary-text">适用于倒数/正向的结束或完成</span>
                  </div>
                </label>
              </div>

              <div className="setting-divider" style={{ margin: '12px 0', borderTop: '1px solid var(--gray-100)' }}></div>

              <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.focusFeedbackEnabled}
                    onChange={(e) => updateSettings({ 
                      focusFeedbackEnabled: e.target.checked,
                      focusFeedbackAutoPrompt: e.target.checked,
                      focusFeedbackWriteToWeeklyReview: e.target.checked
                    })}
                  />
                  <div className="checkbox-text">
                    <span className="primary-text">开启专注反馈</span>
                    <span className="secondary-text">专注完成后自动弹出反馈，并记录到周报</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* App Preferences Card */}
          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon">
                <Monitor size={20} />
              </div>
              <h3>应用偏好</h3>
            </div>
            
            <div className="card-body">
              <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={settings.desktopNotify}
                    onChange={(e) => updateSettings({ desktopNotify: e.target.checked })}
                  />
                  <div className="checkbox-text">
                    <span className="primary-text">开启桌面通知</span>
                    <span className="secondary-text">专注完成时发送系统通知</span>
                  </div>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.endSound || settings.taskSoundEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      updateSettings({ 
                        endSound: enabled,
                        taskSoundEnabled: enabled 
                      });
                    }}
                  />
                  <div className="checkbox-text">
                    <span className="primary-text">开启提示音效</span>
                    <span className="secondary-text">任务完成或计时结束时播放提示音</span>
                  </div>
                </label>

                {(settings.taskSoundEnabled || settings.endSound) && (
                  <div className="form-group" style={{ marginLeft: '34px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                      音量调节 ({Math.round(settings.taskSoundVolume * 100)}%)
                    </label>
                    <div className="range-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.taskSoundVolume}
                        onChange={(e) => {
                          updateSettings({ taskSoundVolume: parseFloat(e.target.value) });
                        }}
                        className="range-input"
                      />
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          import('../utils/sound').then(({ playTaskCompletionSound }) => {
                            playTaskCompletionSound();
                          });
                        }}
                        title="试听任务完成"
                        style={{ padding: '4px 8px', height: 'auto' }}
                      >
                        🔊
                      </button>

                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          import('../utils/sound').then(({ playTimerCompletionSound }) => {
                            playTimerCompletionSound(false);
                          });
                        }}
                        title="试听计时完成"
                        style={{ padding: '4px 8px', height: 'auto' }}
                      >
                        ⏱
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon">
                <Database size={20} />
              </div>
              <h3>数据存储</h3>
            </div>

            <div className="card-body">
              <div className="form-group">
                <label>存储位置</label>
                <div className="path-display">{dataDir || '—'}</div>
              </div>

              <button className="btn btn-neutral" onClick={handlePickDataDir} disabled={isPickingDataDir}>
                {isPickingDataDir ? '请选择…' : '更改存储位置'}
              </button>

              <div className="secondary-text">将复制数据库与日志到新位置（旧位置不会删除）。</div>
            </div>
          </section>
        </div>

        <div className="page-actions">
          <button 
            className="btn btn-ghost" 
            style={{ color: 'var(--error-500)' }}
            onClick={() => {
              if(confirm('确定要恢复默认设置吗？')) resetSettings();
            }}
          >
            <RefreshCw size={16} />
            恢复默认设置
          </button>
        </div>
      </div>
    </div>
  );
}
