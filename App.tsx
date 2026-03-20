
import React, { useState, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { UnivariateAnalysis } from './components/UnivariateAnalysis';
import { BivariateAnalysis } from './components/BivariateAnalysis';
import { StockAnalysis } from './components/StockAnalysis';
import { SplashScreen } from './components/SplashScreen';
import { SettingsMenu } from './components/SettingsMenu';
import { StockSearch } from './components/StockSearch';
import { ComputationLoading } from './components/ComputationLoading';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataType, Dataset, MarketDataset } from './types';
import { Sigma } from './components/Icons';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  X, 
  Terminal, 
  Search, 
  Globe, 
  ChevronDown
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [showStudio, setShowStudio] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    if (dataset) {
      setShowStudio(false);
    } else {
      setShowStudio(true);
    }
  }, [dataset]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDataSubmit = (data: Dataset) => {
    setIsLoading(true);
    setDataset(data);
    
    // Allow components to mount and calculate behind the loading screen
    setTimeout(() => {
      setIsLoading(false);
      setIsTerminalOpen(false);
      setShowStudio(false);
    }, 2000);
  };

  const pageTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };

  return (
    <div className="h-screen text-skin-text flex flex-col font-sans transition-colors duration-500 overflow-hidden relative z-10 bg-skin-base">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <ComputationLoading isLoading={isLoading} />
      
      {!showSplash && (
        <SettingsMenu />
      )}

      {!showSplash && (
        <div className={`fixed left-1/2 -translate-x-1/2 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] no-print w-full max-w-xl px-4 ${isTerminalOpen ? 'translate-y-0' : '-translate-y-[calc(100%-24px)]'}`}>
          <div className="flex flex-col items-center">
            <div className="w-full terminal-glass border-skin-accent/30 rounded-b-2xl overflow-hidden shadow-[0_10px_60px_rgba(0,0,0,0.9)]">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
                <div className="flex items-center gap-2 text-skin-accent">
                  <Globe className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">Global Market Terminal</span>
                </div>
                <button onClick={() => setIsTerminalOpen(false)} className="p-1 hover:bg-white/10 rounded-md text-skin-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                 <StockSearch onResult={handleDataSubmit} />
              </div>
            </div>
            <button 
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`group flex items-center justify-center gap-3 bg-skin-surface/90 border border-t-0 border-skin-accent/30 px-8 py-2 rounded-b-xl shadow-2xl transition-all hover:bg-skin-accent ${isTerminalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:py-3'}`}
            >
              <Search className="w-3.5 h-3.5 text-skin-accent group-hover:text-black transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-skin-accent group-hover:text-black transition-colors">MARKET TERMINAL</span>
              <ChevronDown className="w-3.5 h-3.5 text-skin-accent group-hover:text-black transition-colors animate-bounce" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-skin-base border-b border-white/5 sticky top-0 z-40 no-print flex-none">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowStudio(!showStudio)}
              className={`p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 group ${showStudio ? 'text-skin-accent' : 'text-skin-muted hover:text-skin-text'}`}
            >
              <Terminal className={`w-5 h-5 transition-transform duration-300 ${showStudio ? 'scale-110' : 'scale-100'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{showStudio ? 'View Analysis' : 'Data Studio'}</span>
            </button>
            <div className="flex items-center gap-2 text-skin-text cursor-pointer" onClick={() => setShowStudio(false)}>
              <div className="bg-gradient-to-br from-skin-accent to-skin-accent/50 p-1.5 rounded-lg shadow-lg shadow-skin-accent/20">
                <Sigma className="w-6 h-6 text-skin-base" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Stat<span className="text-skin-accent">Forge</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden z-10">
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 scroll-smooth bg-transparent">
          <AnimatePresence mode="wait">
            {dataset && !showStudio ? (
              <motion.div
                key="dashboard"
                {...pageTransition}
                className="max-w-7xl mx-auto space-y-6 pb-20"
              >
                 {dataset.type === DataType.BIVARIATE ? (
                   <BivariateAnalysis dataset={dataset} />
                 ) : dataset.type === DataType.MARKET ? (
                   <StockAnalysis dataset={dataset.data as MarketDataset} />
                 ) : (
                   <UnivariateAnalysis dataset={dataset} />
                 )}
              </motion.div>
            ) : (
              <motion.div
                key="studio"
                {...pageTransition}
                className="h-full max-w-5xl mx-auto"
              >
                <div className="h-full min-h-[80vh] rounded-3xl border border-white/5 glass-panel shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center flex-none bg-black/40">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-skin-accent/10 rounded-2xl">
                        <Terminal className="w-6 h-6 text-skin-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-skin-text uppercase tracking-wider">Data Studio</h2>
                        <p className="text-xs text-skin-muted font-mono">Configure your dataset for analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {dataset && (
                        <button 
                          onClick={() => setShowStudio(false)} 
                          className="text-[10px] text-skin-accent hover:text-white font-mono tracking-widest uppercase transition-all border border-skin-accent/20 px-4 py-2 rounded-xl bg-skin-accent/5 hover:bg-skin-accent/20"
                        >
                          Cancel
                        </button>
                      )}
                      {dataset && (
                        <button 
                          onClick={() => setDataset(null)} 
                          className="text-[10px] text-red-400 hover:text-red-300 font-mono tracking-widest uppercase transition-all border border-red-500/20 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20"
                        >
                          Reset All
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="max-w-3xl mx-auto">
                      <DataInput 
                        onDataSubmit={handleDataSubmit} 
                        currentDataset={dataset} 
                        isSidebarOpen={true}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
