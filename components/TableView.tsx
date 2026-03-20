import React, { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { Formula } from './Formula';

interface TableProps {
  headers: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
  caption: string;
  tooltips?: string[];
  forceExpanded?: boolean;
}

export const TableView: React.FC<TableProps> = ({ headers, rows, footer, caption, tooltips = [] }) => {
  
  // Optimization: Reduce initial DOM load for massive datasets
  const MAX_ROWS = 250; 
  const processedRows = useMemo(() => {
    if (rows.length <= MAX_ROWS) {
        return rows.map((r, i) => ({ type: 'data' as const, data: r, index: i }));
    }
    const head = rows.slice(0, 150).map((r, i) => ({ type: 'data' as const, data: r, index: i }));
    const tail = rows.slice(-50).map((r, i) => ({ type: 'data' as const, data: r, index: rows.length - 50 + i }));
    const gap = { 
        type: 'gap' as const, 
        count: rows.length - 200,
        index: -1 
    };
    return [...head, gap, ...tail];
  }, [rows]);

  return (
    <div className="w-full h-full flex flex-col bg-skin-base animate-in fade-in duration-300">
      <div className="flex-none p-4 bg-skin-surface border border-white/5 rounded-t-xl flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-bold text-skin-text tracking-wide">{caption}</h3>
             <span className="px-2 py-0.5 rounded-full bg-skin-accent/10 text-skin-accent text-xs font-mono font-bold">
                N = {rows.length}
             </span>
          </div>
          <div className="text-xs text-skin-muted flex items-center gap-2">
             <HelpCircle className="w-4 h-4" />
             <span>Hover over symbols for definitions</span>
          </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar border border-white/5 rounded-b-xl bg-black/20">
        <table className="w-full text-left border-collapse table-fixed md:table-auto">
          <thead className="bg-skin-surface sticky top-0 z-20 shadow-lg shadow-black/20">
            <tr>
              <th className="px-4 py-4 text-[10px] font-mono text-skin-muted uppercase tracking-widest border-b border-white/10 w-16 text-center bg-skin-surface">
                #
              </th>
              {headers.map((h, i) => (
                <th key={i} className="group relative px-6 py-4 whitespace-nowrap text-base font-bold font-mono text-skin-accent border-b border-white/10 bg-skin-surface hover:bg-white/5 transition-colors">
                   <div className="flex flex-col items-center gap-1 cursor-help w-fit mx-auto relative">
                      <div className="border-b-2 border-dotted border-skin-accent/30 pb-1 group-hover:border-skin-accent transition-colors duration-300">
                          <Formula tex={h} />
                      </div>
                      
                      {tooltips[i] && (
                        <div className={`
                            opacity-0 group-hover:opacity-100 transition-all duration-200 transform origin-top scale-95 group-hover:scale-100
                            absolute top-full mt-3 p-4 w-72 whitespace-normal break-words
                            bg-skin-surface border border-skin-accent/20 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] rounded-xl
                            text-xs font-sans font-normal text-skin-muted text-left leading-relaxed
                            pointer-events-none z-50
                            ${i === 0 ? 'left-0' : i === headers.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                        `}>
                            <div className={`absolute bottom-full border-8 border-transparent border-b-skin-accent/20 ${i === 0 ? 'left-6' : i === headers.length - 1 ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
                            <div className={`absolute bottom-full mb-[-1px] border-8 border-transparent border-b-skin-surface ${i === 0 ? 'left-6' : i === headers.length - 1 ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
                            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
                                <div className="p-2 bg-skin-accent/10 rounded-md flex items-center justify-center min-w-[32px]">
                                  <Formula tex={h} className="text-skin-accent text-sm" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-skin-muted ml-auto">Definition</span>
                            </div>
                            <p className="text-skin-text/90">{tooltips[i]}</p>
                        </div>
                      )}
                   </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {processedRows.map((item) => {
              if (item.type === 'gap') {
                  return (
                      <tr key="gap" className="bg-skin-surface/10">
                          <td className="px-4 py-4 text-center border-r border-white/5">
                              <div className="w-1 h-6 mx-auto border-l-2 border-dotted border-skin-muted/30"></div>
                          </td>
                          <td colSpan={headers.length} className="px-6 py-4 text-center text-xs text-skin-muted font-mono italic">
                              ... {item.count} rows hidden for performance ...
                          </td>
                      </tr>
                  );
              }
              return (
                  <tr key={item.index} className="hover:bg-white/[0.03] transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 40px' }}>
                  <td className="px-4 py-2 font-mono text-xs text-skin-muted text-center border-r border-white/5 bg-black/10 group-hover:text-skin-text">
                      {item.index + 1}
                  </td>
                  {item.data.map((cell, j) => (
                      <td key={j} className="px-6 py-2 font-mono text-skin-text text-sm tabular-nums border-r border-white/5 last:border-0">
                      {typeof cell === 'number' ? (
                          <span className={cell < 0 ? 'text-orange-300' : ''}>
                             {cell.toFixed(4).replace(/\.?0+$/, '')}
                          </span>
                      ) : cell}
                      </td>
                  ))}
                  </tr>
              );
            })}
          </tbody>
          {footer && (
            <tfoot className="bg-skin-surface sticky bottom-0 z-20 border-t border-skin-accent/30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
              <tr>
                  <td className="px-4 py-3 text-[10px] font-mono text-skin-accent/70 text-center uppercase font-bold bg-skin-surface">
                      Total
                  </td>
                  {footer.map((cell, i) => (
                    <td key={i} className="px-6 py-3 font-mono text-skin-accent text-sm font-bold tabular-nums border-r border-skin-accent/10 last:border-0 bg-skin-surface">
                      {typeof cell === 'number' ? cell.toFixed(4).replace(/\.?0+$/, '') : cell}
                    </td>
                  ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};