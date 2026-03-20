
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, Code2, ChevronRight, PanelRightClose } from 'lucide-react';
import { Dataset } from '../types';
import * as CodeGen from '../services/codeGenService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    dataset: Dataset;
}

export const CodeTerminal: React.FC<Props> = ({ isOpen, onClose, dataset }) => {
    const [activeTab, setActiveTab] = useState<'python' | 'c' | 'matlab'>('python');
    const [code, setCode] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!dataset) return;
        switch (activeTab) {
            case 'python': setCode(CodeGen.generatePythonCode(dataset)); break;
            case 'c': setCode(CodeGen.generateCCode(dataset)); break;
            case 'matlab': setCode(CodeGen.generateMatlabCode(dataset)); break;
        }
    }, [activeTab, dataset]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-xl h-full bg-[#1e1e1e] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-mono group">
                
                {/* Side Close Handle */}
                <button 
                    onClick={onClose}
                    className="absolute top-1/2 -left-12 -translate-y-1/2 w-12 h-24 bg-[#1e1e1e] border-y border-l border-white/10 rounded-l-2xl flex items-center justify-center text-zinc-500 hover:text-skin-accent hover:bg-[#252526] transition-all shadow-[-20px_0_40px_rgba(0,0,0,0.5)] cursor-pointer"
                    title="Slide Close"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#252526] border-b border-black">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-skin-accent" />
                        <span className="text-sm font-bold text-gray-200">CODE_EXPORT_TERMINAL</span>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors" title="Close"><PanelRightClose className="w-5 h-5" /></button>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#252526] px-4 gap-1">
                    {(['python', 'c', 'matlab'] as const).map(lang => (
                        <button
                            key={lang}
                            onClick={() => setActiveTab(lang)}
                            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-t-2 transition-colors ${activeTab === lang ? 'bg-[#1e1e1e] text-skin-accent border-skin-accent' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            {lang === 'c' ? 'C / C++' : lang}
                        </button>
                    ))}
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-auto p-6 custom-scrollbar relative bg-[#1e1e1e]">
                     <button 
                        onClick={handleCopy} 
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-md text-gray-300 transition-all z-10 flex items-center gap-2"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        <span className="text-[10px] font-bold uppercase">{copied ? 'COPIED' : 'COPY'}</span>
                    </button>

                    <pre className="font-mono text-sm leading-relaxed text-[#d4d4d4]">
                        <code>{code}</code>
                    </pre>
                </div>

                {/* Footer Status */}
                <div className="px-4 py-2 bg-[#007acc] text-white text-[10px] flex justify-between items-center">
                    <span>Generated from {dataset.type} Dataset</span>
                    <span>UTF-8 • {activeTab.toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
};
