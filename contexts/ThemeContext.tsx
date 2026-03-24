
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// --- Types ---
export interface ThemeColors {
  bg: string;      // --bg-main
  surface: string; // --surface-panel
  text: string;    // --text-main
  accent: string;  // --accent-primary
  muted: string;   // Derived for existing app compatibility
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;      // Commits the theme (saves to local storage)
  previewTheme: (theme: Theme) => void;  // Instantly applies to DOM without saving
  themes: Theme[];
  // Extended properties for UI components
  colors: ThemeColors;
  presets: Theme[];
  setCustomAccent: (color: string) => void;
  applyPreset: (name: string) => void;
}

// --- Themes Data ---
const THEMES: Theme[] = [
  {
    id: 'custom',
    name: 'Custom Theme',
    colors: { bg: '#0a0a0a', surface: '#1a1a1a', text: '#f5f5f5', accent: '#3b82f6', muted: '#a3a3a3' }
  },
  // --- Mixed Themes ---
  {
    id: 'oled',
    name: 'OLED Default',
    colors: { bg: '#000000', surface: '#0a0a0a', text: '#ffffff', accent: '#00e5ff', muted: '#d4d4d8' }
  },
  {
    id: 'paper',
    name: 'Paper White',
    colors: { bg: '#ffffff', surface: '#f3f4f6', text: '#111827', accent: '#3b82f6', muted: '#4b5563' }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    colors: { bg: '#020402', surface: '#0D1F12', text: '#00FF41', accent: '#00FF41', muted: '#00cc33' }
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    colors: { bg: '#1d2021', surface: '#282828', text: '#fbf1c7', accent: '#fabd2f', muted: '#a89984' }
  },
  {
    id: 'sepia',
    name: 'Soft Sepia',
    colors: { bg: '#f4ecd8', surface: '#e6dec9', text: '#5b4636', accent: '#8b4513', muted: '#8b7355' }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: { bg: '#282a36', surface: '#343746', text: '#f8f8f2', accent: '#ff79c6', muted: '#bdc3e1' }
  },
  {
    id: 'matcha',
    name: 'Matcha Latte',
    colors: { bg: '#f0f4f0', surface: '#e0e8e0', text: '#2d3a2d', accent: '#4a7c44', muted: '#5a6b5a' }
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: { bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0', muted: '#a3be8c' }
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    colors: { bg: '#2d2a2e', surface: '#403e41', text: '#fcfcfa', accent: '#ffd866', muted: '#c1c0c1' }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    colors: { bg: '#fdf6e3', surface: '#eee8d5', text: '#657b83', accent: '#268bd2', muted: '#586e75' }
  },
  {
    id: 'solarized',
    name: 'Solarized Dark',
    colors: { bg: '#002b36', surface: '#073642', text: '#93a1a1', accent: '#2aa198', muted: '#93a1a1' }
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    colors: { bg: '#1a1b26', surface: '#24283b', text: '#c0caf5', accent: '#7aa2f7', muted: '#a9b1d6' }
  },
  {
    id: 'rose',
    name: 'Rose Water',
    colors: { bg: '#fff5f7', surface: '#ffeef2', text: '#4a2d36', accent: '#e91e63', muted: '#6d4c56' }
  },
  {
    id: 'nord-light',
    name: 'Nord Light',
    colors: { bg: '#e5e9f0', surface: '#d8dee9', text: '#2e3440', accent: '#5e81ac', muted: '#2e3440' }
  },
  {
    id: 'synthwave',
    name: 'Synthwave 84',
    colors: { bg: '#2b213a', surface: '#1f1929', text: '#f0efff', accent: '#ff71ce', muted: '#b5b1d1' }
  },
  {
    id: 'vercel',
    name: 'Vercel Dark',
    colors: { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffffff', muted: '#888888' }
  },
  {
    id: 'oceanic',
    name: 'Oceanic Next',
    colors: { bg: '#1b2b34', surface: '#343d46', text: '#d8dee9', accent: '#6699cc', muted: '#c0c5ce' }
  },
  {
    id: 'firewatch',
    name: 'Firewatch',
    colors: { bg: '#1c1315', surface: '#2d1f22', text: '#eae1dc', accent: '#eb5e28', muted: '#d6c9c4' }
  },
  // --- High-Contrast & Terminal Themes ---
  {
    id: 'phosphor-amber',
    name: 'Phosphor Amber',
    colors: { bg: '#100C03', surface: '#1F1805', text: '#FFB000', accent: '#FFCC00', muted: '#cc8800' }
  },
  {
    id: 'crimson-ops',
    name: 'Crimson Ops',
    colors: { bg: '#0A0202', surface: '#1A0505', text: '#FF8888', accent: '#FF0033', muted: '#ff4444' }
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    colors: { bg: '#0d1b2a', surface: '#1b263b', text: '#e0e1dd', accent: '#4cc9f0', muted: '#a9bccd' }
  },
  {
    id: 'toxic',
    name: 'Toxic Waste',
    colors: { bg: '#080A04', surface: '#141A0A', text: '#D4FF80', accent: '#A6FF00', muted: '#88b039' }
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    colors: { bg: '#012456', surface: '#003B73', text: '#FFFFFF', accent: '#F9F1A5', muted: '#cccccc' }
  },
  {
    id: 'zenith',
    name: 'Zenith Mono',
    colors: { bg: '#000000', surface: '#121212', text: '#FFFFFF', accent: '#FFFFFF', muted: '#666666' }
  },
  {
    id: 'miami-nights',
    name: 'Miami Nights',
    colors: { bg: '#0d0e15', surface: '#161821', text: '#e0faff', accent: '#ff0055', muted: '#bdbfe3' }
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    colors: { bg: '#0c120c', surface: '#162616', text: '#c2e0c2', accent: '#2ecc71', muted: '#a8c1a8' }
  },
  {
    id: 'royal',
    name: 'Royal Void',
    colors: { bg: '#0d0814', surface: '#1a1029', text: '#ebd9ff', accent: '#9d4edd', muted: '#c4b1d9' }
  },
  {
    id: 'volcano',
    name: 'Volcanic Ash',
    colors: { bg: '#120505', surface: '#240a0a', text: '#e8d5d5', accent: '#ff4500', muted: '#d1b8b8' }
  }
];

// --- Helpers ---
const hexToRgb = (hex: string): string => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '0 0 0';
};

const isLightColor = (hex: string) => {
  const rgb = hexToRgb(hex).split(' ').map(Number);
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 155; // Threshold for "light"
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState<Theme>(THEMES[0]);

  // Function to apply CSS variables to DOM
  const applyColorsToDom = useCallback((theme: Theme) => {
    const root = document.documentElement;
    const { colors } = theme;

    // 1. Set the specific variables requested in the prompt
    root.style.setProperty('--bg-main', colors.bg);
    root.style.setProperty('--surface-panel', colors.surface);
    root.style.setProperty('--text-main', colors.text);
    root.style.setProperty('--accent-primary', colors.accent);

    // 2. Map to existing app's Tailwind variables (using RGB triplets)
    root.style.setProperty('--color-bg', hexToRgb(colors.bg));
    root.style.setProperty('--color-surface', hexToRgb(colors.surface));
    root.style.setProperty('--color-text-main', hexToRgb(colors.text));
    root.style.setProperty('--color-accent', hexToRgb(colors.accent));
    root.style.setProperty('--color-text-muted', hexToRgb(colors.muted));
    root.style.setProperty('--color-border', hexToRgb(colors.text)); // Derived border

    // 3. Toggle dark class for Tailwind
    if (isLightColor(colors.bg)) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, []);

  // Load from local storage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('statforge-theme-id');
    const savedAccent = localStorage.getItem('statforge-custom-accent');
    
    let theme = THEMES.find(t => t.id === savedId) || THEMES[0];
    
    if (savedId === 'custom' && savedAccent) {
      theme = {
        ...theme,
        id: 'custom',
        colors: { ...theme.colors, accent: savedAccent }
      };
    }
    
    setCurrentThemeState(theme);
    applyColorsToDom(theme);
  }, [applyColorsToDom]);

  // Permanently set theme
  const setTheme = useCallback((theme: Theme) => {
    setCurrentThemeState(theme);
    applyColorsToDom(theme);
    localStorage.setItem('statforge-theme-id', theme.id);
    if (theme.id === 'custom') {
      localStorage.setItem('statforge-custom-accent', theme.colors.accent);
    }
  }, [applyColorsToDom]);

  // Temporary preview (for hover/arrow keys)
  const previewTheme = useCallback((theme: Theme) => {
    applyColorsToDom(theme);
  }, [applyColorsToDom]);

  const setCustomAccent = useCallback((color: string) => {
    const customTheme: Theme = {
      ...currentTheme,
      id: 'custom',
      colors: { ...currentTheme.colors, accent: color }
    };
    setCurrentThemeState(customTheme);
    applyColorsToDom(customTheme);
  }, [currentTheme, applyColorsToDom]);

  const applyPreset = useCallback((name: string) => {
    const theme = THEMES.find(t => t.name === name);
    if (theme) setTheme(theme);
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      previewTheme, 
      themes: THEMES,
      colors: currentTheme.colors,
      presets: THEMES,
      setCustomAccent,
      applyPreset
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
