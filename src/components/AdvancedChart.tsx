import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Eye, Zap, Sparkles, Activity, Target, Palette, Code, Check, Search, Globe, Clock, BarChart3, Layers, Shield, ChevronRight, LayoutGrid, List } from 'lucide-react';
import LightweightChart from './LightweightChart';
import TradingViewWidget from './TradingViewWidget';
import { useMarketContext } from '../MarketContext';

const SYMBOLS = [
  // Synthetic Indices
  { id: 'R_10', name: 'Volatility 10 Index', category: 'Synthetics' },
  { id: 'R_25', name: 'Volatility 25 Index', category: 'Synthetics' },
  { id: 'R_50', name: 'Volatility 50 Index', category: 'Synthetics' },
  { id: 'R_75', name: 'Volatility 75 Index', category: 'Synthetics' },
  { id: 'R_100', name: 'Volatility 100 Index', category: 'Synthetics' },
  { id: 'BOOM50', name: 'Boom 50', category: 'Synthetics' },
  { id: 'BOOM100', name: 'Boom 100', category: 'Synthetics' },
  { id: 'BOOM150', name: 'Boom 150', category: 'Synthetics' },
  { id: 'BOOM300', name: 'Boom 300', category: 'Synthetics' },
  { id: 'BOOM500', name: 'Boom 500', category: 'Synthetics' },
  { id: 'BOOM1000', name: 'Boom 1000', category: 'Synthetics' },
  { id: 'CRASH50', name: 'Crash 50', category: 'Synthetics' },
  { id: 'CRASH100', name: 'Crash 100', category: 'Synthetics' },
  { id: 'CRASH150', name: 'Crash 150', category: 'Synthetics' },
  { id: 'CRASH300', name: 'Crash 300', category: 'Synthetics' },
  { id: 'CRASH500', name: 'Crash 500', category: 'Synthetics' },
  { id: 'CRASH1000', name: 'Crash 1000', category: 'Synthetics' },
  { id: 'STEP', name: 'Step Index', category: 'Synthetics' },
  { id: 'RANGE100', name: 'Range Break 100', category: 'Synthetics' },
  { id: 'RANGE200', name: 'Range Break 200', category: 'Synthetics' },
  // Forex
  { id: 'frxEURUSD', name: 'EUR/USD', category: 'Forex' },
  { id: 'frxGBPUSD', name: 'GBP/USD', category: 'Forex' },
  { id: 'frxUSDJPY', name: 'USD/JPY', category: 'Forex' },
  { id: 'frxUSDCHF', name: 'USD/CHF', category: 'Forex' },
  { id: 'frxAUDUSD', name: 'AUD/USD', category: 'Forex' },
  { id: 'frxUSDCAD', name: 'USD/CAD', category: 'Forex' },
  { id: 'frxEURGBP', name: 'EUR/GBP', category: 'Forex' },
  { id: 'frxEURJPY', name: 'EUR/JPY', category: 'Forex' },
  { id: 'frxGBPJPY', name: 'GBP/JPY', category: 'Forex' },
  { id: 'frxAUDJPY', name: 'AUD/JPY', category: 'Forex' },
  // Commodities
  { id: 'frxXAUUSD', name: 'Gold/USD (XAU/USD)', category: 'Commodities' },
  { id: 'frxXAGUSD', name: 'Silver/USD (XAG/USD)', category: 'Commodities' },
  { id: 'WTI', name: 'US Oil (WTI)', category: 'Commodities' },
  { id: 'BRENT', name: 'UK Oil (Brent)', category: 'Commodities' },
  // Crypto
  { id: 'cryBTCUSD', name: 'Bitcoin/USD', category: 'Crypto' },
  { id: 'cryETHUSD', name: 'Ethereum/USD', category: 'Crypto' },
  { id: 'cryLTCUSD', name: 'Litecoin/USD', category: 'Crypto' },
];

