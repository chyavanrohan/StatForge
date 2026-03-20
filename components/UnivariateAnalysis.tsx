
import React, { useMemo, useState, useEffect } from 'react';
import { Dataset, CalculationStep } from '../types';
import * as Stats from '../services/statsService';
import { Formula } from './Formula';
import { TableView } from './TableView';
import { LayoutDashboard, Table as TableIcon, Hash, Variable, Repeat, CheckCircle2, GraduationCap, Briefcase, Search, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react';
import { ScrambleText } from './ScrambleText';
import { MagneticTiltCard } from './MagneticTiltCard';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  dataset: Dataset;
}

const SolverRow: React.FC<{
  title: string;
  formula: string;
  variables: string;
  substitution: string;
  answer: string | number;
  index: number;
  steps?: CalculationStep[];
  originExplanations?: string[];
}> = ({ title, formula, variables, substitution, answer, index, steps, originExplanations }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="w-full mb-3">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="group glass-panel rounded-lg px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-white/[0.04] hover:border-skin-accent/20 transition-colors cursor-pointer"
      >
         <div className="flex items-center gap-4 flex-1">
            {/* Arrow Indicator */}
            <div className="text-skin-accent">
               {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {/* Index & Title */}
            <div className="flex items-center gap-4 min-w-0">
               <span className="text-[10px] font-mono text-zinc-600 font-bold">{String(index + 1).padStart(2, '0')}</span>
               <h3 className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{title}</h3>
            </div>
         </div>

         {/* Formula - Centered (Hidden on mobile) */}
         <div className="hidden sm:flex flex-1 justify-center border-l border-r border-white/5 px-4 opacity-60 group-hover:opacity-100 transition-opacity">
             <Formula tex={formula} className="text-sm text-skin-muted" />
         </div>

         {/* Result */}
         <div className="sm:min-w-[120px] text-left sm:text-right pl-8 sm:pl-0">
             <div className="text-lg font-mono font-bold text-skin-accent tabular-nums">
               <ScrambleText value={answer} />
             </div>
         </div>
      </div>

      {/* Expanded Content (Student Mode Details) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 glass-panel rounded-xl p-6 md:p-8 flex flex-col gap-8 shadow-2xl relative z-10 border-t-0 rounded-t-none border-skin-accent/10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">
                      <Hash className="w-3 h-3" /> Formula
                   </div>
                   <div className="p-6 bg-black/60 rounded-xl border border-white/5 flex items-center justify-center min-h-[100px]">
                      <Formula tex={formula} block className="text-white text-lg font-mono" />
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">
                      <Variable className="w-3 h-3" /> Breakdown
                   </div>
                   <div className="space-y-4">
                      {/* Origin Explanations (New) */}
                      {originExplanations && originExplanations.length > 0 && (
                          <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2">
                              <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400/80 uppercase mb-1">
                                  <Search className="w-3 h-3" /> Variable Identification
                              </div>
                              {originExplanations.map((line, i) => (
                                   <div key={i} className="text-xs text-zinc-400 font-mono leading-relaxed border-l-2 border-blue-500/20 pl-2">
                                      {line}
                                   </div>
                              ))}
                          </div>
                      )}

                      <div className="p-4 bg-skin-accent/5 rounded-xl border border-skin-accent/10">
                        <span className="text-[9px] font-bold text-skin-accent/60 uppercase block mb-1">Variable Extraction</span>
                        <div className="font-mono text-xs text-skin-text leading-loose">
                          {variables.split(', ').map((v, i) => (
                            <span key={i} className="inline-block bg-white/5 px-2 py-0.5 rounded mr-2 mb-2">
                               <Formula tex={v} />
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5 space-y-4">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase block">Substitution</span>
                        <div className="pl-2 border-l-2 border-skin-accent/20">
                          <Formula tex={substitution} block className="text-skin-muted font-mono text-sm" />
                        </div>
                        
                        {/* Granular Arithmetic Steps (Micro-Stepping) */}
                        {steps && steps.length > 0 && (
                            <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-2">Arithmetic Micro-Steps</span>
                              {steps.map((step, i) => (
                                  <div key={i} className="relative pl-4 border-l border-white/10 pb-2 last:pb-0 last:border-0">
                                      {/* Step Connector Dot */}
                                      <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-black border border-white/20"></div>
                                      
                                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 group/step">
                                          <span className="text-[9px] font-mono text-zinc-600 min-w-[30px] select-none">Step {i + 1}:</span>
                                          <div className="flex-1 flex items-center justify-between gap-4">
                                              <div className="text-zinc-300 text-sm bg-black/20 px-2 py-1 rounded transition-colors border border-transparent group-hover/step:border-white/10">
                                                  <Formula tex={step.latex} />
                                              </div>
                                              {/* Annotation Tag */}
                                              {step.annotation && (
                                                  <span className="text-[9px] font-mono text-zinc-500 italic bg-white/5 px-2 py-0.5 rounded whitespace-nowrap hidden sm:inline-block">
                                                      [{step.annotation}]
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                            </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="space-y-3 lg:border-l lg:border-white/5 lg:pl-8">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">
                      <Repeat className="w-3 h-3" /> Result
                   </div>
                   <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
                      <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Final_Output</div>
                      <div className="relative px-8 py-4 bg-skin-accent/5 border border-skin-accent/20 rounded-xl">
                         <div className="text-5xl font-mono font-black text-skin-accent tabular-nums">
                          <ScrambleText value={answer} />
                         </div>
                         <div className="absolute inset-0 bg-skin-accent/5 rounded-xl animate-pulse"></div>
                      </div>
                      <div className="w-20 h-1 bg-skin-accent/30 rounded-full" />
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const UnivariateAnalysis: React.FC<Props> = ({ dataset }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table'>('dashboard');
  
  const stats = useMemo(() => {
    const mean = Stats.calculateMean(dataset);
    const median = Stats.calculateMedian(dataset);
    const mode = Stats.calculateMode(dataset);
    const dispersion = Stats.calculateDispersion(dataset);
    const skewKurt = Stats.calculateSkewnessKurtosis(dataset);
    
    return { mean, median, mode, dispersion, skewKurt };
  }, [dataset]);

  const masterTable = useMemo(() => {
    return Stats.generateUnivariateMasterTable(dataset, stats.mean.value as number);
  }, [dataset, stats.mean.value]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
           <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'dashboard' ? 'bg-skin-accent text-black shadow-lg shadow-skin-accent/20' : 'text-skin-muted hover:text-skin-text hover:bg-white/5'}`}
           >
              <LayoutDashboard className="w-4 h-4" /> Solver Dashboard
           </button>
           <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'table' ? 'bg-skin-accent text-black shadow-lg shadow-skin-accent/20' : 'text-skin-muted hover:text-skin-text hover:bg-white/5'}`}
           >
              <TableIcon className="w-4 h-4" /> Computation Matrix
           </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="flex items-center gap-3">
          </div>
        )}
      </div>

      {activeTab === 'table' ? (
        <div className="h-[calc(100vh-200px)] min-h-[500px]">
            <TableView headers={masterTable.headers} rows={masterTable.rows} footer={masterTable.footer} caption="Master Computation Table" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-20">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Step-by-Step Statistical Derivation</h2>
              <p className="text-sm text-zinc-500 font-mono mt-1">Engine_v2.6 &bull; Micro-Stepping Enabled &bull; 4dp Precision</p>
            </div>

            <SolverRow 
              index={0}
              title="Arithmetic Mean"
              formula={stats.mean.formula}
              variables={stats.mean.variables}
              substitution={stats.mean.substitution}
              answer={stats.mean.value}
              steps={stats.mean.steps}
              originExplanations={stats.mean.originExplanations}
            />

            <SolverRow 
              index={1}
              title="Median (Positional)"
              formula={stats.median.formula}
              variables={stats.median.variables}
              substitution={stats.median.substitution}
              answer={stats.median.value}
              steps={stats.median.steps}
              originExplanations={stats.median.originExplanations}
            />

            <SolverRow 
              index={2}
              title="Mode"
              formula={stats.mode.formula}
              variables={stats.mode.variables}
              substitution={stats.mode.substitution}
              answer={stats.mode.value}
              steps={stats.mode.steps}
              originExplanations={stats.mode.originExplanations}
            />

            <SolverRow 
              index={3}
              title="Range"
              formula={stats.dispersion.rangeFormula}
              variables={String.raw`x_{max}, x_{min} \text{ where } f > 0`}
              substitution={stats.dispersion.rangeSub}
              answer={stats.dispersion.range}
              steps={stats.dispersion.rangeSteps}
              originExplanations={stats.dispersion.rangeOrigin}
            />

            <SolverRow 
              index={4}
              title="Mean Deviation"
              formula={stats.dispersion.mdFormula}
              variables={stats.dispersion.mdVars}
              substitution={stats.dispersion.mdSub}
              answer={stats.dispersion.meanDeviation}
              steps={stats.dispersion.mdSteps}
              originExplanations={stats.dispersion.mdOrigin}
            />

            <SolverRow 
              index={5}
              title="Variance (V)"
              formula={stats.dispersion.varFormula}
              variables={stats.dispersion.varVars}
              substitution={stats.dispersion.varSub}
              answer={stats.dispersion.variance}
              steps={stats.dispersion.varSteps}
              originExplanations={stats.dispersion.varOrigin}
            />

            <SolverRow 
              index={6}
              title="Standard Deviation (σ)"
              formula={stats.dispersion.sdFormula}
              variables={String.raw`V = ${stats.dispersion.variance.toFixed(4)}`}
              substitution={stats.dispersion.sdSub}
              answer={stats.dispersion.sd}
              steps={stats.dispersion.sdSteps}
              originExplanations={stats.dispersion.sdOrigin}
            />

            <SolverRow 
              index={7}
              title="Pearson's Skewness"
              formula={stats.skewKurt.skewFormula}
              variables={stats.skewKurt.skewVars}
              substitution={stats.skewKurt.skewSub}
              answer={stats.skewKurt.skewness}
              steps={stats.skewKurt.skewSteps}
              originExplanations={stats.skewKurt.skewOrigin}
            />

            <SolverRow 
              index={8}
              title="Kurtosis (β₂)"
              formula={stats.skewKurt.kurtFormula}
              variables={stats.skewKurt.kurtVars}
              substitution={stats.skewKurt.kurtSub}
              answer={stats.skewKurt.kurtosis}
              steps={stats.skewKurt.kurtSteps}
              originExplanations={stats.skewKurt.kurtOrigin}
            />
        </div>
      )}
    </div>
  );
};
