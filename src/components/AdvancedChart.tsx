import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Eye, Zap, Sparkles, Activity, Target, Palette, Code, Check } from 'lucide-react';

const MOCK_CHART_DATA = Array.from({ length: 50 }).map((_, i) => ({
  time: i,
  price: 1.0850 + Math.sin(i / 5) * 0.0020 + Math.random() * 0.0005,
  ai_prediction: 1.0850 + Math.sin(i / 5) * 0.0020 + Math.random() * 0.0005 + (i > 40 ? 0.0010 : 0),
}));

const THEMES = {
  cosmic: {
    name: 'Cosmic Gold',
    primary: '#D4AF37',
    secondary: '#4ade80',
    background: '#0a0a0a',
    grid: '#ffffff05',
  },
  cyber: {
    name: 'Neon Cyber',
    primary: '#00f2ff',
    secondary: '#ff00ff',
    background: '#050505',
    grid: '#00f2ff10',
  },
  emerald: {
    name: 'Emerald Forest',
    primary: '#10b981',
    secondary: '#fbbf24',
    background: '#06100a',
    grid: '#10b98110',
  },
  mono: {
    name: 'Monochrome',
    primary: '#ffffff',
    secondary: '#9ca3af',
    background: '#111111',
    grid: '#ffffff10',
  }
};

export default function AdvancedChart() {
  const [data, setData] = useState(MOCK_CHART_DATA);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('cosmic');
  const [customCSS, setCustomCSS] = useState('');
  const [showCustomizer, setShowCustomizer] = useState(false);

  const theme = THEMES[currentTheme];

  return (
    <div className="space-y-8 pb-12 relative">
      <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Oracle's Eye</h1>
          <p className="text-white/40">Advanced price visualization with AI-driven predictive overlays.</p>
        </div>
        <div className="flex items-center gap-4">
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
          <button 
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`p-2 rounded-xl transition-all ${showCustomizer ? 'bg-gold text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
            title="Customize Appearance"
          >
            <Palette size={20} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showCustomizer && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 border-gold/20 bg-gold/5 grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                <Palette size={16} /> Predefined Themes
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCurrentTheme(t)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      currentTheme === t ? 'border-gold bg-gold/10 text-white' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold">{THEMES[t].name}</span>
                    {currentTheme === t && <Check size={14} className="text-gold" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                <Code size={16} /> Custom CSS Injection
              </h3>
              <textarea 
                value={customCSS}
                onChange={(e) => setCustomCSS(e.target.value)}
                placeholder=".oracle-chart { filter: hue-rotate(90deg); }"
                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-white/80 focus:border-gold outline-none resize-none"
              />
              <p className="text-[10px] text-white/20 italic">Inject global CSS to override any element. Use .oracle-chart class for targeting.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 glass-card p-6 border-white/5 h-[500px] relative oracle-chart overflow-hidden" style={{ backgroundColor: theme.background }}>
          <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold">
              <TrendingUp size={14} /> 1.0872 (+0.12%)
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold text-xs font-bold" style={{ color: theme.primary, borderColor: `${theme.primary}33`, backgroundColor: `${theme.primary}1a` }}>
              <Sparkles size={14} /> AI Prediction: Bullish
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.secondary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.secondary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: theme.background, border: `1px solid ${theme.primary}33`, borderRadius: '12px' }}
                itemStyle={{ color: theme.primary }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={theme.primary} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
              <Area 
                type="monotone" 
                dataKey="ai_prediction" 
                stroke={theme.secondary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorAi)" 
              />
              <ReferenceLine y={1.0865} stroke={`${theme.primary}22`} strokeDasharray="3 3" label={{ position: 'right', value: 'Resistance', fill: `${theme.primary}44`, fontSize: 10 }} />
              <ReferenceLine y={1.0840} stroke={`${theme.primary}22`} strokeDasharray="3 3" label={{ position: 'right', value: 'Support', fill: `${theme.primary}44`, fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4" style={{ borderColor: `${theme.primary}33`, backgroundColor: `${theme.primary}0d` }}>
            <h3 className="text-lg font-display font-bold flex items-center gap-2" style={{ color: theme.primary }}>
              <Activity size={20} /> Market Pulse
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
                  <span className="text-sm font-mono font-bold" style={{ color: theme.primary }}>{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
