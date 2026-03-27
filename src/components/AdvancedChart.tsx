import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Eye, Zap, Sparkles, Activity, Target } from 'lucide-react';

const MOCK_CHART_DATA = Array.from({ length: 50 }).map((_, i) => ({
  time: i,
  price: 1.0850 + Math.sin(i / 5) * 0.0020 + Math.random() * 0.0005,
  ai_prediction: 1.0850 + Math.sin(i / 5) * 0.0020 + Math.random() * 0.0005 + (i > 40 ? 0.0010 : 0),
}));

export default function AdvancedChart() {
  const [data, setData] = useState(MOCK_CHART_DATA);
  const [selectedPair, setSelectedPair] = useState('EURUSD');

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Oracle's Eye</h1>
          <p className="text-white/40">Advanced price visualization with AI-driven predictive overlays.</p>
        </div>
        <div className="flex gap-2">
          {['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'].map(p => (
            <button 
              key={p}
              onClick={() => setSelectedPair(p)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                selectedPair === p ? 'bg-gold text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 glass-card p-6 border-white/5 h-[500px] relative">
          <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold">
              <TrendingUp size={14} /> 1.0872 (+0.12%)
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold text-xs font-bold">
              <Sparkles size={14} /> AI Prediction: Bullish
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: '#D4AF37' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#D4AF37" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
              <Area 
                type="monotone" 
                dataKey="ai_prediction" 
                stroke="#4ade80" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorAi)" 
              />
              <ReferenceLine y={1.0865} stroke="#ffffff10" strokeDasharray="3 3" label={{ position: 'right', value: 'Resistance', fill: '#ffffff20', fontSize: 10 }} />
              <ReferenceLine y={1.0840} stroke="#ffffff10" strokeDasharray="3 3" label={{ position: 'right', value: 'Support', fill: '#ffffff20', fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Activity className="text-gold" size={20} /> Market Pulse
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Volatility', value: 'High', color: 'text-red-400' },
                { label: 'Trend Strength', value: 'Strong', color: 'text-emerald-400' },
                { label: 'RSI (14)', value: '62.4', color: 'text-white' },
                { label: 'Volume', value: '1.2M', color: 'text-white' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-xs">
                  <span className="text-white/40">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Target size={20} /> AI Targets
            </h3>
            <div className="space-y-3">
              {[
                { label: 'TP 1', price: '1.0885', hit: false },
                { label: 'TP 2', price: '1.0910', hit: false },
                { label: 'SL', price: '1.0820', hit: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{item.label}</span>
                  <span className="text-sm font-mono font-bold text-gold">{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
