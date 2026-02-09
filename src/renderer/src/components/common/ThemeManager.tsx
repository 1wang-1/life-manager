
import { useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { generateTheme, PRESET_COLORS } from '../../utils/theme';

export function ThemeManager() {
  const { settings } = useSettingsStore();
  const { themeColor } = settings;

  useEffect(() => {
    // Determine the primary hex color
    let primaryHex = PRESET_COLORS[themeColor] || themeColor;

    if (!primaryHex || !primaryHex.startsWith('#')) {
      primaryHex = PRESET_COLORS.orange;
    }

    const palette = generateTheme(primaryHex);
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-primary-rgb', palette.primaryRgb);
    root.style.setProperty('--color-on-primary', palette.onPrimary);
    root.style.setProperty('--color-primary-soft', palette.primarySoft);
    root.style.setProperty('--color-primary-light', palette.primaryLight);
    root.style.setProperty('--color-primary-hover', palette.primaryHover);
    root.style.setProperty('--color-primary-active', palette.primaryActive);
    root.style.setProperty('--color-primary-dark', palette.primaryDark);
    root.style.setProperty('--color-primary-light-bg', palette.primaryLightBg);
    
    root.style.setProperty('--shadow-primary', `0 4px 12px rgba(${palette.primaryRgb}, 0.25)`);

  }, [themeColor]);

  // Handle Dark/Light Mode
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const isSystemDark = mediaQuery.matches;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);
      
      if (isDark) {
        root.classList.add('dark');
        // Optional: Set color-scheme for scrollbars etc.
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();

    // Listen for system changes
    const listener = () => {
      if (settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [settings.theme]);


  return null; // Logic only component
}
