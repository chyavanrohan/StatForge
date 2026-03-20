
import React, { useMemo, useState } from 'react';
import { MarketDataset, StockPricePoint } from '../types';
import { Formula } from './Formula';
import { calculateSMA, calculateRollingVolatility } from '../services/stockService';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  ReferenceLine,
  Scatter,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import { 
  Activity, 
  Terminal as TerminalIcon,
  FastForward,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  Zap,
  LayoutGrid,
  Maximize2,
  Crosshair,
  Eye,
  Cpu,
  BarChart3,
  Waves,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface Props {
  dataset: MarketDataset;
}

type TimeRange = '1H' | '4H' | '1D' | '1W' | 'ALL';
type AnalysisView = 'terminal' | 'forecast';
type ChartMode = 'CANDLE' | 'LINE' | 'AREA' | 'SCATTER' | 'PIE';

// --- Ticker Mapping for Yahoo Finance Legitimacy ---
const ASSET_LINKS: Record<string, string> = {
  'S&P 500': '^GSPC',
  'NASDAQ': '^IXIC',
  'DOW JONES': '^DJI',
  'BITCOIN': 'BTC-USD',
  'GOLD': 'GC=F'
};

const NeonCandle = (props: any) => {
  const { x, y, width, height, open, close, low, high, bullColor, bearColor } = props;
  if (open === undefined || close === undefined) return null;
  const isPositive = close >= open;
  const color = isPositive ? bullColor : bearColor;
  
  const range = Math.max(0.01, high - low);
  const bodyY = y + (high - Math.max(open, close)) * (height / range);
  const bodyHeight = Math.max(2, Math.abs(open - close) * (height / range));

  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
      <rect x={x + width * 0.2} y={bodyY} width={width * 0.6} height={bodyHeight} fill={color} fillOpacity={0.9} stroke={color} strokeWidth={0.5} rx={1} />
    </g>
  );
};

const CustomCursor = (props: any) => {
  const { points, accentColor } = props;
  if (!points || points.length === 0) return null;
  const { x, y } = points[0];
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={800} stroke={accentColor} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 4" />
      <line x1={0} y1={y} x2={1600} y2={y} stroke={accentColor} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 4" />
      <circle cx={x} cy={y} r={5} fill={accentColor} />
    </g>
  );
};

// Fix: Moved TickerItem out of MarketTicker and typed it as React.FC to correctly handle 'key' prop in list renders
const TickerItem: React.FC<{ label: string, value: string | number, color?: string, link: string }> = ({ label, value, color, link }) => (
  <a 
    href={link}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-10 py-2 border-r border-white/5 last:border-0 hover:bg-white/10 transition-all no-underline group/ticker relative z-50 pointer-events-auto"
  >
    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] group-hover/ticker:text-zinc-300 transition-colors">{label}</span>
    <span className="font-black text-[11px] whitespace-nowrap flex items-center gap-2" style={{ color: color || '#FFF' }}>
      {value}
      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/ticker:opacity-100 transition-opacity" />
    </span>
  </a>
);

// Fix: Moved getFinanceLink out of MarketTicker for better code structure and reusability
const getFinanceLink = (name: string) => {
  const ticker = ASSET_LINKS[name.toUpperCase()] || name;
  return `https://finance.yahoo.com/quote/${ticker}`;
};

