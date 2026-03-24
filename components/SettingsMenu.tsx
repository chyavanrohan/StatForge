
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Settings, 
  X, 
  Palette, 
  Search, 
  Check, 
} from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

export const SettingsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  
  const { currentTheme, setTheme, previewTheme, themes } = useTheme();
  
  const [pendingTheme, setPendingTheme] = useState<Theme>(currentTheme);
  const originalThemeRef = useRef<Theme>(currentTheme);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredThemes = useMemo(() => {
    const lowerQ = searchQuery.toLowerCase();
    return themes.filter(t => t.name.toLowerCase().includes(lowerQ));
  }, [searchQuery, themes]);

  const closeSettings = useCallback((commit: boolean, themeToCommit?: Theme) => {
    setIsOpen(false);
    if (commit) {
      setTheme(themeToCommit || pendingTheme);
    } else {
      previewTheme(originalThemeRef.current);
    }
  }, [pendingTheme, setTheme, previewTheme]);

  const handleThemeHover = useCallback((theme: Theme, index: number) => {
    setActiveIndex(index);
    setPendingTheme(theme);
    previewTheme(theme);
  }, [previewTheme]);

  const handleAccentChange = useCallback((color: string) => {
    const newTheme: Theme = {
      ...pendingTheme,
      id: 'custom',
      colors: { ...pendingTheme.colors, accent: color }
    };
    setPendingTheme(newTheme);
    previewTheme(newTheme);
  }, [pendingTheme, previewTheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      if (!isOpen) return;

      if (e.key === 'Escape') {
        closeSettings(false);
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (activeIndex + 1) % filteredThemes.length;
        handleThemeHover(filteredThemes[nextIndex], nextIndex);
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (activeIndex - 1 + filteredThemes.length) % filteredThemes.length;
        handleThemeHover(filteredThemes[prevIndex], prevIndex);
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        closeSettings(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredThemes, handleThemeHover, closeSettings]);

  useEffect(() => {
    if (isOpen) {
      originalThemeRef.current = currentTheme;
      setPendingTheme(currentTheme);
      setSearchQuery('');
      setActiveIndex(filteredThemes.findIndex(t => t.id === currentTheme.id) || 0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const sections = [
    { id: 'theme', name: 'Theme Engine', icon: Palette },
  ];

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[100] p-2.5 bg-skin-surface border border-white/10 rounded-full shadow-lg shadow-black/50 text-skin-accent hover:bg-white/5 transition-all duration-300 hover:rotate-90 group no-print"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={(e) => {
          e.stopPropagation();
          closeSettings(false);
        }}
      />

      <div 
        className="relative w-full h-full sm:max-w-4xl sm:h-[600px] bg-skin-surface border-0 sm:border sm:border-skin-border/10 rounded-none sm:rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Header with Search */}
            <div className="p-4 sm:p-6 border-b border-skin-border/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-skin-accent/10 rounded-lg">
                    <Palette className="w-5 h-5 text-skin-accent" />
                  </div>
                  <span className="font-bold text-skin-text tracking-tight whitespace-nowrap">Theme Engine</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSettings(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-skin-muted transition-colors sm:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search themes..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-sm text-skin-text placeholder:text-skin-muted outline-none focus:border-skin-accent/50 transition-colors font-mono"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                />
              </div>
              <div className="hidden sm:flex items-center gap-2">
                 <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-skin-muted font-mono">CMD+K</div>
                 <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSettings(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-skin-muted transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Theme List */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar border-b sm:border-b-0 sm:border-r border-skin-border/10">
                <div className="text-[10px] font-mono text-skin-muted uppercase tracking-widest mb-4 px-2">Available Themes</div>
                <ul ref={listRef} className="space-y-1">
                  {filteredThemes.length === 0 ? (
                    <div className="px-4 py-8 text-center text-skin-muted text-xs font-mono">No themes found.</div>
                  ) : (
                    filteredThemes.map((theme, index) => {
                      const isActive = index === activeIndex;
                      const isCurrent = currentTheme.id === theme.id;
                      return (
                        <li
                          key={theme.id}
                          className={`
                            px-4 py-3 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 border
                            ${isActive 
                              ? 'bg-white/10 border-skin-accent/50 shadow-lg shadow-black/20' 
                              : isCurrent ? 'bg-white/5 border-white/10' : 'border-transparent hover:bg-white/5'}
                          `}
                          onMouseEnter={() => handleThemeHover(theme, index)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleThemeHover(theme, index);
                            // Small delay to ensure state updates and visual feedback
                            setTimeout(() => closeSettings(true, theme), 50);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center -space-x-1.5">
                              <div className="w-5 h-5 rounded-full border-2 border-black/50 shadow-sm" style={{ backgroundColor: theme.colors.bg }} />
                              <div className="w-5 h-5 rounded-full border-2 border-black/50 shadow-sm" style={{ backgroundColor: theme.colors.accent }} />
                              <div className="w-5 h-5 rounded-full border-2 border-black/50 shadow-sm" style={{ backgroundColor: theme.colors.surface }} />
                            </div>
                            <span className={`text-sm font-medium ${isActive || isCurrent ? 'text-skin-text' : 'text-skin-muted'}`}>
                              {theme.name}
                            </span>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-skin-accent" />}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              {/* Theme Engine Panel */}
              <div className="w-full sm:w-80 p-6 bg-skin-base/20 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Palette className="w-4 h-4 text-skin-accent" />
                  <span className="text-xs font-bold text-skin-text tracking-widest uppercase">Theme Engine</span>
                </div>

                {/* Global Accent */}
                <div className="mb-8">
                  <label className="text-[10px] font-mono text-skin-muted uppercase tracking-widest mb-3 block">
                    Global Accent
                  </label>
                  <div className="space-y-4">
                    <div className="relative w-full h-20 sm:h-24 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer">
                      <input 
                        type="color" 
                        value={pendingTheme.colors.accent}
                        onChange={(e) => handleAccentChange(e.target.value)}
                        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                      />
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                         <Palette className="w-6 h-6 text-white drop-shadow-lg mb-2" />
                         <span className="text-[10px] font-mono text-white/80 uppercase tracking-widest">Pick Custom Color</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                      <span className="text-xs font-mono text-skin-muted uppercase">Hex Code</span>
                      <span className="text-xs font-mono text-skin-accent font-bold">{pendingTheme.colors.accent.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block mt-12 p-4 bg-skin-accent/5 border border-skin-accent/10 rounded-2xl">
                   <p className="text-[10px] text-skin-muted leading-relaxed italic">
                     "Design is not just what it looks like and feels like. Design is how it works."
                   </p>
                </div>

                <div className="mt-auto pt-6 text-[10px] text-skin-muted text-center font-mono">
                   StatForge UI v2.2 &bull; <span className="text-skin-accent">Connected</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 bg-skin-base/40 border-t border-skin-border/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="hidden sm:flex items-center gap-6 text-[10px] text-skin-muted font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-skin-accent">↑↓</span> Navigate
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-skin-accent">↵</span> Select
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-skin-accent">ESC</span> Close
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <button 
                  onClick={() => closeSettings(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-skin-muted hover:text-skin-text transition-colors border border-white/10 rounded-lg sm:border-0"
                 >
                   Discard
                 </button>
                 <button 
                  onClick={() => closeSettings(true)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-skin-accent text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-skin-accent/20"
                 >
                   Apply Changes
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
