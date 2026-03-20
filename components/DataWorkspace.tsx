
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Trash2,
  Settings2,
  Table as TableIcon,
  Download,
  HelpCircle,
  X
} from 'lucide-react';
import { FixedSizeList } from 'react-window';
import { DataType, Dataset } from '../types';
import { FormatGuideModal } from './FormatGuideModal';

interface DataWorkspaceProps {
  onDataSubmit: (data: Dataset) => void;
  onReset: () => void;
}

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW';
type ColumnRole = 'x' | 'y' | 'f' | 'ignore';

interface ColumnMapping {
  index: number;
  header: string;
  role: ColumnRole;
}

export const DataWorkspace: React.FC<DataWorkspaceProps> = ({ onDataSubmit, onReset }) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [detectedMode, setDetectedMode] = useState<DataType>(DataType.UNGROUPED);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/dataWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { success, data, error } = e.data;
      setIsProcessing(false);
      if (success) {
        if (data.length > 0) {
          setHeaders(data[0].map((h: any) => String(h || `Column ${data[0].indexOf(h) + 1}`)));
          setRawData(data.slice(1));
          
          // Initial Mappings
          const initialMappings: ColumnMapping[] = data[0].map((h: any, i: number) => {
            const header = String(h).toLowerCase();
            let role: ColumnRole = 'ignore';
            if (i === 0) role = 'x';
            else if (header === 'f' || header === 'frequency' || header === 'freq') role = 'f';
            else if (header === 'y') role = 'y';
            
            return { index: i, header: String(h), role };
          });
          setMappings(initialMappings);
          setStep('MAPPING');
        } else {
          setError("File appears to be empty.");
        }
      } else {
        setError(error || "Failed to process file.");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFile = (file: File) => {
    setError(null);
    setIsProcessing(true);
    const type = file.name.endsWith('.csv') ? 'csv' : 'excel';
    workerRef.current?.postMessage({ file, type });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRoleChange = (index: number, role: ColumnRole) => {
    setMappings(prev => prev.map(m => {
      if (m.index === index) return { ...m, role };
      // Ensure only one X, Y, or F if needed, but let's allow multiple for now if the user wants
      // Actually, for our modes, we usually need specific counts.
      return m;
    }));
  };

  // Dynamic Mode Detection based on mappings
  useEffect(() => {
    const activeRoles = mappings.filter(m => m.role !== 'ignore').map(m => m.role);
    const hasX = activeRoles.includes('x');
    const hasY = activeRoles.includes('y');
    const hasF = activeRoles.includes('f');

    if (hasX && hasY) setDetectedMode(DataType.BIVARIATE);
    else if (hasX && hasF) {
      // Check if X contains hyphens for continuous
      const xIndex = mappings.find(m => m.role === 'x')?.index;
      const isContinuous = rawData.some(row => String(row[xIndex!]).includes('-'));
      setDetectedMode(isContinuous ? DataType.GROUPED_CONTINUOUS : DataType.GROUPED_DISCRETE);
    }
    else if (hasX) setDetectedMode(DataType.UNGROUPED);
  }, [mappings, rawData]);

  const finalizeData = () => {
    try {
      const activeMappings = mappings.filter(m => m.role !== 'ignore');
      const xMap = activeMappings.find(m => m.role === 'x');
      const yMap = activeMappings.find(m => m.role === 'y');
      const fMap = activeMappings.find(m => m.role === 'f');

      if (!xMap) throw new Error("At least one column must be assigned as 'Variable X'");

      let dataPayload: any[] = [];
      let totalFreq = 0;

      if (detectedMode === DataType.BIVARIATE) {
        if (!yMap) throw new Error("Bivariate mode requires a 'Variable Y' column");
        dataPayload = rawData.map(row => ({
          x: parseFloat(row[xMap.index]),
          y: parseFloat(row[yMap.index])
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));
        totalFreq = dataPayload.length;
      } else if (detectedMode === DataType.GROUPED_DISCRETE || detectedMode === DataType.GROUPED_CONTINUOUS) {
        if (!fMap) throw new Error("Grouped modes require a 'Frequency' column");
        
        if (detectedMode === DataType.GROUPED_CONTINUOUS) {
          dataPayload = rawData.map(row => {
            const rangeStr = String(row[xMap.index]);
            const freq = parseFloat(row[fMap.index]);
            const rangeMatch = rangeStr.match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
            if (rangeMatch && !isNaN(freq)) {
              const lower = parseFloat(rangeMatch[1]);
              const upper = parseFloat(rangeMatch[2]);
              return { lower, upper, f: freq, midpoint: (lower + upper) / 2 };
            }
            return null;
          }).filter(d => d !== null);
        } else {
          dataPayload = rawData.map(row => ({
            x: parseFloat(row[xMap.index]),
            f: parseFloat(row[fMap.index])
          })).filter(d => !isNaN(d.x) && !isNaN(d.f));
        }
        totalFreq = dataPayload.reduce((acc, curr) => acc + (curr.f || 0), 0);
      } else {
        // Ungrouped
        dataPayload = rawData.map(row => ({
          x: parseFloat(row[xMap.index])
        })).filter(d => !isNaN(d.x));
        totalFreq = dataPayload.length;
      }

      onDataSubmit({
        type: detectedMode,
        data: dataPayload,
        totalFrequency: totalFreq
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => (
    <div style={style} className="flex border-b border-skin-border/5 hover:bg-skin-accent/5 transition-colors items-center px-4">
      <div className="w-12 flex-none text-[10px] font-mono text-skin-muted">{index + 1}</div>
      {mappings.map((m) => (
        <div 
          key={m.index} 
          className={`flex-1 px-4 py-2 text-xs font-mono truncate ${m.role === 'ignore' ? 'opacity-30' : 'text-skin-text'}`}
        >
          {rawData[index][m.index]}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col items-center justify-center p-4 sm:p-8">
      <FormatGuideModal isOpen={showFormatGuide} onClose={() => setShowFormatGuide(false)} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full glass-panel rounded-[2.5rem] border border-skin-border/10 shadow-2xl overflow-hidden flex flex-col min-h-[600px] max-h-[85vh]"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Header / Stepper */}
        <div className="p-8 border-b border-skin-border/10 bg-skin-surface/40 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-skin-accent/10 rounded-2xl border border-skin-accent/20">
              <Database className="w-6 h-6 text-skin-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-skin-text tracking-tight uppercase">Data Workspace</h2>
              <p className="text-[10px] text-skin-muted font-mono tracking-[0.2em] mt-1">Intelligent Ingestion Engine v2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-skin-surface/40 p-1.5 rounded-2xl border border-skin-border/10">
            {[
              { id: 'UPLOAD', label: 'Ingest', icon: Upload },
              { id: 'MAPPING', label: 'Map', icon: Settings2 },
              { id: 'PREVIEW', label: 'Verify', icon: TableIcon }
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 ${step === s.id ? 'bg-skin-accent text-skin-base shadow-lg shadow-skin-accent/20' : 'text-skin-muted'}`}>
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-skin-muted" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'UPLOAD' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="h-full flex flex-col items-center justify-center p-12"
              >
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-2xl aspect-video border-2 border-dashed border-skin-border/10 rounded-[3rem] flex flex-col items-center justify-center gap-6 hover:bg-skin-accent/5 hover:border-skin-accent/40 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-skin-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-skin-accent/20 border-t-skin-accent rounded-full animate-spin" />
                      <p className="text-xs font-mono text-skin-accent animate-pulse uppercase tracking-widest">Processing Dataset...</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="absolute -inset-4 bg-skin-accent/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Upload className="w-16 h-16 text-skin-muted group-hover:text-skin-accent transition-all duration-500 group-hover:-translate-y-2" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-skin-text uppercase tracking-widest mb-2">Drop Raw Intelligence</h3>
                        <p className="text-xs text-skin-muted font-mono">Supports .CSV, .XLSX, .XLS (Up to 50k rows)</p>
                      </div>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>

                <button 
                  onClick={() => setShowFormatGuide(true)}
                  className="mt-8 flex items-center gap-2 text-[10px] font-bold text-skin-muted hover:text-skin-accent uppercase tracking-[0.3em] transition-all group"
                >
                  <HelpCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  How should I format my data?
                </button>
              </motion.div>
            )}

            {step === 'MAPPING' && (
              <motion.div 
                key="mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-skin-text uppercase tracking-widest">Column Mapping Engine</h3>
                    <p className="text-[10px] text-skin-muted font-mono mt-1">Assign roles to detected headers to define analysis logic</p>
                  </div>
                  <div className="px-4 py-2 bg-skin-accent/10 border border-skin-accent/20 rounded-xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-skin-accent animate-pulse" />
                    <span className="text-[10px] font-bold text-skin-accent uppercase tracking-widest">Mode: {detectedMode.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mappings.map((m) => (
                      <div 
                        key={m.index}
                        className={`p-6 rounded-2xl border transition-all duration-300 ${m.role !== 'ignore' ? 'bg-skin-accent/5 border-skin-accent/30 shadow-lg shadow-skin-accent/5' : 'bg-skin-surface/40 border-skin-border/10 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${m.role !== 'ignore' ? 'bg-skin-accent/20 text-skin-accent' : 'bg-skin-accent/5 text-skin-muted'}`}>
                              <TableIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-skin-text truncate max-w-[120px]">{m.header}</span>
                          </div>
                          <span className="text-[9px] font-mono text-skin-muted uppercase">Col {m.index + 1}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'x', label: 'Var X' },
                            { id: 'y', label: 'Var Y' },
                            { id: 'f', label: 'Freq' },
                            { id: 'ignore', label: 'Ignore' }
                          ].map((role) => (
                            <button
                              key={role.id}
                              onClick={() => handleRoleChange(m.index, role.id as ColumnRole)}
                              className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${m.role === role.id ? 'bg-skin-accent text-skin-base' : 'bg-skin-surface/40 text-skin-muted hover:bg-skin-accent/5'}`}
                            >
                              {role.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-between items-center pt-6 border-t border-skin-border/10">
                  <button onClick={() => setStep('UPLOAD')} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-skin-border/10 text-skin-muted hover:text-skin-text hover:bg-skin-accent/5 transition-all text-xs font-bold uppercase tracking-widest">
                    <ChevronLeft className="w-4 h-4" /> Back to Ingest
                  </button>
                  <button onClick={() => setStep('PREVIEW')} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-skin-accent text-skin-base hover:brightness-110 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-skin-accent/20">
                    Verify Data <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'PREVIEW' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col overflow-hidden"
              >
                <div className="p-8 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-skin-text uppercase tracking-widest">Sanitized Data Preview</h3>
                    <p className="text-[10px] text-skin-muted font-mono mt-1">Virtualizing {rawData.length} rows with 2-decimal precision</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-skin-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      AUTO-ROUNDED
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-skin-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      VIRTUALIZED
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-skin-surface/20 mx-8 mb-4 rounded-2xl border border-skin-border/10 overflow-hidden flex flex-col">
                  {/* Table Header */}
                  <div className="flex bg-skin-surface/40 border-b border-skin-border/10 px-4 py-3 items-center">
                    <div className="w-12 flex-none text-[10px] font-mono text-skin-muted uppercase tracking-widest">#</div>
                    {mappings.map((m) => (
                      <div 
                        key={m.index} 
                        className={`flex-1 px-4 text-[10px] font-bold uppercase tracking-widest truncate ${m.role === 'ignore' ? 'text-skin-muted/40' : 'text-skin-accent'}`}
                      >
                        {m.header}
                        {m.role !== 'ignore' && <span className="ml-2 text-[8px] opacity-50">({m.role.toUpperCase()})</span>}
                      </div>
                    ))}
                  </div>
                  
                  {/* Virtualized List */}
                  <div className="flex-1">
                    <FixedSizeList
                      height={400} 
                      itemCount={rawData.length}
                      itemSize={40}
                      width="100%"
                      className="custom-scrollbar"
                    >
                      {Row}
                    </FixedSizeList>
                  </div>
                </div>

                <div className="p-8 pt-4 flex justify-between items-center border-t border-skin-border/10 bg-skin-surface/20">
                  <button onClick={() => setStep('MAPPING')} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-skin-border/10 text-skin-muted hover:text-skin-text hover:bg-skin-accent/5 transition-all text-xs font-bold uppercase tracking-widest">
                    <ChevronLeft className="w-4 h-4" /> Back to Mapping
                  </button>
                  <button onClick={finalizeData} className="flex items-center gap-3 px-10 py-4 rounded-xl bg-skin-accent text-skin-base hover:brightness-110 transition-all text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-skin-accent/30">
                    <CheckCircle2 className="w-5 h-5" /> Launch Analysis
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Overlay */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono shadow-2xl backdrop-blur-md z-50"
            >
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