const MarketTicker: React.FC<{ dataset: MarketDataset, accentColor: string }> = ({ dataset, accentColor }) => {
  const isUp = dataset.changePercent >= 0;
  
  const tickerContent = (
    <div className="flex shrink-0 pointer-events-auto">
      <TickerItem label="LOCAL_ASSET" value={dataset.ticker} color={accentColor} link={getFinanceLink(dataset.ticker)} />
      <TickerItem label="LIVE_PRICE" value={`$${dataset.currentPrice.toFixed(2)}`} color={isUp ? accentColor : '#FF003C'} link={getFinanceLink(dataset.ticker)} />
      <TickerItem label="SESSION_VAR" value={`${isUp ? '+' : ''}${dataset.changePercent.toFixed(2)}%`} color={isUp ? accentColor : '#FF003C'} link={getFinanceLink(dataset.ticker)} />
      {dataset.marketPulse?.map((item, idx) => (
        <TickerItem 
          key={idx} 
          label={item.name} 
          value={`${(item.change >= 0 ? '+' : '')}${item.change.toFixed(2)}%`} 
          color={item.change >= 0 ? accentColor : '#FF003C'} 
          link={getFinanceLink(item.name)}
        />
      ))}
      <div className="inline-flex items-center gap-2 px-10 py-2 border-r border-white/5 bg-skin-accent/5">
        <ShieldCheck className="w-3 h-3 text-skin-accent" />
        <span className="text-[9px] font-black text-skin-accent uppercase tracking-widest">Verified_Stream</span>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 w-full h-10 bg-black border-t border-white/10 z-[100] overflow-hidden flex items-center no-print shadow-[0_-15px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
      <div className="flex w-fit whitespace-nowrap items-center h-full animate-marquee pointer-events-auto hover:[animation-play-state:paused]">
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  );
};

export const StockAnalysis: React.FC<Props> = ({ dataset }) => {
  const { colors } = useTheme();
  const [hoverData, setHoverData] = useState<any>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1D');
  const [activeView, setActiveView] = useState<AnalysisView>('terminal');
  const [chartMode, setChartMode] = useState<ChartMode>('CANDLE');

  const chartData = useMemo(() => {
    let slicedHistory = [...dataset.history];
    switch (selectedRange) {
      case '1H': slicedHistory = slicedHistory.slice(-5); break;
      case '4H': slicedHistory = slicedHistory.slice(-15); break;
      case '1D': slicedHistory = slicedHistory.slice(-30); break;
      case '1W': slicedHistory = slicedHistory.slice(-90); break;
      case 'ALL': slicedHistory = slicedHistory.slice(-300); break;
    }
    const sma20 = calculateSMA(dataset.history, 20);
    const sma50 = calculateSMA(dataset.history, 50);
    const sma200 = calculateSMA(dataset.history, 200);
    const rollingVol = calculateRollingVolatility(dataset.history, 20);

    const startIndex = dataset.history.length - slicedHistory.length;
    
    const processedHistory = slicedHistory.map((p, i) => {
      const globalIdx = startIndex + i;
      return {
        ...p,
        sma20: sma20?.[globalIdx] || null,
        sma50: sma50?.[globalIdx] || null,
        sma200: sma200?.[globalIdx] || null,
        volatility: rollingVol?.[globalIdx] || null,
        candle: [p.open, p.close, p.low, p.high]
      };
    });

    const forecast = dataset.prediction.forecast.map(p => ({
      ...p,
      predictionPrice: p.close,
      candle: null,
      sma20: null,
      sma50: null,
      sma200: null,
      volatility: null
    }));

    return [...processedHistory, ...forecast];
  }, [dataset, selectedRange]);

  const sentimentRatio = useMemo(() => {
    if (chartMode !== 'PIE') return [];
    const filtered = chartData.filter(d => !d.isPrediction);
    const bulls = filtered.filter(d => d.close >= d.open).length;
    const bears = filtered.length - bulls;
    
    return [
      { name: 'BULLISH_SESSIONS', value: bulls, color: '#00E5FF' },
      { name: 'BEARISH_SESSIONS', value: bears, color: '#FF003C' }
    ];
  }, [chartData, chartMode]);

  const handleMouseMove = (state: any) => {
    if (state && state.activePayload) setHoverData(state.activePayload[0].payload);
  };

  const displayData = hoverData || chartData[chartData.length - 1];
  const isUp = dataset.changePercent >= 0;

  return (
    <div className="space-y-6 pb-24 font-mono transition-all duration-700 animate-in fade-in">
      
      <div 
        className="flex flex-col md:flex-row items-center justify-between gap-6 no-print"
      >
        <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 shadow-2xl">
          <button
              onClick={() => setActiveView('terminal')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeView === 'terminal' ? 'bg-skin-accent text-black shadow-lg shadow-skin-accent/30' : 'text-skin-muted hover:text-skin-text'}`}
          >
              <TerminalIcon className="w-4 h-4" /> Terminal
          </button>
          <button
              onClick={() => setActiveView('forecast')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeView === 'forecast' ? 'bg-terminal-purple text-white shadow-lg shadow-terminal-purple/30' : 'text-skin-muted hover:text-skin-text'}`}
          >
              <FastForward className="w-4 h-4" /> Forecast
          </button>
        </div>

        {activeView === 'terminal' && (
          <div className="flex items-center gap-1 p-1 bg-black/60 border border-white/10 rounded-2xl shadow-xl">
            {[
              { id: 'CANDLE', icon: <BarChart2 className="w-4 h-4" />, label: 'CANDLE' },
              { id: 'LINE', icon: <Activity className="w-4 h-4" />, label: 'LINE' },
              { id: 'AREA', icon: <Waves className="w-4 h-4" />, label: 'AREA' },
              { id: 'SCATTER', icon: <LayoutGrid className="w-4 h-4" />, label: 'SCATTER' },
              { id: 'PIE', icon: <PieIcon className="w-4 h-4" />, label: 'PIE' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setChartMode(mode.id as ChartMode)}
                className={`
                  relative px-4 py-2 rounded-xl transition-all duration-500 flex flex-col items-center gap-1 group
                  ${chartMode === mode.id 
                    ? 'bg-skin-accent/10 text-skin-accent border border-skin-accent/30 shadow-[0_0_15px_rgba(var(--color-accent),0.1)]' 
                    : 'text-skin-muted border border-transparent hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {mode.icon}
                <span className="text-[8px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 pointer-events-none">
                  {mode.label}
                </span>
                {chartMode === mode.id && (
                  <div className="absolute inset-0 bg-skin-accent/5 rounded-xl animate-pulse pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeView === 'terminal' ? (
        <>
          {/* --- MAIN HUD --- */}
          <div 
            className="relative overflow-hidden terminal-glass rounded-2xl p-6 border-l-4" 
            style={{ borderLeftColor: colors.accent }}
          >
            <div className="scanline-overlay"></div>
            <div className="flex flex-wrap items-end justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-80" style={{ color: colors.accent }}>NODE_PROCESS: {chartMode}_RENDERING</span>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.accent }} />
                </div>
                <h1 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tighter flex flex-wrap items-baseline gap-2 sm:gap-4">
                  {/* INTERACTIVE HUD NAME - Points to Yahoo Finance */}
                  <a 
                    href={`https://finance.yahoo.com/quote/${dataset.ticker}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-skin-accent transition-all duration-300 flex items-center gap-2 sm:gap-3 group/legit no-underline"
                    title={`Explore ${dataset.ticker} on Yahoo Finance`}
                  >
                    {dataset.ticker}
                    <ExternalLink className="w-4 h-4 sm:w-6 sm:h-6 opacity-0 group-hover/legit:opacity-50 group-hover/legit:translate-x-1 transition-all" />
                  </a>
                  <span className={`text-xl sm:text-2xl font-mono ${isUp ? 'text-[#00E5FF] terminal-glow-cyan' : 'text-terminal-red terminal-glow-red'}`}>
                    {isUp ? '▲' : '▼'} {dataset.currentPrice.toFixed(2)}
                  </span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] font-bold text-white/60 uppercase tracking-widest">
                  <span>O: <span className="text-white">{displayData.open?.toFixed(2)}</span></span>
                  <span>H: <span className="text-white">{displayData.high?.toFixed(2)}</span></span>
                  <span>L: <span className="text-white">{displayData.low?.toFixed(2)}</span></span>
                  <span className="px-2 sm:px-3 py-1 bg-white/5 rounded-md border border-white/10" style={{ color: colors.accent }}>[[ CLOSE: {displayData.close?.toFixed(2)} ]]</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Vol_Oscillation</div>
                <div className="text-3xl font-display font-black text-white">{(displayData.volatility !== null && displayData.volatility !== undefined) ? displayData.volatility.toFixed(2) : (dataset.volatility * 100).toFixed(2)}<span className="text-sm text-skin-accent ml-1">%σ</span></div>
              </div>
            </div>
          </div>

          <div 
            className="relative terminal-glass rounded-3xl p-4 sm:p-6 overflow-hidden border border-white/5 bg-black shadow-inner shadow-white/5 min-h-[400px] sm:min-h-[600px]"
          >
            <div className="h-[400px] sm:h-[600px] w-full relative z-10">
              {chartMode === 'PIE' ? (
                <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700">
                  <div className="relative w-full max-w-[500px] aspect-square">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentRatio}
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="85%"
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                          animationDuration={1500}
                        >
                          {sentimentRatio.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <Label 
                            content={({ viewBox: { cx, cy } }: any) => (
                              <text x={cx} y={cy} fill="white" textAnchor="middle" dominantBaseline="central">
                                <tspan x={cx} dy="-1.5em" fontSize="10" fontWeight="900" fill="#666" className="tracking-[0.5em] uppercase">Market Ratio</tspan>
                                <tspan x={cx} dy="2em" fontSize="32" fontWeight="900" className="font-display">{(sentimentRatio[0].value / (sentimentRatio[0].value + sentimentRatio[1].value) * 100).toFixed(0)}%</tspan>
                                <tspan x={cx} dy="1.5em" fontSize="8" fontWeight="700" fill={colors.accent} className="tracking-widest uppercase">Bullish Dominance</tspan>
                              </text>
                            )}
                          />
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', fontSize: '10px', color: '#FFF' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-8 sm:gap-20 mt-4">
                     {sentimentRatio.map(s => (
                       <div key={s.name} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                             <div className="h-full" style={{ backgroundColor: s.color, width: '100%' }} />
                          </div>
                          <span className="text-[8px] sm:text-[10px] text-zinc-500 font-black tracking-widest uppercase">{s.name}</span>
                          <span className="text-xl sm:text-2xl font-display font-black text-white">{s.value} <span className="text-[10px] sm:text-xs text-zinc-600">Days</span></span>
                       </div>
                     ))}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={chartData} 
                    margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverData(null)}
                  >
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4}/>
                        <stop offset="100%" stopColor={colors.accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="0" stroke="#1A1A1A" vertical={true} horizontal={true} />
                    <XAxis dataKey="date" hide />
                    {/* Primary Axis for Price */}
                    <YAxis yAxisId="price" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#333'}} axisLine={false} tickLine={false} width={60} />
                    
                    {/* Secondary Axis for Volatility */}
                    <YAxis yAxisId="vol" orientation="left" stroke="#FF003C" tick={{fontSize: 9, fill: '#FF003C'}} width={30} tickFormatter={(v) => `${Math.round(v)}%`} domain={[0, 'auto']} allowDataOverflow={false} axisLine={false} tickLine={false} />

                    <Tooltip content={() => null} cursor={<CustomCursor accentColor={colors.accent} />} />
                    
                    {chartMode === 'AREA' && (
                      <Area yAxisId="price" type="monotone" dataKey="close" stroke={colors.accent} fill="url(#areaGrad)" strokeWidth={2} animationDuration={1000} />
                    )}
                    {chartMode === 'LINE' && (
                      <Line yAxisId="price" type="monotone" dataKey="close" stroke={colors.accent} strokeWidth={3} dot={false} animationDuration={1000} />
                    )}
                    {chartMode === 'CANDLE' && (
                      <Bar yAxisId="price" dataKey="candle" shape={<NeonCandle bullColor="#00E5FF" bearColor="#FF003C" />} animationDuration={800} />
                    )}
                    {chartMode === 'SCATTER' && (
                      <Scatter yAxisId="price" dataKey="close" fill="white" r={3} animationDuration={1000} />
                    )}

                    <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#C0C0C0" strokeWidth={1} dot={false} strokeOpacity={0.3} animationDuration={1200} />
                    <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#00E5FF" strokeWidth={1} dot={false} strokeOpacity={0.7} animationDuration={1200} />
                    <Line yAxisId="price" type="monotone" dataKey="sma200" stroke="#FFA500" strokeWidth={1} dot={false} strokeOpacity={0.7} animationDuration={1200} />

                    {/* Historical Volatility Overlay */}
                    <Area yAxisId="vol" type="monotone" dataKey="volatility" stroke="#FF003C" fill="#FF003C" fillOpacity={0.05} strokeWidth={1} dot={false} animationDuration={1200} />

                    <Line yAxisId="price" type="monotone" dataKey="predictionPrice" stroke="#BC13FE" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    
                    <ReferenceLine yAxisId="price" y={dataset.currentPrice} stroke={colors.accent} strokeWidth={1} strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 px-4 pt-6 border-t border-white/5 relative z-10">
              <div className="flex gap-6 items-center flex-wrap">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#C0C0C0] rounded-full opacity-40" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">20D_SMA</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#00E5FF] rounded-full opacity-70" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">50D_SMA</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#FFA500] rounded-full opacity-70" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">200D_SMA</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#FF003C] rounded-full opacity-40" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">HIST_VOL(20D)</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#BC13FE] rounded-full" /><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Neural_Forecast</span></div>
              </div>
              <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-2xl">
                  {(['1H', '4H', '1D', '1W', 'ALL'] as TimeRange[]).map(t => (
                    <button 
                      key={t} onClick={() => setSelectedRange(t)}
                      className={`
                        px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 border
                        ${selectedRange === t ? 'bg-skin-accent/20 border-skin-accent text-skin-accent shadow-lg shadow-skin-accent/10' : 'border-transparent text-skin-muted hover:text-white'}
                      `}
                    >
                      {t}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div 
            className="space-y-6"
        >
          <div className="relative overflow-hidden terminal-glass rounded-3xl p-6 sm:p-10 border-l-4 border-terminal-purple">
            <div className="scanline-overlay"></div>
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-terminal-purple animate-pulse" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] text-zinc-500">Recursive_Neural_Network</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tighter">PROJECTED_EXIT: <span className="text-terminal-purple terminal-glow-purple">${dataset.prediction.forecast[4].close.toFixed(2)}</span></h2>
              <p className="text-xs sm:text-sm text-skin-muted max-w-xl leading-relaxed font-mono">Statistical extrapolation utilizing stochastic gradient descent on 300D market weights. Confidence interval calculated at 94%.</p>
            </div>
            <div className="h-[300px] sm:h-[450px] w-full mt-8 sm:mt-12 relative">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataset.prediction.forecast}>
                    <defs>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BC13FE" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#BC13FE" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide orientation="right" />
                    <Area type="monotone" dataKey="close" stroke="#BC13FE" strokeWidth={4} fill="url(#predGrad)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="terminal-glass rounded-2xl p-6 border-t border-terminal-red/30 bg-terminal-red/5">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-terminal-red uppercase tracking-widest">Risk_Telemetry</span>
              <Activity className="w-4 h-4 text-terminal-red animate-pulse" />
           </div>
           <div className="text-3xl font-display font-black text-white">{(dataset.volatility * 100).toFixed(2)}% σ</div>
           <div className="text-[9px] text-zinc-600 mt-2 font-mono uppercase tracking-widest">Standard Deviation Variance</div>
        </div>
        <div className="terminal-glass rounded-2xl p-6 md:col-span-2 border-t border-terminal-purple/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
           <div className="space-y-4 w-full sm:w-auto">
              <span className="text-[10px] font-black text-terminal-purple uppercase tracking-widest">Bivariate_Regression_Function</span>
              <div className="bg-black px-4 sm:px-6 py-3 rounded-xl border border-white/5 shadow-inner overflow-x-auto">
                 <Formula tex={dataset.prediction.formula} className="text-xl sm:text-2xl text-white whitespace-nowrap" />
              </div>
           </div>
           <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">R_Squared</div>
              <div className="text-3xl sm:text-4xl font-display font-black text-white">{(dataset.prediction.rSquared * 100).toFixed(1)}<span className="text-base text-zinc-600 ml-1">%</span></div>
           </div>
        </div>
      </div>

      {/* PERSISTENT TICKER */}
      <MarketTicker dataset={dataset} accentColor={colors.accent} />
    </div>
  );
};
