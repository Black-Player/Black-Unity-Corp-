import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Eye, Zap, Sparkles, Activity, Target, Palette, Code, Check, Search, Globe, Clock, BarChart3, Layers, Shield, ChevronRight, LayoutGrid, List } from 'lucide-react';
import LightweightChart from './LightweightChart';
import { useMarketContext } from '../MarketContext';

const SYMBOLS = [
  { id: 'R_10', name: 'Volatility 10 Index', category: 'Synthetics' },
  { id: 'R_25', name: 'Volatility 25 Index', category: 'Synthetics' },
  { id: 'R_50', name: 'Volatility 50 Index', category: 'Synthetics' },
  { id: 'R_75', name: 'Volatility 75 Index', category: 'Synthetics' },
  { id: 'R_100', name: 'Volatility 100 Index', category: 'Synthetics' },
  { id: 'frxEURUSD', name: 'EUR/USD', category: 'Forex' },
  { id: 'frxGBPUSD', name: 'GBP/USD', category: 'Forex' },
  { id: 'frxUSDJPY', name: 'USD/JPY', category: 'Forex' },
  { id: 'frxXAUUSD', name: 'Gold/USD', category: 'Commodities' },
  { id: 'cryBTCUSD', name: 'Bitcoin/USD', category: 'Crypto' },
];

export default function AdvancedChart() {
  const { marketPrices } = useMarketContext();
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSidebar, setShowSidebar] = useState(true);

  const filteredSymbols = SYMBOLS.filter(s => 
    (activeCategory === 'All' || s.category === activeCategory) &&
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentPrice = marketPrices[selectedSymbol]?.price || 0;
  const change = marketPrices[selectedSymbol]?.change || 0;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-card border-white/5 flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  type="text"
                  placeholder="Search rituals..."
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
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <header className="glass-card p-6 border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
            >
              <LayoutGrid size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Sparkles className="text-gold" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold gold-gradient leading-none">Oracle Vision</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Advanced Multidimensional Analysis</p>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Current Price</p>
                <p className="text-xl font-mono font-bold text-white">{currentPrice.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">24h Change</p>
                <p className={`text-xl font-mono font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Oracle Active</span>
            </div>
          </div>
        </header>

        <div className="flex-1 glass-card border-white/5 overflow-hidden relative">
          <LightweightChart symbol={selectedSymbol} height={600} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Activity size={16} /> Market Sentiment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 font-bold">Bullish (64%)</span>
                <span className="text-rose-400 font-bold">Bearish (36%)</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" style={{ width: '64%' }} />
                <div className="h-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ width: '36%' }} />
              </div>
              <p className="text-[10px] text-white/20 italic text-center">Based on real-time order flow and social sentiment.</p>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Zap size={16} /> AI Insight
            </h3>
            <div className="p-3 rounded-xl bg-gold/5 border border-gold/10">
              <p className="text-xs text-white/60 leading-relaxed">
                "The current structure suggests a liquidity sweep below the previous low. Watch for a rejection candle to confirm the bullish reversal."
              </p>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Shield size={16} /> Risk Guard
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Volatility Risk</p>
                <p className="text-[10px] text-emerald-400 uppercase font-bold">Low Impact</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-emerald-400/20 flex items-center justify-center">
                <Check size={20} className="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
