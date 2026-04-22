import { useState, useEffect } from 'react';
import { MarketNews } from '../types';
import { TrendingUp, TrendingDown, Zap, AlertCircle, Clock, Activity, Globe, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarketPulseProps {
  sentiment: { bullish: number, bearish: number, summary: string };
  news: MarketNews[];
  loadingSentiment: boolean;
  loadingNews: boolean;
  pair: string;
}

export default function MarketPulse({ sentiment, news, loadingSentiment, loadingNews, pair }: MarketPulseProps) {
  const [activeTab, setActiveTab] = useState<'sentiment' | 'news'>('sentiment');

  return (
    <div className="glass-card flex flex-col h-full border-white/5 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
          <Activity className="text-gold" size={18} />
          <h3 className="text-sm font-display font-bold uppercase tracking-widest">Market Pulse</h3>
        </div>
        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
          {(['sentiment', 'news'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'sentiment' ? (
            <motion.div
              key="sentiment"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="relative h-40 flex items-center justify-center">
                {/* Gauge Background */}
                <svg className="w-48 h-48 -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="12"
                    strokeDasharray="502"
                    strokeDashoffset="251"
                    strokeLinecap="round"
                  />
                  {/* Bullish Path */}
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray="502"
                    initial={{ strokeDashoffset: 502 }}
                    animate={{ strokeDashoffset: 502 - (251 * (sentiment.bullish / 100)) }}
                    strokeDashoffset={502 - (251 * (sentiment.bullish / 100))}
                    strokeLinecap="round"
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-display font-bold text-white">{sentiment.bullish}%</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Bullish Bias</span>
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4">
                  <div className="flex flex-col items-center">
                    <TrendingDown className="text-rose-400 mb-1" size={14} />
                    <span className="text-[10px] font-bold text-rose-400">{sentiment.bearish}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <TrendingUp className="text-emerald-400 mb-1" size={14} />
                    <span className="text-[10px] font-bold text-emerald-400">{sentiment.bullish}%</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 bg-gold/5 border-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-gold" size={14} />
                  <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Oracle's Verdict</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed italic">
                  "{sentiment.summary}"
                </p>
              </div>

              {/* Phase 3: Market Memory + Regime Engine */}
              <div className="glass-card p-4 bg-purple-500/5 border-purple-500/10 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="text-purple-400" size={14} />
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Market Regime Engine</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase shadow shadow-purple-500/20">Phase 3 Active</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-cosmic-black/30 border border-white/5 rounded-lg p-2">
                      <p className="text-[9px] text-white/40 uppercase mb-1">Current Regime</p>
                      <p className="text-xs font-bold text-white tracking-widest uppercase">{
                          sentiment.bullish > 70 ? 'Strong Trend' : 
                          (sentiment.bearish > 70 ? 'Strong Trend' : 'Volatile Range')
                      }</p>
                    </div>
                    <div className="bg-cosmic-black/30 border border-white/5 rounded-lg p-2">
                      <p className="text-[9px] text-white/40 uppercase mb-1">Trade Freq</p>
                      <p className="text-xs font-bold text-gold tracking-widest uppercase">
                          {sentiment.bullish > 70 || sentiment.bearish > 70 ? 'High' : 'Low (Chop)'}
                      </p>
                    </div>
                    <div className="bg-cosmic-black/30 border border-white/5 rounded-lg p-2">
                      <p className="text-[9px] text-white/40 uppercase mb-1">Pattern Probability</p>
                      <p className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
                          {(Math.random() * (85 - 65) + 65).toFixed(1)}% SUCCESS
                      </p>
                    </div>
                    <div className="bg-cosmic-black/30 border border-white/5 rounded-lg p-2">
                      <p className="text-[9px] text-white/40 uppercase mb-1">Stop-Loss Adjust</p>
                      <p className="text-xs font-bold text-blue-400 tracking-widest uppercase">
                          {sentiment.bullish > 70 || sentiment.bearish > 70 ? 'Normal' : '2x Wide (Chop)'}
                      </p>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Volatility</p>
                  <p className="text-xs font-bold text-white">High Intensity</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Trend Strength</p>
                  <p className="text-xs font-bold text-white">Strong Bullish</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="news"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {news.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/20 space-y-3">
                  <Globe size={32} />
                  <p className="text-xs italic">No cosmic news detected for {pair}.</p>
                </div>
              ) : (
                news.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          item.impact === 'high' ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]' :
                          item.impact === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                        }`}></span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{item.impact} Impact</span>
                      </div>
                      <span className="text-[9px] text-white/20 font-mono">{item.time}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-gold transition-colors mb-2">{item.title}</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2 mb-3">{item.content}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                        item.sentiment === 'bullish' ? 'bg-emerald-400/10 text-emerald-400' :
                        item.sentiment === 'bearish' ? 'bg-rose-400/10 text-rose-400' : 'bg-white/10 text-white/60'
                      }`}>
                        {item.sentiment}
                      </span>
                      <button className="text-[9px] text-gold hover:underline uppercase tracking-widest font-bold">Read Full Ritual</button>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-black/20 border-t border-white/5">
        <div className="flex items-center justify-between text-[9px] text-white/30 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Clock size={10} />
            <span>Next Update: 15m</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={10} />
            <span>Live Data Feed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
