
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataType, Dataset } from '../types';
import { 
  Upload, 
  FileSpreadsheet, 
  Keyboard, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Database,
  Table as TableIcon,
  Settings2,
  ArrowRightLeft,
  Trash2,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { FormatGuideModal } from './FormatGuideModal';
import { motion, AnimatePresence } from 'framer-motion';

interface DataStudioProps {
  onDataSubmit: (data: Dataset) => void;
}

export const DataStudio: React.FC<DataStudioProps> = ({ onDataSubmit }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'manual'>('import');
  const [mode, setMode] = useState<DataType>(DataType.UNGROUPED);
  
  // File Import State
  const [rawFileData, setRawFileData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manual Entry State
  const [manualText, setManualText] = useState('');
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. DATA CLEANING UTILITY ---
  const cleanValue = (val: any): any => {
    if (typeof val === 'number') {
      // Round to 2 decimal places if it's a number
      return Math.round((val + Number.EPSILON) * 100) / 100;
    }
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) return Math.round((num + Number.EPSILON) * 100) / 100;
    }
    return val;
  };

  // --- 2. ASYNC PROCESSING ---
  const processRawData = async (data: any[][]) => {
    setIsProcessing(true);
    setError(null);

    // Simulate Web Worker / Async for large datasets
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const cleaned = data.map(row => row.map(cleanValue));
        setRawFileData(cleaned);
        
        if (cleaned.length > 0) {
          const detectedHeaders = cleaned[0].map((h, i) => h ? String(h) : `Column ${i + 1}`);
          setHeaders(detectedHeaders);
          
          // Auto-map first few columns as a courtesy
          const initialMapping: Record<string, string> = {};
          if (mode === DataType.UNGROUPED) initialMapping['data'] = detectedHeaders[0];
          if (mode === DataType.BIVARIATE) {
            initialMapping['x'] = detectedHeaders[0];
            initialMapping['y'] = detectedHeaders[1] || detectedHeaders[0];
          }
          if (mode === DataType.GROUPED_DISCRETE || mode === DataType.GROUPED_CONTINUOUS) {
            initialMapping['data'] = detectedHeaders[0];
            initialMapping['freq'] = detectedHeaders[1] || detectedHeaders[0];
          }
          setMapping(initialMapping);
        }
        
        setIsProcessing(false);
        resolve();
      }, data.length > 5000 ? 500 : 100);
    });
  };

  // --- 3. FILE HANDLERS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          processRawData(json);
        } catch (err: any) { setError("Excel Import Error: " + err.message); }
      };
      reader.readAsBinaryString(file);
    } else if (isCsv) {
      Papa.parse(file, {
        complete: (results) => {
          processRawData(results.data as any[][]);
        },
        error: (err) => setError("CSV Import Error: " + err.message),
        header: false,
        skipEmptyLines: true
      });
    } else {
      setError("Unsupported format. Use .csv or .xlsx");
    }
  };

  // --- 4. MAPPING LOGIC ---
  const handleMappingChange = (variable: string, column: string) => {
    setMapping(prev => ({ ...prev, [variable]: column }));
  };

  const isMappingComplete = useMemo(() => {
    if (mode === DataType.UNGROUPED) return !!mapping['data'];
    if (mode === DataType.BIVARIATE) return !!mapping['x'] && !!mapping['y'];
    if (mode === DataType.GROUPED_DISCRETE || mode === DataType.GROUPED_CONTINUOUS) return !!mapping['data'] && !!mapping['freq'];
    return false;
  }, [mode, mapping]);

  // --- 5. LAUNCH COMPUTATION ---
  const handleLaunch = () => {
    if (activeTab === 'manual') {
      // Use original manual parsing logic
      parseManualEntry();
      return;
    }

    if (!isMappingComplete) {
      setError("Please map all required variables to columns.");
      return;
    }

    try {
      const dataRows = rawFileData.slice(1); // Skip headers
      const colIndices: Record<string, number> = {};
      Object.entries(mapping).forEach(([varName, colName]) => {
        colIndices[varName] = headers.indexOf(colName);
      });

      let dataPayload: any[] = [];
      let totalFreq = 0;

      if (mode === DataType.UNGROUPED) {
        dataPayload = dataRows
          .map(row => ({ x: parseFloat(row[colIndices['data']]) }))
          .filter(d => !isNaN(d.x));
        totalFreq = dataPayload.length;
      } else if (mode === DataType.BIVARIATE) {
        dataPayload = dataRows
          .map(row => ({ 
            x: parseFloat(row[colIndices['x']]), 
            y: parseFloat(row[colIndices['y']]) 
          }))
          .filter(d => !isNaN(d.x) && !isNaN(d.y));
        totalFreq = dataPayload.length;
      } else if (mode === DataType.GROUPED_DISCRETE) {
        dataPayload = dataRows
          .map(row => ({ 
            x: parseFloat(row[colIndices['data']]), 
            f: Math.max(0, Math.floor(parseFloat(row[colIndices['freq']]) || 0))
          }))
          .filter(d => !isNaN(d.x) && d.f > 0);
        totalFreq = dataPayload.reduce((acc, curr) => acc + curr.f, 0);
      } else if (mode === DataType.GROUPED_CONTINUOUS) {
        dataPayload = dataRows
          .map(row => {
            const rangeStr = String(row[colIndices['data']]);
            const match = rangeStr.match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
            const f = parseFloat(row[colIndices['freq']]);
            if (!match || isNaN(f)) return null;
            const lower = parseFloat(match[1]);
            const upper = parseFloat(match[2]);
            return { lower, upper, f, midpoint: (lower + upper) / 2 };
          })
          .filter(d => d !== null);
        totalFreq = dataPayload.reduce((acc, curr) => acc + curr.f, 0);
      }

      onDataSubmit({ type: mode, data: dataPayload, totalFrequency: totalFreq });
    } catch (err: any) {
      setError("Launch Error: " + err.message);
    }
  };

  const parseManualEntry = () => {
    if (!manualText.trim()) {
      setError("Manual entry is empty.");
      return;
    }

    try {
      const lines = manualText.trim().split('\n').filter(l => l.trim() !== '');
      let dataPayload: any[] = [];
      let totalFreq = 0;

      if (mode === DataType.UNGROUPED) {
        const values = manualText.replace(/[:\-]/g, ' ').split(/[\s,]+/)
          .map(v => parseFloat(v))
          .filter(n => !isNaN(n));
        dataPayload = values.map(x => ({ x }));
        totalFreq = values.length;
      } else if (mode === DataType.BIVARIATE) {
        dataPayload = lines.map(line => {
          const parts = line.split(/[\s,]+/).map(v => parseFloat(v)).filter(n => !isNaN(n));
          if (parts.length < 2) throw new Error(`Line "${line}" needs X and Y`);
          return { x: parts[0], y: parts[1] };
        });
        totalFreq = dataPayload.length;
      } else if (mode === DataType.GROUPED_DISCRETE) {
        lines.forEach(line => {
          const parts = line.split(/[:\s,]+/).map(v => parseFloat(v));
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            dataPayload.push({ x: parts[0], f: Math.floor(parts[1]) });
            totalFreq += Math.floor(parts[1]);
          }
        });
      } else if (mode === DataType.GROUPED_CONTINUOUS) {
        dataPayload = lines.map(line => {
          const parts = line.split(':');
          const range = parts[0].trim().match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
          const f = parseFloat(parts[1]);
          if (!range || isNaN(f)) return null;
          return { lower: parseFloat(range[1]), upper: parseFloat(range[2]), f, midpoint: (parseFloat(range[1])+parseFloat(range[2]))/2 };
        }).filter(d => d !== null);
        totalFreq = dataPayload.reduce((acc, curr) => acc + curr.f, 0);
      }

      onDataSubmit({ type: mode, data: dataPayload, totalFrequency: totalFreq });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSample = () => {
    if (mode === DataType.BIVARIATE) {
      setManualText("10, 15\n20, 25\n30, 35\n40, 45\n50, 55");
    } else if (mode === DataType.GROUPED_CONTINUOUS) {
      setManualText("0-10: 5\n10-20: 12\n20-30: 8\n30-40: 3");
    } else if (mode === DataType.GROUPED_DISCRETE) {
      setManualText("10: 5\n20: 12\n30: 8\n40: 3");
    } else {
      setManualText("12, 15, 22, 28, 35, 42, 48, 55, 62, 70");
    }
  };

  const resetStudio = () => {
    setRawFileData([]);
    setHeaders([]);
    setMapping({});
    setError(null);
    setManualText('');
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
      <FormatGuideModal 
        isOpen={showFormatGuide} 
        onClose={() => setShowFormatGuide(false)} 
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-full bg-black/40 backdrop-blur-3xl"
      >
        {/* Header Section */}
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-skin-accent/20 flex items-center justify-center border border-skin-accent/30">
              <Database className="w-6 h-6 text-skin-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Data Studio</h2>
              <p className="text-sm text-zinc-500 font-medium">Configure your dataset for high-performance analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {[
              { id: DataType.UNGROUPED, label: 'Ungrouped' },
              { id: DataType.BIVARIATE, label: 'Bivariate' },
              { id: DataType.GROUPED_DISCRETE, label: 'Discrete' },
              { id: DataType.GROUPED_CONTINUOUS, label: 'Continuous' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); resetStudio(); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  mode === m.id 
                    ? 'bg-skin-accent text-black shadow-lg shadow-skin-accent/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Split View */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Inputs */}
          <div className="w-full lg:w-[450px] border-r border-white/5 flex flex-col bg-black/20">
            <div className="flex p-4 gap-2 border-b border-white/5">
              <button 
                onClick={() => setActiveTab('import')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'import' ? 'bg-white/10 text-skin-accent border border-skin-accent/30' : 'text-zinc-500 hover:bg-white/5'
                }`}
              >
                <Upload className="w-4 h-4" /> Smart Import
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'manual' ? 'bg-white/10 text-skin-accent border border-skin-accent/30' : 'text-zinc-500 hover:bg-white/5'
                }`}
              >
                <Keyboard className="w-4 h-4" /> Manual Entry
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <AnimatePresence mode="wait">
                {activeTab === 'import' ? (
                  <motion.div 
                    key="import"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {rawFileData.length === 0 ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:bg-skin-accent/5 cursor-pointer transition-all group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-skin-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <FileSpreadsheet className="w-16 h-16 text-zinc-700 mx-auto mb-6 group-hover:text-skin-accent transition-colors duration-500" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Drop Dataset Here</h3>
                        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">Excel or CSV files supported.<br/>Auto-detection enabled.</p>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">File Loaded Successfully</span>
                          </div>
                          <button onClick={resetStudio} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <ArrowRightLeft className="w-4 h-4 text-skin-accent" />
                               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Variable Mapper</span>
                             </div>
                             <button 
                               onClick={() => setShowFormatGuide(true)}
                               className="text-[10px] font-bold text-zinc-500 hover:text-skin-accent uppercase tracking-widest transition-colors"
                             >
                               Format Guide
                             </button>
                          </div>
                          
                          <div className="grid gap-4">
                            {mode === DataType.UNGROUPED && (
                              <MappingDropdown 
                                label="Data Column" 
                                value={mapping['data']} 
                                options={headers} 
                                onChange={(val) => handleMappingChange('data', val)} 
                              />
                            )}
                            {mode === DataType.BIVARIATE && (
                              <>
                                <MappingDropdown label="X Variable" value={mapping['x']} options={headers} onChange={(val) => handleMappingChange('x', val)} />
                                <MappingDropdown label="Y Variable" value={mapping['y']} options={headers} onChange={(val) => handleMappingChange('y', val)} />
                              </>
                            )}
                            {(mode === DataType.GROUPED_DISCRETE || mode === DataType.GROUPED_CONTINUOUS) && (
                              <>
                                <MappingDropdown label="Data Column" value={mapping['data']} options={headers} onChange={(val) => handleMappingChange('data', val)} />
                                <MappingDropdown label="Frequency Column" value={mapping['freq']} options={headers} onChange={(val) => handleMappingChange('freq', val)} />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="manual"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 h-full flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Manual Entry Buffer</span>
                      <button onClick={loadSample} className="text-[10px] text-skin-accent hover:text-white transition-colors font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Load Sample
                      </button>
                    </div>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="flex-1 min-h-[300px] w-full bg-black/40 border-2 border-white/5 rounded-3xl p-6 text-skin-accent font-mono text-sm focus:outline-none focus:border-skin-accent/40 shadow-inner resize-none transition-all"
                      placeholder={
                        mode === DataType.BIVARIATE ? "10, 15\n20, 25..." : 
                        mode === DataType.GROUPED_CONTINUOUS ? "10-20: 5\n20-30: 3" : 
                        "12, 15, 20..."
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 border-t border-white/5 bg-black/40">
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-[11px] font-mono animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="w-4 h-4 flex-none" />
                  <span>{error}</span>
                </div>
              )}
              <button 
                onClick={handleLaunch}
                disabled={isProcessing}
                className="w-full bg-skin-accent hover:brightness-110 disabled:opacity-50 text-black px-8 py-5 rounded-2xl text-xs font-black tracking-[0.3em] uppercase transition-all shadow-[0_20px_40px_-10px_rgba(var(--color-accent),0.3)] flex justify-center items-center gap-3 group"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                    Launch Computation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="flex-1 flex flex-col bg-black/40 relative">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <TableIcon className="w-5 h-5 text-skin-accent" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Live Data Preview</h3>
              </div>
              {rawFileData.length > 0 && (
                <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                  Showing first 50 of {rawFileData.length - 1} rows
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
              {rawFileData.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-md border-b border-white/10">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-r border-white/5 w-12 text-center">#</th>
                      {headers.map((header, i) => (
                        <th key={i} className="p-4 text-[10px] font-black text-skin-accent uppercase tracking-widest min-w-[120px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rawFileData.slice(1, 51).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-[10px] font-mono text-zinc-600 border-r border-white/5 text-center group-hover:text-zinc-400">{rowIndex + 1}</td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-4 text-xs font-mono text-zinc-300 group-hover:text-white transition-colors">
                            {cell !== undefined && cell !== null ? String(cell) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 p-12 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center mb-6">
                    <Settings2 className="w-8 h-8 opacity-20" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest mb-2">No Active Stream</h4>
                  <p className="text-xs max-w-[280px] leading-relaxed">Upload a file or enter data manually to see the live preview grid.</p>
                </div>
              )}
            </div>

            {/* Subtle Overlay for empty state */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-skin-accent/20 border-t-skin-accent animate-spin rounded-full" />
                  <span className="text-[10px] font-black text-skin-accent uppercase tracking-[0.3em]">Processing Dataset...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface MappingDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

const MappingDropdown: React.FC<MappingDropdownProps> = ({ label, value, options, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block ml-1">{label}</label>
      <div className="relative group">
        <select 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none focus:outline-none focus:border-skin-accent/50 transition-all cursor-pointer group-hover:bg-black/80"
        >
          <option value="" disabled>Select Column</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  );
};
