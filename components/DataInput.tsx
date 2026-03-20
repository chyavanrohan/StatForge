
import React, { useState, useEffect, useRef } from 'react';
import { DataType, Dataset } from '../types';
import { 
  AlertTriangle, 
  FileText, 
  Play, 
  Upload, 
  FileSpreadsheet, 
  Keyboard, 
  RotateCcw,
  Clock,
  X,
  Database,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Columns,
  Settings2,
  ArrowRight,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { FormatGuideModal } from './FormatGuideModal';
import { motion, AnimatePresence } from 'framer-motion';

interface DataInputProps {
  onDataSubmit: (data: Dataset) => void;
  currentDataset: Dataset | null;
  isSidebarOpen?: boolean;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  dateStr: string;
  mode: DataType;
  rawData: string;
}

export const DataInput: React.FC<DataInputProps> = ({ onDataSubmit, currentDataset, isSidebarOpen }) => {
  // --- 1. SINGLE SOURCE OF TRUTH ---
  // rawValues holds the actual data points. inputText is just a view.
  const [rawValues, setRawValues] = useState<number[]>([]);
  const [inputText, setInputText] = useState<string>('');
  
  const [inputType, setInputType] = useState<DataType>(DataType.UNGROUPED);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Staging & Mapping State
  const [stagingData, setStagingData] = useState<any[][] | null>(null);
  const [selectedCols, setSelectedCols] = useState<number[]>([]);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 2. PARSERS (Text -> Raw State) ---
  const parseToRaw = (text: string, type: DataType): number[] => {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.trim() !== '');
    
    // Parser: Ungrouped (Comma/Space separated)
    if (type === DataType.UNGROUPED) {
       return text.replace(/[:\-]/g, ' ').split(/[\s,]+/)
         .map(v => parseFloat(v))
         .filter(n => !isNaN(n));
    }

    // Parser: Grouped Discrete (Value: Freq)
    if (type === DataType.GROUPED_DISCRETE) {
       const expanded: number[] = [];
       lines.forEach(line => {
          const parts = line.split(/[:\s,]+/).map(v => parseFloat(v));
          // Expect format "Value: Frequency"
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
             const val = parts[0];
             const freq = Math.floor(Math.max(0, parts[1]));
             for(let i=0; i<freq; i++) expanded.push(val);
          }
       });
       return expanded;
    }

    // Parser: Class Interval (Lower-Upper: Freq) -> Destructive Midpoint Approx
    if (type === DataType.GROUPED_CONTINUOUS) {
       const expanded: number[] = [];
       lines.forEach(line => {
          const mainParts = line.split(':');
          if (mainParts.length < 2) return;
          
          const freq = parseFloat(mainParts[1]);
          const rangeStr = mainParts[0].trim();
          const rangeMatch = rangeStr.match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
          
          if (rangeMatch && !isNaN(freq)) {
             const lower = parseFloat(rangeMatch[1]);
             const upper = parseFloat(rangeMatch[2]);
             const mid = (lower + upper) / 2;
             const count = Math.floor(Math.max(0, freq));
             for(let i=0; i<count; i++) expanded.push(mid);
          }
       });
       return expanded;
    }

    return [];
  };

  // --- 3. VIEW FORMATTERS (Raw State -> Text Box) ---
  const formatFromRaw = (values: number[], type: DataType): string => {
    if (!values || values.length === 0) return '';

    // Formatter: Ungrouped
    if (type === DataType.UNGROUPED) {
       return values.join(', ');
    }

    // Formatter: Grouped Discrete
    if (type === DataType.GROUPED_DISCRETE) {
       const counts: Record<number, number> = {};
       values.forEach(n => counts[n] = (counts[n] || 0) + 1);
       return Object.keys(counts)
         .map(Number)
         .sort((a, b) => a - b)
         .map(k => `${k}: ${counts[k]}`)
         .join('\n');
    }

    // Formatter: Class Interval
    if (type === DataType.GROUPED_CONTINUOUS) {
       const min = Math.min(...values);
       const max = Math.max(...values);
       const n = values.length;
       if (n === 0 || min === max) return `${min}-${max + 1}: ${n}`;

       // Auto-binning using Sturges' Rule approx
       const k = Math.ceil(1 + 3.322 * Math.log10(n)) || 5;
       const range = max - min;
       // Ensure width is at least 1, nice numbers preferred
       let width = range / k;
       if (width < 1) width = 1;
       else width = Math.ceil(width * 10) / 10; 

       const bins: Record<string, number> = {};
       // Initialize bins to ensure order
       const binDefinitions: {l: number, u: number, label: string}[] = [];
       // Start strictly from min
       let currentLower = Math.floor(min);
       // Safety break
       let iterations = 0;
       
       while (currentLower <= max && iterations < 100) {
          const currentUpper = parseFloat((currentLower + width).toFixed(2));
          const label = `${currentLower}-${currentUpper}`;
          bins[label] = 0;
          binDefinitions.push({l: currentLower, u: currentUpper, label});
          currentLower = currentUpper;
          iterations++;
       }

       values.forEach(v => {
          const bin = binDefinitions.find(b => v >= b.l && v < b.u) || binDefinitions[binDefinitions.length - 1];
          if (bin) bins[bin.label] = (bins[bin.label] || 0) + 1;
       });

       return binDefinitions
         .filter(b => bins[b.label] > 0) // Hide empty bins for cleaner view
         .map(b => `${b.label}: ${bins[b.label]}`)
         .join('\n');
    }

    return '';
  };

  // --- 4. EFFECTS & HANDLERS ---

  // Load History
  useEffect(() => {
    const saved = localStorage.getItem('statforge_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // Sync Input Text when Mode Changes (Non-Destructive View Change)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (inputType === DataType.BIVARIATE) {
        // Special case for Bivariate: Independent text state, usually empty or sample
        if (!inputText.includes(',')) setInputText("10, 15\n20, 25\n30, 35");
        return;
    }
    // Re-run View Formatter on the untouched rawValues
    const formatted = formatFromRaw(rawValues, inputType);
    setInputText(formatted);
    setError(null);
  }, [inputType]);

  // Sync state when external Dataset is reset/loaded
  useEffect(() => {
    if (!currentDataset) {
        setInputText('');
        setRawValues([]);
        setError(null);
    }
  }, [currentDataset]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    // Live Parsing for Univariate Modes
    if (inputType !== DataType.BIVARIATE) {
        const newRaw = parseToRaw(text, inputType);
        setRawValues(newRaw);
    }
  };

  const submitData = (type: DataType, raw: number[], text: string, bivariateData?: any[]) => {
    try {
      if (type === DataType.BIVARIATE && bivariateData) {
        onDataSubmit({ type, data: bivariateData, totalFrequency: bivariateData.length });
        saveToHistory(type, text);
        return;
      }

      if (raw.length === 0) throw new Error("No numeric data detected.");
      
      let dataPayload: any[] = [];
      
      if (type === DataType.UNGROUPED) {
          dataPayload = raw.map(x => ({ x }));
      } else if (type === DataType.GROUPED_DISCRETE) {
          const counts: Record<number, number> = {};
          raw.forEach(n => counts[n] = (counts[n] || 0) + 1);
          dataPayload = Object.keys(counts).map(Number).sort((a,b)=>a-b).map(x => ({ x, f: counts[x] }));
      } else if (type === DataType.GROUPED_CONTINUOUS) {
          const lines = text.trim().split('\n').filter(l => l.trim() !== '');
          dataPayload = lines.map(line => {
             const parts = line.split(':');
             const range = parts[0].trim().match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/);
             const f = parseFloat(parts[1]);
             if (!range || isNaN(f)) return null;
             return { lower: parseFloat(range[1]), upper: parseFloat(range[2]), f, midpoint: (parseFloat(range[1])+parseFloat(range[2]))/2 };
          }).filter(d => d !== null);
          
          if (dataPayload.length === 0) throw new Error("Invalid Interval Format");
      }

      onDataSubmit({
        type,
        data: dataPayload,
        totalFrequency: raw.length
      });
      saveToHistory(type, text);

    } catch (err: any) {
      setError(err.message || "Parsing failed");
    }
  };

  const handleParse = () => {
    setError(null);
    if (!inputText.trim()) {
      setError('Data buffer empty.');
      return;
    }

    if (inputType === DataType.BIVARIATE) {
      const lines = inputText.trim().split('\n').filter(l => l.trim() !== '');
      const parsedData = lines.map(line => {
        const parts = line.split(/[\s,]+/).map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (parts.length < 2) throw new Error(`Coordinate Error: "${line}" (Requires X and Y)`);
        return { x: parts[0], y: parts[1] };
      });
      submitData(inputType, [], inputText, parsedData);
    } else {
      submitData(inputType, rawValues, inputText);
    }
  };

  // --- HELPERS ---
  const saveToHistory = (mode: DataType, text: string) => {
    if (!text.trim()) return;
    setHistory(prev => {
      if (prev.length > 0 && prev[0].rawData === text && prev[0].mode === mode) return prev;
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        mode,
        rawData: text
      };
      const updated = [newItem, ...prev].slice(0, 20);
      localStorage.setItem('statforge_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('statforge_history', JSON.stringify(updated));
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    if (item.mode !== DataType.BIVARIATE) {
        const raw = parseToRaw(item.rawData, item.mode);
        setRawValues(raw);
    }
    // We set inputType first, then wait a tick or force text
    // Actually, setting inputType triggers the effect which formats rawValues.
    // So for non-bivariate, we want to set rawValues THEN type.
    // But setting inputType triggers effect.
    // Solution: Set type, then immediately override text to match history EXACTLY.
    setInputType(item.mode);
    setTimeout(() => setInputText(item.rawData), 0);
    
    setActiveTab('manual');
    setShowHistory(false);
    setError(null);
  };

  const loadExample = () => {
    if (inputType === DataType.BIVARIATE) {
        setInputText("12, 18\n15, 22\n18, 28\n22, 35\n28, 48");
        return;
    }
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
    const points = Array.from({ length: 40 }, () => rand(10, 60));
    setRawValues(points);
    // Directly formatting here to skip the effect delay
    setInputText(formatFromRaw(points, inputType));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setMappingError(null);

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
          setStagingData(json);
          setSelectedCols([]);
        } catch (err: any) { setError("Excel Import Error: " + err.message); }
      };
      reader.readAsBinaryString(file);
    } else if (isCsv) {
      Papa.parse(file, {
        complete: (results) => {
          setStagingData(results.data as any[][]);
          setSelectedCols([]);
        },
        error: (err) => setError("CSV Import Error: " + err.message),
        header: false,
        skipEmptyLines: true
      });
    } else {
      setError("Unsupported file format. Please use .csv, .xlsx, or .xls");
    }
  };

  const cleanValue = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    
    let num: number;
    if (typeof val === 'number') {
      num = val;
    } else {
      // Strip non-numeric except decimal point and minus sign
      const sanitized = String(val).replace(/[^\d.-]/g, '');
      num = parseFloat(sanitized);
    }
    
    if (isNaN(num)) return 0;
    // Strictly round to 2 decimal places
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const confirmMapping = () => {
    if (!stagingData || selectedCols.length === 0) {
      setMappingError("Please select at least one column.");
      return;
    }

    setIsProcessing(true);
    setMappingError(null);

    // Use setTimeout to avoid blocking the UI thread for massive datasets
    setTimeout(() => {
      try {
        const dataRows = stagingData.slice(1); // Assume first row is header
        let rawText = "";
        let finalRawValues: number[] = [];

        if (inputType === DataType.BIVARIATE) {
          if (selectedCols.length < 2) {
            throw new Error("Bivariate analysis requires exactly 2 columns (X and Y).");
          }
          const colX = selectedCols[0];
          const colY = selectedCols[1];
          
          const parsedData = dataRows.map(row => ({
            x: cleanValue(row[colX]),
            y: cleanValue(row[colY])
          }));
          
          const text = parsedData.map(d => `${d.x}, ${d.y}`).join('\n');
          setInputText(text);
          submitData(inputType, [], text, parsedData);
        } else {
          // Univariate cleaning
          const colIdx = selectedCols[0];
          finalRawValues = dataRows.map(row => cleanValue(row[colIdx]));
          
          setRawValues(finalRawValues);
          const formatted = formatFromRaw(finalRawValues, inputType);
          setInputText(formatted);
          
          // Trigger final submit with fresh values
          submitData(inputType, finalRawValues, formatted); 
        }

        setStagingData(null);
        setSelectedCols([]);
        setActiveTab('manual');
        setToast({ message: `Successfully imported and cleaned ${dataRows.length} rows.`, type: 'success' });
      } catch (err: any) {
        setMappingError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const toggleColumn = (idx: number) => {
    setSelectedCols(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      if (inputType === DataType.BIVARIATE && prev.length >= 2) return [prev[1], idx];
      if (inputType !== DataType.BIVARIATE) return [idx];
      return [...prev, idx];
    });
  };

  const displayModes = [
    { type: DataType.UNGROUPED, label: 'Ungrouped Data' },
    { type: DataType.GROUPED_DISCRETE, label: 'Grouped Discrete' },
    { type: DataType.GROUPED_CONTINUOUS, label: 'Class Interval' },
    { type: DataType.BIVARIATE, label: 'Bivariate (X & Y)' }
  ];

  const getModeColor = (mode: DataType) => {
    switch (mode) {
      case DataType.UNGROUPED: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case DataType.GROUPED_DISCRETE: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case DataType.GROUPED_CONTINUOUS: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case DataType.BIVARIATE: return 'bg-skin-accent/20 text-skin-accent border-skin-accent/30';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div className="space-y-6 relative">
      <FormatGuideModal 
        isOpen={showFormatGuide} 
        onClose={() => setShowFormatGuide(false)} 
      />
      
      {/* Sleek Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[500] px-6 py-3 rounded-2xl glass-panel border border-skin-accent/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 min-w-[300px]"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <div className="p-1.5 bg-skin-accent/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-skin-accent" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODE SELECTOR --- */}
      <div className="space-y-3">
         <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Analysis Mode</label>
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-skin-accent/40 hover:text-skin-accent transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-400 group"
            >
              <RotateCcw className="w-3 h-3 group-hover:-rotate-180 transition-transform duration-500" />
              History
            </button>
         </div>
         <div className="grid grid-cols-2 gap-2">
            {displayModes.map((mode) => (
            <button
                key={mode.type}
                onClick={() => setInputType(mode.type)}
                className={`px-3 py-3 rounded-xl text-[10px] font-mono font-bold transition-colors duration-300 border text-left group relative overflow-hidden ${
                inputType === mode.type ? 'bg-skin-surface text-skin-accent border-skin-accent/40 shadow-xl' : 'bg-black/40 text-skin-muted border-white/5 hover:border-white/20'
                }`}
            >
                <div className={`absolute inset-0 w-1 bg-skin-accent transition-opacity duration-300 ${inputType === mode.type ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>
                <span className="relative z-10 block truncate">{mode.label}</span>
            </button>
            ))}
        </div>
      </div>

      {/* --- FORMAT GUIDE --- */}
      <div className="p-4 bg-black/40 border border-white/5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-3 h-3 text-skin-accent" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Input Format Guide</span>
        </div>
        <div className="bg-black/60 p-3 rounded-lg border border-white/5 font-mono">
          <div className="text-skin-accent text-xs mb-1">
            {inputType === DataType.UNGROUPED && "12, 15, 20, 25..."}
            {inputType === DataType.GROUPED_DISCRETE && "Value: Frequency (e.g. 10: 5)"}
            {inputType === DataType.GROUPED_CONTINUOUS && "Lower-Upper: Frequency (e.g. 10-20: 5)"}
            {inputType === DataType.BIVARIATE && "X, Y (e.g. 10, 15)"}
          </div>
          <div className="text-[9px] text-zinc-500 leading-relaxed">
            {inputType === DataType.UNGROUPED && "Enter raw values separated by commas or spaces."}
            {inputType === DataType.GROUPED_DISCRETE && "Enter each value and its frequency separated by a colon."}
            {inputType === DataType.GROUPED_CONTINUOUS && "Enter class intervals and frequencies (one per line)."}
            {inputType === DataType.BIVARIATE && "Enter coordinate pairs separated by a comma or space."}
          </div>
        </div>
      </div>

      {/* --- INPUT AREA --- */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex bg-black/60 p-1 rounded-xl mb-4 border border-white/5">
            <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-skin-surface text-skin-accent shadow-lg' : 'text-skin-muted'}`}><Keyboard className="w-3.5 h-3.5" /> Input</button>
            <button onClick={() => setActiveTab('import')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-skin-surface text-skin-accent shadow-lg' : 'text-skin-muted'}`}><Upload className="w-3.5 h-3.5" /> Upload</button>
        </div>

        {activeTab === 'manual' && (
            <div className="space-y-3 animate-in fade-in duration-500">
                <textarea
                    value={inputText}
                    onChange={handleTextChange}
                    rows={10}
                    className="w-full rounded-xl bg-black border-2 border-white/5 text-skin-accent font-mono text-sm p-4 focus:outline-none focus:border-skin-accent/40 shadow-inner resize-none"
                    placeholder={inputType === DataType.BIVARIATE ? "10, 15\n20, 25..." : (inputType === DataType.GROUPED_CONTINUOUS ? "10-20: 5\n20-30: 3" : "12, 15, 20...")}
                />
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-600 font-mono font-bold uppercase tracking-widest">{inputType}</span>
                        {inputType !== DataType.BIVARIATE && (
                            <span className="text-[9px] text-skin-accent/50 font-mono bg-skin-accent/10 px-1.5 rounded">N={rawValues.length}</span>
                        )}
                    </div>
                    <button onClick={loadExample} className="text-[10px] text-skin-accent/60 hover:text-skin-accent font-bold uppercase tracking-widest transition-colors flex items-center gap-1"><FileText className="w-3 h-3" /> Load Sample</button>
                </div>
            </div>
        )}

        {activeTab === 'import' && (
            <div className="space-y-4">
              {!stagingData ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div 
                    className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:bg-skin-accent/5 cursor-pointer transition-colors group relative overflow-hidden" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-skin-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FileSpreadsheet className="w-10 h-10 text-skin-muted mx-auto mb-4 group-hover:text-skin-accent transition-colors" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-skin-text">Smart Import Engine</h3>
                      <p className="text-[10px] text-zinc-500 mt-2">Drop .CSV or .XLSX for Auto-Detection</p>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                  </div>
                  
                  <button 
                    onClick={() => setShowFormatGuide(true)}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-skin-accent uppercase tracking-widest transition-colors py-2 border border-white/5 rounded-xl hover:bg-white/5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to format my file?
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-skin-accent/10 rounded-lg">
                        <Columns className="w-4 h-4 text-skin-accent" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-skin-text uppercase tracking-wider">Column Staging</h3>
                        <p className="text-[9px] text-zinc-500 font-mono">Select columns to map to {inputType.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setStagingData(null)}
                      className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5">
                            {stagingData[0].map((header, idx) => (
                              <th 
                                key={idx} 
                                onClick={() => toggleColumn(idx)}
                                className={`px-4 py-4 cursor-pointer transition-all border-b border-white/5 min-w-[120px] ${selectedCols.includes(idx) ? 'bg-skin-accent/10' : 'hover:bg-white/5'}`}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedCols.includes(idx) ? 'text-skin-accent' : 'text-zinc-500'}`}>
                                      {selectedCols.includes(idx) ? (
                                        <div className="flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {inputType === DataType.BIVARIATE ? (selectedCols.indexOf(idx) === 0 ? 'X-Axis' : 'Y-Axis') : 'Selected'}
                                        </div>
                                      ) : 'Col ' + (idx + 1)}
                                    </span>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedCols.includes(idx) ? 'bg-skin-accent border-skin-accent' : 'border-white/20'}`}>
                                      {selectedCols.includes(idx) && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono text-white truncate max-w-[100px]">{String(header || 'Unnamed')}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stagingData.slice(1, 6).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-white/[0.02] last:border-0">
                              {row.map((cell, colIdx) => (
                                <td key={colIdx} className={`px-4 py-3 text-[10px] font-mono transition-colors ${selectedCols.includes(colIdx) ? 'bg-skin-accent/5 text-skin-accent' : 'text-zinc-500'}`}>
                                  {String(cell || '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {stagingData.length > 6 && (
                      <div className="p-3 bg-black/20 text-center border-t border-white/5">
                        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">Showing 5 of {stagingData.length - 1} rows</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-skin-accent/5 border border-skin-accent/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-3.5 h-3.5 text-skin-accent" />
                      <span className="text-[10px] font-bold text-skin-accent uppercase tracking-widest">Smart Cleaning Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                        <Filter className="w-3 h-3" />
                        Sanitization: Strip symbols ($, % ,)
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                        <ArrowRight className="w-3 h-3" />
                        Rounding: Strictly 2 Decimals
                      </div>
                    </div>
                  </div>

                  {mappingError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {mappingError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setStagingData(null)}
                      className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={confirmMapping}
                      disabled={isProcessing}
                      className="flex-[2] bg-skin-accent hover:brightness-110 disabled:opacity-50 text-black px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all shadow-lg shadow-skin-accent/20 flex justify-center items-center gap-2"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>Confirm & Clean <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
        )}
        
        {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs font-mono"><AlertTriangle className="w-4 h-4 flex-none" /><span>{error}</span></div>
        )}

        <button onClick={handleParse} className="w-full mt-6 bg-skin-accent hover:brightness-110 text-black px-6 py-4 rounded-xl text-xs font-black tracking-[0.3em] uppercase transition-colors shadow-[0_10px_30px_-5px_rgba(var(--color-accent),0.4)] flex justify-center items-center gap-3">
            <Play className="w-4 h-4 fill-current" /> Launch Computation
        </button>
      </div>

      {/* --- HISTORY DRAWER --- */}
      {showHistory && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-sm h-full bg-skin-surface border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-skin-accent/10 rounded-lg"><Clock className="w-5 h-5 text-skin-accent" /></div>
                 <div><h2 className="text-sm font-bold text-skin-text uppercase tracking-wider">Dataset History</h2><p className="text-[10px] text-skin-muted font-mono mt-0.5">Local Storage Cache</p></div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {history.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-skin-muted gap-4 opacity-50"><Database className="w-12 h-12 stroke-1" /><span className="text-xs font-mono uppercase tracking-widest">No Records Found</span></div>
               ) : (
                 history.map((item) => (
                   <div key={item.id} onClick={() => restoreHistoryItem(item)} className="group relative bg-black/40 border border-white/5 hover:border-skin-accent/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-white/5 hover:shadow-lg hover:shadow-skin-accent/5 overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${getModeColor(item.mode)}`}>{item.mode.replace(/_/g, ' ')}</span>
                         <span className="text-[10px] font-mono text-zinc-500">{item.dateStr}</span>
                      </div>
                      <div className="font-mono text-xs text-zinc-400 line-clamp-2 leading-relaxed bg-black/30 p-2 rounded border border-white/5 mb-2 group-hover:text-skin-text transition-colors">{item.rawData}</div>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[9px] text-skin-accent opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-widest flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Restore</span>
                         <button onClick={(e) => deleteHistoryItem(e, item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100" title="Remove from history"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                 ))
               )}
            </div>
            <div className="p-4 border-t border-white/10 bg-black/20 text-center"><span className="text-[9px] text-zinc-600 font-mono">Storage: {history.length} / 20 Slots Used</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
