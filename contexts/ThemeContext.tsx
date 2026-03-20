
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
    colors: { bg: '#0a0a0a', surface: '#1a1a1a', text: '#f5f5f5', accent: '#3b82f6', muted: '#737373' }
  },
  // --- Mixed Themes ---
  {
    id: 'oled',
    name: 'OLED Default',
    colors: { bg: '#000000', surface: '#111111', text: '#E4E4E7', accent: '#00E5FF', muted: '#71717A' }
  },
  {
    id: 'paper',
    name: 'Paper White',
    colors: { bg: '#ffffff', surface: '#f3f4f6', text: '#111827', accent: '#3b82f6', muted: '#6b7280' }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    colors: { bg: '#020402', surface: '#0D1F12', text: '#00FF41', accent: '#00FF41', muted: '#008F11' }
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox Dark',
    colors: { bg: '#282828', surface: '#3c3836', text: '#ebdbb2', accent: '#fabd2f', muted: '#a89984' }
  },
  {
    id: 'sepia',
    name: 'Soft Sepia',
    colors: { bg: '#f4ecd8', surface: '#e6dec9', text: '#5b4636', accent: '#8b4513', muted: '#a69076' }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: { bg: '#282a36', surface: '#44475a', text: '#f8f8f2', accent: '#ff79c6', muted: '#6272a4' }
  },
  {
    id: 'matcha',
    name: 'Matcha Latte',
    colors: { bg: '#f0f4f0', surface: '#e0e8e0', text: '#2d3a2d', accent: '#4a7c44', muted: '#7a8c7a' }
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: { bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0', muted: '#4c566a' }
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    colors: { bg: '#272822', surface: '#3e3d32', text: '#f8f8f2', accent: '#a6e22e', muted: '#75715e' }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    colors: { bg: '#fdf6e3', surface: '#eee8d5', text: '#657b83', accent: '#268bd2', muted: '#93a1a1' }
  },
  {
    id: 'solarized',
    name: 'Solarized Dark',
    colors: { bg: '#002b36', surface: '#073642', text: '#93a1a1', accent: '#2aa198', muted: '#586e75' }
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    colors: { bg: '#1a1b26', surface: '#24283b', text: '#c0caf5', accent: '#7aa2f7', muted: '#565f89' }
  },
  {
    id: 'rose',
    name: 'Rose Water',
    colors: { bg: '#fff5f7', surface: '#ffeef2', text: '#5d3a44', accent: '#e91e63', muted: '#a68a91' }
  },
  {
    id: 'nord-light',
    name: 'Nord Light',
    colors: { bg: '#e5e9f0', surface: '#d8dee9', text: '#2e3440', accent: '#5e81ac', muted: '#4c566a' }
  },
  {
    id: 'synthwave',
    name: 'Synthwave 84',
    colors: { bg: '#2b213a', surface: '#241b2f', text: '#fffb96', accent: '#ff71ce', muted: '#5c5470' }
  },
  {
    id: 'vercel',
    name: 'Vercel Dark',
    colors: { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffffff', muted: '#444444' }
  },
  {
    id: 'oceanic',
    name: 'Oceanic Next',
    colors: { bg: '#1B2B34', surface: '#343D46', text: '#D8DEE9', accent: '#6699CC', muted: '#65737E' }
  },
  {
    id: 'firewatch',
    name: 'Firewatch',
    colors: { bg: '#1C1315', surface: '#2D1F22', text: '#EAE1DC', accent: '#EB5E28', muted: '#7D6B66' }
  },
  // --- High-Contrast & Terminal Themes ---
  {
    id: 'phosphor-amber',
    name: 'Phosphor Amber',
    colors: { bg: '#100C03', surface: '#1F1805', text: '#FFB000', accent: '#FFCC00', muted: '#996600' }
  },
  {
    id: 'crimson-ops',
    name: 'Crimson Ops',
    colors: { bg: '#0A0202', surface: '#1A0505', text: '#FF8888', accent: '#FF0033', muted: '#882222' }
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    colors: { bg: '#0D1B2A', surface: '#1B263B', text: '#E0E1DD', accent: '#4CC9F0', muted: '#415A77' }
  },
  {
    id: 'toxic',
    name: 'Toxic Waste',
    colors: { bg: '#080A04', surface: '#141A0A', text: '#D4FF80', accent: '#A6FF00', muted: '#5C7A29' }
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    colors: { bg: '#012456', surface: '#003B73', text: '#FFFFFF', accent: '#F9F1A5', muted: '#A0B0C0' }
  },
  {
    id: 'zenith',
    name: 'Zenith Mono',
    colors: { bg: '#000000', surface: '#121212', text: '#FFFFFF', accent: '#FFFFFF', muted: '#666666' }
  },
  {
    id: 'miami-nights',
    name: 'Miami Nights',
    colors: { bg: '#0D0E15', surface: '#181924', text: '#00F0FF', accent: '#FF0055', muted: '#7F2F6F' }
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    colors: { bg: '#0C120C', surface: '#162616', text: '#C2E0C2', accent: '#2ECC71', muted: '#4A6B4A' }
  },
  {
    id: 'royal',
    name: 'Royal Void',
    colors: { bg: '#0D0814', surface: '#1A1029', text: '#EBD9FF', accent: '#9D4EDD', muted: '#583D72' }
  },
  {
    id: 'volcano',
    name: 'Volcanic Ash',
    colors: { bg: '#120505', surface: '#240A0A', text: '#E8D5D5', accent: '#FF4500', muted: '#7A3333' }
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
