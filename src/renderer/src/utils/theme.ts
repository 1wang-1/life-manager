// Helper functions for color manipulation
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  let r = Math.floor(rgb.r * (1 + percent / 100));
  let g = Math.floor(rgb.g * (1 + percent / 100));
  let b = Math.floor(rgb.b * (1 + percent / 100));

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  return rgbToHex(r, g, b);
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  
  // Calculate relative luminance
  const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
  return (yiq >= 128) ? '#1E2A3B' : '#FFFFFF';
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export type ThemeColorKey = 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'cyan' | 'red' | 'indigo' | 'black' | 'custom';

export interface ThemePalette {
  primary: string;
  onPrimary: string;
  primarySoft: string;
  primaryLight: string; // New: Lighter version for gradients
  primaryHover: string;
  primaryActive: string;
  primaryDark: string;
  primaryLightBg: string;
  primaryRgb: string; // for CSS vars that need separate RGB values
}

export const PRESET_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  orange: '#FFB800',
  green: '#22c55e',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  red: '#ef4444',
  indigo: '#6366f1',
  black: '#171717',
};

export const THEME_LABELS: Record<string, string> = {
  orange: '活力橙',
  blue: '科技蓝',
  green: '清新绿',
  purple: '优雅紫',
  pink: '少女粉',
  cyan: '天空青',
  red: '热情红',
  indigo: '深邃靛',
  black: '极夜黑',
};

export const generateTheme = (primaryColor: string): ThemePalette => {
  const rgb = hexToRgb(primaryColor) || { r: 0, g: 0, b: 0 };
  
  return {
    primary: primaryColor,
    onPrimary: getContrastColor(primaryColor),
    // Soft: 12% opacity on white background (effectively mixing with white)
    // We'll use rgba for the variable to allow overlaying, or mix it if we want solid
    primarySoft: hexToRgba(primaryColor, 0.12), 
    primaryLight: adjustBrightness(primaryColor, 15), // 15% lighter
    primaryHover: adjustBrightness(primaryColor, -10), // 10% darker
    primaryActive: adjustBrightness(primaryColor, -15), // 15% darker
    primaryDark: adjustBrightness(primaryColor, -20), // 20% darker for text/borders
    primaryLightBg: hexToRgba(primaryColor, 0.08), // Very light background (8% opacity)
    primaryRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`
  };
};

export { adjustBrightness, hexToRgb, rgbToHex, getContrastColor, hexToRgba };

export const THEME_PRESETS = Object.entries(PRESET_COLORS).map(([key, value]) => ({
  key: key as ThemeColorKey,
  color: value,
  label: THEME_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}));
