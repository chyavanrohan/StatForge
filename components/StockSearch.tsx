import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchMarketData } from '../services/stockService';
import { DataType, Dataset } from '../types';

interface Props {
  onResult: (dataset: Dataset) => void;
}

const TOP_50_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'BRK.B', 'TSLA', 'UNH', 'LLY',
  'JPM', 'V', 'JNJ', 'AVGO', 'XOM', 'MA', 'PG', 'HD', 'ADBE', 'COST',
  'ASML', 'CVX', 'ORCL', 'MRK', 'KO', 'ABBV', 'BAC', 'PEP', 'CRM', 'NFLX',
  'TMO', 'AMD', 'MCD', 'CSCO', 'NKE', 'PFE', 'LIN', 'TMUS', 'ABT', 'DHR',
  'DIS', 'WMT', 'VZ', 'TXN', 'AMAT', 'QCOM', 'NEE', 'RTX', 'AMGN', 'LOW'
];

export const StockSearch: React.FC<Props> = ({ onResult }) => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showAll, setShowAll] = useState(false);

  const handleSearch = async (e: React.FormEvent | string) => {
    const finalTicker = typeof e === 'string' ? e : ticker;
    if (typeof e !== 'string') e.preventDefault();
    if (!finalTicker) return;
    
    setLoading(true);
    setStatus('ACCESSING TERMINAL...');
    
    try {
      const data = await fetchMarketData(finalTicker.toUpperCase());
      setStatus('EXTRAPOLATING TRENDS...');
      onResult({ type: DataType.MARKET, data: data });
    } catch (error) {
      console.error(error);
      alert("Terminal Error: Connectivity failure or invalid index.");
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const visibleTickers = showAll ? TOP_50_TICKERS : TOP_50_TICKERS.slice(0, 16);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="SEARCH GLOBAL INDICES..."
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 sm:py-5 pl-10 sm:pl-12 text-xs sm:text-sm font-mono text-skin-text focus:outline-none focus:border-skin-accent/50 focus:ring-1 focus:ring-skin-accent/50 transition-all uppercase tracking-widest placeholder:opacity-20 shadow-inner"
        />
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-skin-muted group-focus-within:text-skin-accent transition-colors" />
        <button
          disabled={loading || !ticker}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-skin-accent hover:bg-skin-accent/90 disabled:opacity-50 text-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-tighter transition-all flex items-center gap-1.5 sm:gap-2 min-w-[80px] sm:min-w-[110px] justify-center shadow-[0_0_15px_rgba(var(--color-accent),0.2)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              <span className="animate-pulse">{status || 'SYNC'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              EXECUTE
            </>
          )}
        </button>
      </form>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-skin-muted uppercase tracking-[0.3em]">Neural_Link_Benchmarks</span>
            <button 
                onClick={() => setShowAll(!showAll)}
                className="text-[9px] text-skin-accent hover:underline flex items-center gap-1 font-mono tracking-widest font-bold"
            >
                {showAll ? 'MINIMIZE_MATRIX' : 'EXPAND_RESERVOIR'} {showAll ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {visibleTickers.map(t => (
            <button 
                key={t}
                type="button"
                onClick={() => { setTicker(t); handleSearch(t); }}
                className={`text-[9px] sm:text-[10px] font-mono border border-white/5 px-1.5 py-2 rounded-lg bg-white/5 transition-all hover:bg-skin-accent/10 hover:border-skin-accent/30 hover:text-skin-accent shadow-sm ${ticker === t ? 'text-skin-accent border-skin-accent/30 bg-skin-accent/5 ring-1 ring-skin-accent/20' : 'text-skin-muted'}`}
            >
                {t}
            </button>
            ))}
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 text-[9px] text-skin-muted font-mono uppercase tracking-widest opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-skin-accent animate-pulse" />
          Recursive Intelligence Connected
        </div>
      </div>
    </div>
  );
};
