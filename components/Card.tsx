import React from 'react';

interface CardProps {
  title: string;
  result: string | number;
  children: React.ReactNode;
}

export const Card = React.memo<CardProps>(({ title, result, children }) => {
  return (
    <div className="relative group bg-skin-surface rounded-xl border border-white/5 shadow-xl hover:border-skin-accent/30 transition-all duration-300 overflow-hidden break-inside-avoid">
      
      {/* Subtle top highlight gradient on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-skin-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h4 className="font-medium text-skin-text text-sm tracking-wide">{title}</h4>
        {result !== "" && (
            <span className="px-2.5 py-0.5 bg-skin-accent/10 border border-skin-accent/20 text-skin-accent rounded text-xs font-mono font-bold shadow-[0_0_10px_rgba(var(--color-accent),0.1)]">
              {result}
            </span>
        )}
      </div>
      <div className="p-5 text-skin-muted">
        {children}
      </div>
    </div>
  );
});