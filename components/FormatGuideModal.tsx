
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Table as TableIcon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const templates = [
  {
    id: 'ungrouped',
    title: 'Ungrouped Data',
    headers: ['Data'],
    rows: [['12.5'], ['15.0'], ['20.2']],
    description: 'Single column of numeric values.',
    filename: 'ungrouped_template.csv',
    content: 'Data\n12.5\n15.0\n20.2'
  },
  {
    id: 'discrete',
    title: 'Grouped Discrete',
    headers: ['Data', 'Frequency'],
    rows: [['10', '5'], ['20', '3'], ['30', '8']],
    description: 'Values and their corresponding counts.',
    filename: 'discrete_template.csv',
    content: 'Data,Frequency\n10,5\n20,3\n30,8'
  },
  {
    id: 'continuous',
    title: 'Class Interval',
    headers: ['Interval', 'Frequency'],
    rows: [['10-20', '5'], ['20-30', '12'], ['30-40', '8']],
    description: 'Ranges (hyphenated) and frequencies.',
    filename: 'continuous_template.csv',
    content: 'Interval,Frequency\n10-20,5\n20-30,12\n30-40,8'
  },
  {
    id: 'bivariate',
    title: 'Bivariate (X & Y)',
    headers: ['X', 'Y'],
    rows: [['10', '15'], ['20', '25'], ['30', '35']],
    description: 'Coordinate pairs for correlation.',
    filename: 'bivariate_template.csv',
    content: 'X,Y\n10,15\n20,25\n30,35'
  }
];

export const FormatGuideModal: React.FC<FormatGuideModalProps> = ({ isOpen, onClose }) => {
  const downloadTemplate = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass-panel rounded-[2rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-skin-accent/10 rounded-2xl border border-skin-accent/20">
                  <TableIcon className="w-6 h-6 text-skin-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Import Format Guide</h2>
                  <p className="text-xs text-skin-muted font-mono mt-1">Structure your CSV/Excel files for auto-detection</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/10 rounded-2xl text-skin-muted hover:text-white transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {templates.map((template) => (
                  <div key={template.id} className="space-y-5 group">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-skin-accent uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-skin-accent shadow-[0_0_10px_rgba(var(--color-accent),0.5)]" />
                        {template.title}
                      </h3>
                      <button
                        onClick={() => downloadTemplate(template.filename, template.content)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-skin-accent hover:text-black hover:border-skin-accent transition-all text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Template
                      </button>
                    </div>
                    
                    <p className="text-xs text-zinc-500 font-mono leading-relaxed">
                      {template.description}
                    </p>

                    <div className="rounded-2xl border border-white/5 bg-black/40 overflow-hidden shadow-inner">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5">
                            {template.headers.map((header, i) => (
                              <th key={i} className="px-5 py-3 text-[10px] font-mono text-skin-muted uppercase tracking-widest border-b border-white/5">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {template.rows.map((row, i) => (
                            <tr key={i} className="border-b border-white/[0.02] last:border-0 group-hover:bg-white/[0.02] transition-colors">
                              {row.map((cell, j) => (
                                <td key={j} className="px-5 py-3 text-xs font-mono text-zinc-400">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-skin-accent/5 rounded-[1.5rem] border border-skin-accent/10 flex items-start gap-5">
                <div className="p-2 bg-skin-accent/10 rounded-xl">
                  <Info className="w-5 h-5 text-skin-accent" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-skin-accent uppercase tracking-wider">Pro Tip: Auto-Detection</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                    StatForge uses a smart algorithm to detect your data type based on column count, headers, and content patterns. For best results, use the headers shown above (e.g., <code className="text-skin-accent bg-black/40 px-1.5 py-0.5 rounded font-mono">X</code> and <code className="text-skin-accent bg-black/40 px-1.5 py-0.5 rounded font-mono">Y</code> for Bivariate analysis).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