export default function AdvancedChart({ onBack }: { onBack?: () => void }) {
  const { marketPrices } = useMarketContext();
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSidebar, setShowSidebar] = useState(true);

  const filteredSymbols = SYMBOLS.filter(s => 
    (activeCategory === 'All' || s.category === activeCategory) &&
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentPrice = marketPrices[selectedSymbol]?.price || 1248.50;
  const change = marketPrices[selectedSymbol]?.change || 0;
  const [chartMode, setChartMode] = useState<'lightweight' | 'tradingview'>('lightweight');

  // Compute 6-Step Reversal Setup Price Markings based on live price
  const refPrice = currentPrice > 0 ? currentPrice : 1248.50;
  
  const sixStepMarkings = [
    {
      num: 1,
      title: '15M Range Base',
      timeframe: '15M',
      tag: 'Range Anchor',
      price: +(refPrice * 0.9930).toFixed(4),
      role: 'Starting Consolidation Zone',
      desc: 'High probability 15M range starting boundary'
    },
    {
      num: 2,
      title: '5M Trend Breakout',
      timeframe: '5M',
      tag: 'Structure Shift',
      price: +(refPrice * 0.9955).toFixed(4),
      role: 'Structure Shift Breakout',
      desc: '5M breakout below uptrend or above downtrend'
    },
    {
      num: 3,
      title: '5M Sweep Rejection',
      timeframe: '5M',
      tag: 'Sweep Wick',
      price: +(refPrice * 0.9972).toFixed(4),
      role: 'Liquidity Grab Wick',
      desc: '5M sweep creating long rejection wick on 15M'
    },
    {
      num: 4,
      title: '15M FVG Direction Change',
      timeframe: '15M',
      tag: 'FVG Imbalance',
      price: +(refPrice * 0.9985).toFixed(4),
      role: 'Direction Shift Void',
      desc: 'Direction change establishing 15M Fair Value Gap'
    },
    {
      num: 5,
      title: '15M Retest & Rejection',
      timeframe: '1M',
      tag: 'Retest & Reject',
      price: +(refPrice * 0.9994).toFixed(4),
      role: 'Gap Retest Confirmation',
      desc: '15M gap retest accompanied by 1M rejection candle'
    },
    {
      num: 6,
      title: 'Step 6 Entry Trigger',
      timeframe: '1M',
      tag: '2nd Candle Entry',
      price: +(refPrice * 1.0005).toFixed(4),
      role: 'Execution Point',
      desc: 'Entry on 2nd candlestick following rejection confirmation'
    },
  ];

  // Dynamically find the Six Step marking that is currently closest to the live market price
  const closestStep = sixStepMarkings.reduce((minStep, step) => {
    const minDiff = Math.abs(refPrice - minStep.price);
    const currDiff = Math.abs(refPrice - step.price);
    return currDiff < minDiff ? step : minStep;
  }, sixStepMarkings[0]);

  return (
    <div className="h-screen flex gap-6 overflow-hidden bg-cosmic-black p-4">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-card border-white/5 flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                {onBack && (
                   <button onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
                   </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-gold outline-none transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {['All', 'Synthetics', 'Forex', 'Crypto'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeCategory === cat ? 'bg-gold text-black' : 'bg-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredSymbols.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSymbol(s.id)}
                  className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between group ${
                    selectedSymbol === s.id ? 'bg-gold/10 border-gold/30' : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedSymbol === s.id ? 'bg-gold text-black' : 'bg-white/10 text-white/40 group-hover:text-white'}`}>
                      <BarChart3 size={16} />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-bold ${selectedSymbol === s.id ? 'text-gold' : 'text-white/80'}`}>{s.name}</p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">{s.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-white">
                      {marketPrices[s.id]?.price?.toFixed(2) || '---'}
                    </p>
                    <p className={`text-[10px] font-mono ${marketPrices[s.id]?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {marketPrices[s.id]?.change >= 0 ? '+' : ''}{marketPrices[s.id]?.change?.toFixed(2) || '0.00'}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto custom-scrollbar">
        <header className="glass-card p-5 border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
            >
              <LayoutGrid size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Sparkles className="text-gold" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold gold-gradient leading-none">Oracle Vision</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">6-Step Reversal Live Precision Chart</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2 hidden lg:block" />
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-0.5">Live Market Price</p>
                <p className="text-lg font-mono font-bold text-white">{refPrice.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-0.5">24h Change</p>
                <p className={`text-lg font-mono font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                onClick={() => setChartMode('lightweight')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartMode === 'lightweight' ? 'bg-gold text-black shadow-md' : 'text-white/40 hover:text-white'}`}
              >
                6-Step SMC Chart
              </button>
              <button
                onClick={() => setChartMode('tradingview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartMode === 'tradingview' ? 'bg-gold text-black shadow-md' : 'text-white/40 hover:text-white'}`}
              >
                TradingView
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
        </header>

        {/* Dynamic 6-Step Reversal Setup Tracker Bar */}
        <div className="glass-card p-4 border-white/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="text-purple-400" size={16} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                6-Step Reversal Setup Tracker
              </h2>
              <span className="text-[10px] text-white/40 font-mono">
                (Live Proximity Detector)
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-gold animate-ping" />
              <span className="text-[10px] font-bold text-gold uppercase tracking-widest">
                Closest Step: Step {closestStep.num} ({closestStep.title})
              </span>
            </div>
          </div>

          {/* 6 Steps Grid - Highlight Closest with Pulsing Glow Effect */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sixStepMarkings.map((step) => {
              const isClosest = closestStep.num === step.num;
              const delta = Math.abs(refPrice - step.price);

              return (
                <div
                  key={step.num}
                  className={`relative p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                    isClosest
                      ? 'bg-gradient-to-b from-gold/25 via-purple-900/30 to-gold/20 border-gold text-white ring-2 ring-gold/80 shadow-[0_0_25px_rgba(234,179,8,0.7)] scale-[1.03] z-10 animate-pulse'
                      : 'bg-white/5 border-white/5 hover:border-white/20 text-white/70'
                  }`}
                >
                  {isClosest && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                      <Zap size={10} className="fill-black" /> Live Closest
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold ${isClosest ? 'text-gold' : 'text-purple-400'}`}>
                        Step {step.num} • {step.timeframe}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${isClosest ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-white/10 text-white/40'}`}>
                        {step.tag}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold leading-tight ${isClosest ? 'text-white' : 'text-white/80'}`}>
                      {step.title}
                    </h4>

                    <p className="text-[9px] text-white/40 line-clamp-1">
                      {step.desc}
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Price Level</p>
                      <p className={`text-xs font-mono font-bold ${isClosest ? 'text-gold' : 'text-white/90'}`}>
                        {step.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Delta</p>
                      <p className={`text-[10px] font-mono ${isClosest ? 'text-emerald-400 font-bold' : 'text-white/40'}`}>
                        Δ {delta.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Chart Viewer */}
        <div className="flex-1 glass-card border-white/5 overflow-hidden relative min-h-[420px] flex flex-col">
          {/* Overlay Tag displaying the current active closest 6-step marking */}
          <div className="absolute top-4 left-4 z-20 bg-black/80 backdrop-blur-md border border-gold/40 rounded-xl p-3 flex items-center gap-3 shadow-xl">
            <div className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/50 flex items-center justify-center text-gold animate-pulse">
              <Target size={18} />
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Active Closest Marking</p>
              <p className="text-xs font-bold text-gold flex items-center gap-1.5">
                Step {closestStep.num}: {closestStep.title} ({closestStep.price.toFixed(2)})
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
              </p>
            </div>
          </div>

          {chartMode === 'lightweight' ? (
            <LightweightChart symbol={selectedSymbol} height={460} />
          ) : (
            <TradingViewWidget symbol={selectedSymbol} />
          )}
        </div>

        {/* Bottom Context & Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 pb-2">
          {/* Active Closest Marking Highlight Card */}
          <div className="glass-card p-5 border-gold/30 bg-gradient-to-br from-gold/10 via-purple-950/20 to-black space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                <Target size={16} /> Live Highlighted Marking
              </h3>
              <span className="text-[9px] bg-gold text-black font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                Pulsing Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-gold/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Step {closestStep.num}: {closestStep.title}</span>
                <span className="text-xs font-mono font-bold text-gold">{closestStep.price.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                {closestStep.desc} ({closestStep.role}).
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-white/40 border-t border-white/5">
                <span>Distance to Market:</span>
                <span className="text-emerald-400 font-mono font-bold">Δ {Math.abs(refPrice - closestStep.price).toFixed(4)} pts</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 border-white/5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Zap size={16} /> Reversal AI Logic
            </h3>
            <div className="p-3 rounded-xl bg-gold/5 border border-gold/10">
              <p className="text-xs text-white/60 leading-relaxed">
                "Market price is currently closest to <strong className="text-gold">Step {closestStep.num} ({closestStep.title})</strong>. Monitor price action around <strong className="text-white font-mono">{closestStep.price.toFixed(2)}</strong> for confirmation before 1M trigger execution."
              </p>
            </div>
          </div>

          <div className="glass-card p-5 border-white/5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Shield size={16} /> Market Confluence
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">6-Step Alignment</p>
                  <p className="text-[10px] text-emerald-400 uppercase font-bold">Optimal Signal Confluence</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-emerald-400/30 bg-emerald-400/10 flex items-center justify-center">
                  <Check size={16} className="text-emerald-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Reversal Proximity Zone</p>
                  <p className="text-[10px] text-gold uppercase font-bold">Active Proximity</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
