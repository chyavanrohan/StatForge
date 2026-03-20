
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Database, Binary, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  isLoading: boolean;
}

export const ComputationLoading: React.FC<Props> = ({ isLoading }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: <Database className="w-5 h-5" />, text: "Parsing Dataset Structure...", color: "text-skin-accent" },
    { icon: <Binary className="w-5 h-5" />, text: "Executing Statistical Kernels...", color: "text-skin-accent/80" },
    { icon: <Cpu className="w-5 h-5" />, text: "Optimizing Regression Models...", color: "text-skin-accent/70" },
    { icon: <ShieldCheck className="w-5 h-5" />, text: "Validating Computation Integrity...", color: "text-skin-accent/60" },
    { icon: <Zap className="w-5 h-5" />, text: "Finalizing Dashboard State...", color: "text-skin-accent" }
  ];

  useEffect(() => {
    if (isLoading) {
      setStep(0);
      const interval = setInterval(() => {
        setStep(prev => (prev + 1) % steps.length);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-skin-bg flex flex-col items-center justify-center"
        >
          {/* Background Grid Effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ 
                 backgroundImage: `radial-gradient(circle at 2px 2px, rgb(var(--color-text-muted)) 1px, transparent 0)`,
                 backgroundSize: '40px 40px' 
               }} 
          />
          
          <div className="relative flex flex-col items-center gap-12 max-w-md w-full px-8">
            {/* Main Logo/Icon */}
            <div className="relative">
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-32 h-32 rounded-full border-2 border-dashed border-skin-accent/30 flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-skin-accent/5 border border-skin-accent/20 flex items-center justify-center shadow-[0_0_50px_rgba(var(--color-accent),0.1)]">
                  <Cpu className="w-10 h-10 text-skin-accent" />
                </div>
              </motion.div>
              
              {/* Orbiting Particles */}
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div 
                    className="w-2 h-2 rounded-full bg-skin-accent absolute"
                    style={{ 
                      top: '50%', 
                      left: '50%', 
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-80px)` 
                    }}
                  />
                </motion.div>
              ))}
            </div>

            <div className="w-full space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-skin-text tracking-tighter uppercase">StatForge <span className="text-skin-accent">Engine</span></h2>
                <p className="text-[10px] font-mono text-skin-muted uppercase tracking-[0.5em]">Computation_In_Progress</p>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-skin-surface border border-skin-muted/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="h-full bg-skin-accent shadow-[0_0_15px_rgba(var(--color-accent),0.5)]"
                />
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0.2, x: -10 }}
                    animate={{ 
                      opacity: step === i ? 1 : 0.2,
                      x: step === i ? 0 : -10,
                      scale: step === i ? 1.05 : 1
                    }}
                    className={`flex items-center gap-4 transition-all duration-300 ${step === i ? s.color : 'text-skin-muted'}`}
                  >
                    <div className={`p-2 rounded-lg bg-skin-surface/40 border border-skin-muted/10 ${step === i ? 'border-current/30' : ''}`}>
                      {s.icon}
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">{s.text}</span>
                    {step === i && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "auto" }}
                        className="ml-auto"
                      >
                        <span className="text-[10px] animate-pulse">RUNNING...</span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-skin-muted/10 w-full text-center">
              <p className="text-[9px] font-mono text-skin-muted uppercase tracking-widest">StatForge v2.6.4 // Kernel_v8_Stable</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
