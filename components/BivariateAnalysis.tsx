
import React, { useMemo, useState, useEffect } from 'react';
import { Dataset, CalculationStep } from '../types';
import * as Stats from '../services/statsService';
import { Formula } from './Formula';
import { TableView } from './TableView';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Table as TableIcon, Hash, Variable, Repeat, CheckCircle2, Info, GraduationCap, Briefcase, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { CinematicChart } from './CinematicChart';
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
  description?: string;
  interpretation?: string;
  extraProcess?: { formula: string, sub: string };
  steps?: CalculationStep[];
  originExplanations?: string[];
}> = ({ title, formula, variables, substitution, answer, index, description, interpretation, extraProcess, steps, originExplanations }) => {
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
               <span className="text-[10px] font-mono text-skin-muted/60 font-bold">{String(index + 1).padStart(2, '0')}</span>
               <h3 className="text-sm font-semibold text-skin-text/80 group-hover:text-skin-text transition-colors truncate">{title}</h3>
            </div>
         </div>

         {/* Formula - Centered (Hidden on mobile) */}
         <div className="hidden sm:flex flex-1 justify-center border-l border-r border-skin-text/5 px-4 opacity-60 group-hover:opacity-100 transition-opacity">
             <Formula tex={formula} className="text-sm text-skin-muted" />
         </div>

         {/* Result */}
         <div className="sm:min-w-[150px] text-left sm:text-right pl-8 sm:pl-0">
             <div className="text-lg font-mono font-bold text-skin-accent tabular-nums break-all">
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
                   <div className="flex items-center gap-2 text-[10px] font-bold text-skin-muted uppercase tracking-wider mb-4">
                      <Hash className="w-3 h-3" /> Formula
                   </div>
                   <div className="p-6 bg-skin-surface/60 rounded-xl border border-skin-text/5 flex flex-col items-center justify-center min-h-[100px] gap-4">
                      <Formula tex={formula} block className="text-skin-text text-lg font-mono" />
                      {extraProcess && (
                          <div className="pt-4 border-t border-skin-text/5 w-full text-center">
                              <Formula tex={extraProcess.formula} block className="text-skin-muted text-xs font-mono" />
                          </div>
                      )}
                   </div>
                   {description && <p className="text-[10px] text-skin-muted/80 font-mono italic leading-relaxed mt-2">{description}</p>}
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-skin-muted uppercase tracking-wider mb-4">
                      <Variable className="w-3 h-3" /> Breakdown
                   </div>
                   <div className="space-y-4">
                      {/* Origin Explanations (New) */}
                      {originExplanations && originExplanations.length > 0 && (
                          <div className="p-4 bg-skin-accent/5 rounded-xl border border-skin-accent/10 space-y-2">
                              <div className="flex items-center gap-2 text-[9px] font-bold text-skin-accent uppercase mb-1">
                                  <Search className="w-3 h-3" /> Variable Identification
                              </div>
                              {originExplanations.map((line, i) => (
                                   <div key={i} className="text-xs text-skin-text/70 font-mono leading-relaxed border-l-2 border-skin-accent/20 pl-2">
                                      {line}
                                   </div>
                              ))}
                          </div>
                      )}

                      <div className="p-4 bg-skin-accent/5 rounded-xl border border-skin-accent/10">
                        <span className="text-[9px] font-bold text-skin-accent/60 uppercase block mb-1">Variable Extraction</span>
                        <div className="font-mono text-xs text-skin-text leading-loose">
                          {variables.split(', ').map((v, i) => (
                            <span key={i} className="inline-block bg-skin-text/5 px-2 py-0.5 rounded mr-2 mb-2">
                               <Formula tex={v} />
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 bg-skin-text/[0.03] rounded-xl border border-skin-text/5 space-y-4">
                        <span className="text-[9px] font-bold text-skin-muted uppercase block">Substitution</span>
                        <div className="pl-2 border-l-2 border-skin-accent/20">
                          <Formula tex={substitution} block className="text-skin-muted font-mono text-sm" />
                        </div>
                        {extraProcess && (
                          <div className="pt-3 border-t border-skin-text/5">
                               <Formula tex={extraProcess.sub} block className="text-skin-muted font-mono text-xs italic" />
                          </div>
                        )}

                        {/* Granular Arithmetic Steps */}
                        {steps && steps.length > 0 && (
                            <div className="space-y-3 mt-4 pt-4 border-t border-skin-text/5">
                              <span className="text-[9px] font-bold text-skin-muted uppercase block mb-2">Arithmetic Micro-Steps</span>
                              {steps.map((step, i) => (
                                  <div key={i} className="relative pl-4 border-l border-skin-text/10 pb-2 last:pb-0 last:border-0">
                                      <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-skin-base border border-skin-text/20"></div>
                                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 group/step">
                                          <span className="text-[9px] font-mono text-skin-muted/80 min-w-[30px] select-none">Step {i + 1}:</span>
                                          <div className="flex-1 flex items-center justify-between gap-4">
                                              <div className="text-skin-text/90 text-sm bg-skin-text/5 px-2 py-1 rounded transition-colors border border-transparent group-hover/step:border-skin-text/10">
                                                  <Formula tex={step.latex} />
                                              </div>
                                              {step.annotation && (
                                                  <span className="text-[9px] font-mono text-skin-muted italic bg-skin-text/5 px-2 py-0.5 rounded whitespace-nowrap hidden sm:inline-block">
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

                <div className="space-y-3 lg:border-l lg:border-skin-text/5 lg:pl-8">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-skin-muted uppercase tracking-wider mb-4">
                      <Repeat className="w-3 h-3" /> Result
                   </div>
                   <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
                      <div className="text-[9px] font-bold text-skin-muted/60 uppercase tracking-[0.4em]">Final Result</div>
                      <div className="relative px-8 py-4 bg-skin-accent/5 border border-skin-accent/20 rounded-xl">
                          <div className="text-4xl font-mono font-black text-skin-accent tabular-nums text-center break-all">
                            <ScrambleText value={answer} />
                          </div>
                          <div className="absolute inset-0 bg-skin-accent/5 rounded-xl animate-pulse"></div>
                      </div>
                      {interpretation && (
                          <div className="px-4 py-2 bg-skin-accent/10 border border-skin-accent/30 rounded-lg text-center">
                              <span className="text-[10px] font-black text-skin-accent uppercase tracking-widest">{interpretation}</span>
                          </div>
                      )}
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

export const BivariateAnalysis: React.FC<Props> = ({ dataset }) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table'>('dashboard');

  const stats = useMemo(() => {
    return Stats.calculateBivariatePearson(dataset);
  }, [dataset]);

  const masterTable = useMemo(() => {
    return Stats.generateBivariateMasterTable(dataset);
  }, [dataset]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
         <div className="flex space-x-1 bg-skin-surface/40 p-1 rounded-xl border border-skin-text/5 w-fit">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'dashboard' ? 'bg-skin-accent text-skin-base shadow-lg shadow-skin-accent/20' : 'text-skin-muted hover:text-skin-text hover:bg-skin-text/5'}`}><LayoutDashboard className="w-4 h-4" /> Solver Dashboard</button>
            <button onClick={() => setActiveTab('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${activeTab === 'table' ? 'bg-skin-accent text-skin-base shadow-lg shadow-skin-accent/20' : 'text-skin-muted hover:text-skin-text hover:bg-skin-text/5'}`}><TableIcon className="w-4 h-4" /> Computation Matrix</button>
         </div>

         {activeTab === 'dashboard' && (
          <div className="flex items-center gap-3">
          </div>
        )}
      </div>

      {activeTab === 'table' ? (
        <div className="h-[calc(100vh-200px)] min-h-[500px]">
            <TableView headers={masterTable.headers} rows={masterTable.rows} footer={masterTable.footer} caption="Bivariate Computation Table" tooltips={masterTable.tooltips} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-skin-text tracking-tight">Correlation & Regression Suite</h2>
                <p className="text-sm text-skin-muted font-mono mt-1">Engine_v2.6 &bull; Micro-Stepping Enabled</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-skin-surface/40 border border-skin-text/5 rounded-xl">
                 <Info className="w-4 h-4 text-skin-accent" />
                 <span className="text-[10px] font-mono font-bold text-skin-muted uppercase tracking-widest">Rule: -1 ≤ r ≤ 1</span>
              </div>
            </div>

            <div>
                <CinematicChart dataset={dataset} title="Scatter Plot & Regression" className="mb-4" />
            </div>

            <SolverRow 
              index={0}
              title="Pearson's Correlation Coefficient (Product Moment)"
              formula={stats.formulaR}
              variables={stats.variablesR}
              substitution={stats.substitutionR}
              answer={stats.r}
              interpretation={stats.interpretation}
              description="Quantifies the linear relationship strength and direction between two variables."
              steps={stats.rSteps}
              originExplanations={stats.originExplanations}
            />

            {/* Alternative Formula Row */}
            <SolverRow 
              index={1}
              title="Pearson's r (Variance Difference Method)"
              formula={stats.alternativePearson.formula}
              variables={stats.alternativePearson.variables}
              substitution={stats.alternativePearson.substitution}
              answer={stats.alternativePearson.value}
              interpretation={stats.interpretation}
              description="Alternative calculation using variances of X, Y and difference Z (X-Y)."
              steps={stats.alternativePearson.steps}
            />

            <div className="space-y-6">
                <div className="mb-2">
                    <h3 className="text-lg font-bold text-skin-text flex items-center gap-2">
                        <Hash className="w-4 h-4 text-skin-accent" />
                        Linear Regression Equations
                    </h3>
                    <p className="text-[10px] text-skin-muted font-mono tracking-widest uppercase mt-1">Estimating Variable Interdependence</p>
                </div>

                <SolverRow 
                    index={2}
                    title="Regression Line of Y on X"
                    formula={stats.regressionYX.formulaB}
                    variables={stats.regressionYX.variablesB}
                    substitution={stats.regressionYX.substitutionB}
                    answer={stats.regressionYX.eqn}
                    description="Used to estimate Y when X is known. Minimizes vertical squared deviations."
                    extraProcess={{
                        formula: stats.regressionYX.formulaLine,
                        sub: stats.regressionYX.substitutionLine
                    }}
                    steps={stats.regressionYX.steps}
                />

                <SolverRow 
                    index={3}
                    title="Regression Line of X on Y"
                    formula={stats.regressionXY.formulaB}
                    variables={stats.regressionXY.variablesB}
                    substitution={stats.regressionXY.substitutionB}
                    answer={stats.regressionXY.eqn}
                    description="Used to estimate X when Y is known. Minimizes horizontal squared deviations."
                    extraProcess={{
                        formula: stats.regressionXY.formulaLine,
                        sub: stats.regressionXY.substitutionLine
                    }}
                    steps={stats.regressionXY.steps}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <MagneticTiltCard className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
                        <div className="text-[10px] font-black text-skin-muted/60 uppercase tracking-[0.4em]">Node_Summary_X</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-mono text-skin-muted">Mean (x̄):</span>
                            <ScrambleText value={stats.meanX} className="text-3xl font-mono font-bold text-skin-text tracking-tight" />
                        </div>
                    </MagneticTiltCard>
                </div>
                <div>
                    <MagneticTiltCard className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
                        <div className="text-[10px] font-black text-skin-muted/60 uppercase tracking-[0.4em]">Node_Summary_Y</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-mono text-skin-muted">Mean (ȳ):</span>
                            <ScrambleText value={stats.meanY} className="text-3xl font-mono font-bold text-skin-text tracking-tight" />
                        </div>
                    </MagneticTiltCard>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
