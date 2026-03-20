
import React, { useState, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { UnivariateAnalysis } from './components/UnivariateAnalysis';
import { BivariateAnalysis } from './components/BivariateAnalysis';
import { SplashScreen } from './components/SplashScreen';
import { SettingsMenu } from './components/SettingsMenu';
import { ComputationLoading } from './components/ComputationLoading';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataType, Dataset } from './types';
import { Sigma } from './components/Icons';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Terminal
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [showStudio, setShowStudio] = useState(true);
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
                <div className="h-full min-h-[70vh] sm:min-h-[80vh] rounded-2xl sm:rounded-3xl border border-white/5 glass-panel shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-4 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-none bg-black/40">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-skin-accent/10 rounded-xl sm:rounded-2xl">
                        <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-skin-accent" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-skin-text uppercase tracking-wider">Data Studio</h2>
                        <p className="text-[10px] text-skin-muted font-mono">Configure your dataset</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      {dataset && (
                        <button 
                          onClick={() => setShowStudio(false)} 
                          className="flex-1 sm:flex-none text-[9px] sm:text-[10px] text-skin-accent hover:text-white font-mono tracking-widest uppercase transition-all border border-skin-accent/20 px-3 py-2 rounded-xl bg-skin-accent/5 hover:bg-skin-accent/20"
                        >
                          Cancel
                        </button>
                      )}
                      {dataset && (
                        <button 
                          onClick={() => setDataset(null)} 
                          className="flex-1 sm:flex-none text-[9px] sm:text-[10px] text-red-400 hover:text-red-300 font-mono tracking-widest uppercase transition-all border border-red-500/20 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
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
