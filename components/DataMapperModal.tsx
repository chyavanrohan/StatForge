
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Database, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRightLeft,
  LayoutGrid,
  ListFilter,
  BarChart2,
  Settings2,
  AlertCircle
} from 'lucide-react';
import { DataType } from '../types';

interface DataMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  rawData: any[][];
  onComplete: (processedData: any[], mode: DataType) => void;
}

export const DataMapperModal: React.FC<DataMapperModalProps> = ({ 
  isOpen, 
  onClose, 
  headers, 
  rawData, 
  onComplete 
}) => {
  const [mode, setMode] = useState<DataType>(DataType.UNGROUPED);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);

  // Reset mapping when mode changes
  useEffect(() => {
    setMapping({});
  }, [mode]);

  const handleMap = (slot: string, header: string) => {
    setMapping(prev => ({ ...prev, [slot]: header }));
  };

  const cleanValue = (val: any): number => {
    if (val === null || val === undefined) return 0;
    // Sanitization: Strip out non-numeric characters except decimal point and minus sign
    const sanitized = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(sanitized);
    if (isNaN(num)) return 0;
    // Floating Point Fix: Round to 2 decimal places
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const handleImport = () => {
    const processed: any[] = [];
    
    // Skip header row if it exists in rawData (usually rawData[0] is headers if passed from PapaParse/XLSX)
    // But here 'headers' is passed separately, so rawData might already be just data or include headers.
    // Let's assume rawData passed here is the full array including headers at index 0.
    const dataRows = rawData.slice(1);

    dataRows.forEach(row => {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, i) => {
        rowObj[h] = row[i];
      });

      if (mode === DataType.UNGROUPED) {
        const val = cleanValue(rowObj[mapping['data']]);
        processed.push(val);
      } else if (mode === DataType.GROUPED_DISCRETE) {
        const val = cleanValue(rowObj[mapping['data']]);
        const freq = Math.max(0, Math.floor(cleanValue(rowObj[mapping['freq']])));
        processed.push({ x: val, f: freq });
      } else if (mode === DataType.GROUPED_CONTINUOUS) {
        const range = String(rowObj[mapping['data']]);
        const freq = Math.max(0, Math.floor(cleanValue(rowObj[mapping['freq']])));
        
        // Parse range "10-20"
        const match = range.match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
        if (match) {
          const lower = parseFloat(match[1]);
          const upper = parseFloat(match[2]);
          const midpoint = (lower + upper) / 2;
          processed.push({ lower, upper, f: freq, midpoint });
        } else {
          // Fallback if range is just a single number
          const val = cleanValue(range);
          processed.push({ lower: val, upper: val, f: freq, midpoint: val });
        }
      } else if (mode === DataType.BIVARIATE) {
        const x = cleanValue(rowObj[mapping['x']]);
        const y = cleanValue(rowObj[mapping['y']]);
        processed.push({ x, y });
      }
    });

    onComplete(processed, mode);
  };

  const isMappingComplete = () => {
    if (mode === DataType.UNGROUPED) return !!mapping['data'];
    if (mode === DataType.GROUPED_DISCRETE || mode === DataType.GROUPED_CONTINUOUS) return !!mapping['data'] && !!mapping['freq'];
    if (mode === DataType.BIVARIATE) return !!mapping['x'] && !!mapping['y'];
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-skin-surface border border-white/10 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-skin-accent/10 rounded-2xl">
              <Database className="w-6 h-6 text-skin-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-skin-text uppercase tracking-wider">Staging & Mapping</h2>
              <p className="text-xs text-skin-muted font-mono">Configure your dataset for analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-skin-muted transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {/* Step 1: Analysis Mode */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-skin-accent/20 flex items-center justify-center text-skin-accent text-xs font-bold border border-skin-accent/30">1</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Select Analysis Mode</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: DataType.UNGROUPED, label: 'Ungrouped', icon: ListFilter, desc: 'Single list of values' },
                { id: DataType.GROUPED_DISCRETE, label: 'Grouped', icon: LayoutGrid, desc: 'Values with frequencies' },
                { id: DataType.GROUPED_CONTINUOUS, label: 'Class Interval', icon: BarChart2, desc: 'Ranges with frequencies' },
                { id: DataType.BIVARIATE, label: 'Bivariate', icon: ArrowRightLeft, desc: 'X and Y pairs' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all group relative overflow-hidden ${
                    mode === item.id 
                    ? 'bg-skin-accent/10 border-skin-accent shadow-[0_0_30px_rgba(var(--color-accent),0.1)]' 
                    : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <item.icon className={`w-6 h-6 mb-3 transition-colors ${mode === item.id ? 'text-skin-accent' : 'text-skin-muted'}`} />
                  <div className="font-bold text-xs text-white uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{item.desc}</div>
                  {mode === item.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-4 h-4 text-skin-accent" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Column Mapping */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-skin-accent/20 flex items-center justify-center text-skin-accent text-xs font-bold border border-skin-accent/30">2</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Map Your Columns</h3>
            </div>

            <div className="bg-black/40 rounded-3xl border border-white/5 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Available Columns */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Available Headers</label>
                    <span className="text-[9px] font-mono text-skin-accent bg-skin-accent/10 px-2 py-0.5 rounded">{headers.length} Columns Found</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {headers.map(header => (
                      <div 
                        key={header}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-skin-accent/50 transition-colors cursor-default"
                      >
                        {header}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapping Slots */}
                <div className="space-y-6">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Slots</label>
                  
                  <div className="space-y-4">
                    {mode === DataType.UNGROUPED && (
                      <MappingSlot 
                        label="Data Column" 
                        value={mapping['data']} 
                        options={headers} 
                        onChange={(val) => handleMap('data', val)} 
                      />
                    )}
                    {(mode === DataType.GROUPED_DISCRETE || mode === DataType.GROUPED_CONTINUOUS) && (
                      <>
                        <MappingSlot 
                          label="Data Column" 
                          value={mapping['data']} 
                          options={headers} 
                          onChange={(val) => handleMap('data', val)} 
                        />
                        <MappingSlot 
                          label="Frequency Column" 
                          value={mapping['freq']} 
                          options={headers} 
                          onChange={(val) => handleMap('freq', val)} 
                        />
                      </>
                    )}
                    {mode === DataType.BIVARIATE && (
                      <>
                        <MappingSlot 
                          label="X Variable" 
                          value={mapping['x']} 
                          options={headers} 
                          onChange={(val) => handleMap('x', val)} 
                        />
                        <MappingSlot 
                          label="Y Variable" 
                          value={mapping['y']} 
                          options={headers} 
                          onChange={(val) => handleMap('y', val)} 
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Cleaning Info */}
          <div className="p-6 bg-skin-accent/5 border border-skin-accent/20 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-skin-accent/10 rounded-xl">
              <Settings2 className="w-5 h-5 text-skin-accent" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Smart Cleaning Active</h4>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                StatForge will automatically sanitize inputs, strip currency symbols, and round floating-point values to 2 decimal places for optimal precision.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
            <AlertCircle className="w-3 h-3" />
            <span>{rawData.length - 1} rows will be processed</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleImport}
              disabled={!isMappingComplete()}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                isMappingComplete() 
                ? 'bg-skin-accent text-black shadow-lg shadow-skin-accent/20 hover:brightness-110' 
                : 'bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5'
              }`}
            >
              Finalize Import <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface MappingSlotProps {
  label: string;
  value?: string;
  options: string[];
  onChange: (val: string) => void;
}

const MappingSlot: React.FC<MappingSlotProps> = ({ label, value, options, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{label}</div>
      <select 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-skin-accent focus:outline-none focus:border-skin-accent/50 transition-colors appearance-none cursor-pointer"
      >
        <option value="" disabled>Select Column...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
};
