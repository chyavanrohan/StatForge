
import React, { useState } from 'react';
import { FileText, Download, X, Loader2 } from 'lucide-react';
import { Dataset } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
}

export const ReportModal: React.FC<Props> = ({ isOpen, onClose, dataset }) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({
    title: 'Statistical Analysis Report',
    name: '',
    usn: '',
    institution: 'JAIN College' // Default as requested
  });

  const generatePDF = () => {
    setLoading(true);
    const element = document.querySelector('main'); // Target the main content area
    if (!element) return;

    // Inject Header for PDF only
    const header = document.createElement('div');
    header.className = 'pdf-header-inject';
    header.innerHTML = `
        <div style="padding: 40px; border-bottom: 2px solid #000; margin-bottom: 30px; font-family: 'Times New Roman', serif;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24pt; font-weight: bold; margin: 0; text-transform: uppercase;">${details.institution}</h1>
                <p style="font-size: 12pt; margin: 5px 0;">Department of Engineering & Mathematics</p>
            </div>
            <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="font-size: 18pt; font-weight: bold; margin: 0;">${details.title}</h2>
            </div>
            <table style="width: 100%; font-size: 12pt;">
                <tr>
                    <td style="font-weight: bold; width: 100px;">Name:</td>
                    <td>${details.name || '____________________'}</td>
                    <td style="font-weight: bold; width: 100px; text-align: right;">Date:</td>
                    <td style="width: 150px; text-align: right;">${new Date().toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">USN:</td>
                    <td>${details.usn || 'JUUG25BTECH...'}</td>
                </tr>
            </table>
        </div>
    `;

    // We clone the main element to modify it for PDF without breaking UI
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.background = 'white';
    clone.style.color = 'black';
    clone.insertBefore(header, clone.firstChild);

    // Styling for PDF print
    const style = document.createElement('style');
    style.innerHTML = `
        .no-print { display: none !important; }
        * { color: black !important; background: white !important; border-color: #ddd !important; }
        .text-skin-accent { color: #000 !important; font-weight: bold; }
        .bg-skin-surface { background: #fff !important; }
        h1, h2, h3 { color: #000 !important; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; }
    `;
    clone.appendChild(style);

    const opt = {
      margin: 10,
      filename: `StatForge_Report_${details.usn || 'Draft'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    if (window.html2pdf) {
        // @ts-ignore
        window.html2pdf().set(opt).from(clone).save().then(() => {
            setLoading(false);
            onClose();
        });
    } else {
        alert("PDF Engine not ready. Please try standard print (Ctrl+P).");
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-md bg-skin-surface border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-skin-accent" /> Export PDF Report</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
         </div>
         
         <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Project Title</label>
                <input type="text" value={details.title} onChange={e => setDetails({...details, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-skin-accent/50 outline-none" />
            </div>
            <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Institution</label>
                <input type="text" value={details.institution} onChange={e => setDetails({...details, institution: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-skin-accent/50 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Student Name</label>
                    <input type="text" placeholder="John Doe" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-skin-accent/50 outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">USN / ID</label>
                    <input type="text" placeholder="JUUG25..." value={details.usn} onChange={e => setDetails({...details, usn: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-skin-accent/50 outline-none" />
                </div>
            </div>
         </div>

         <div className="mt-8 flex gap-3">
             <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Cancel</button>
             <button onClick={generatePDF} disabled={loading} className="flex-[2] py-3 bg-skin-accent hover:brightness-110 text-black rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {loading ? 'Generating...' : 'Download Report'}
             </button>
         </div>
      </div>
    </div>
  );
};
