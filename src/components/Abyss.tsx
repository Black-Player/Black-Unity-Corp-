import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Ghost, Skull, Zap, TrendingUp, TrendingDown, ShieldAlert, Sparkles, Activity, Target, BarChart3 } from 'lucide-react';
import { getAbyssalSignals } from '../services/aiService';

interface AbyssProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface AbyssalSignal {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entry: number;
  tp: number;
  sl: number;
  risk: string;
  reward: string;
}

export default function Abyss({ userProfile, addToast }: AbyssProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [abyssalPower, setAbyssalPower] = useState(0);
  const [activeSignals, setActiveSignals] = useState<AbyssalSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState<number[]>([]);

  useEffect(() => {
    if (isEntering) {
      setLoading(true);
      const fetchSignals = async () => {
        const signals = await getAbyssalSignals();
        setActiveSignals(signals);
        setLoading(false);
      };
      fetchSignals();

      // Generate mock heatmap data
      setHeatmapData(Array.from({ length: 100 }, () => Math.floor(Math.random() * 100)));
    }
  }, [isEntering]);

  const enterAbyss = () => {
    if (userProfile.tier !== 'legendary' && userProfile.tier !== 'mythic' && userProfile.tier !== 'zion') {
      addToast('Only Legendary, Mythic, and Zion traders can enter the Abyss.', 'error');
      return;
    }
    setIsEntering(true);
    const interval = setInterval(() => {
      setAbyssalPower(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="space-y-8 pb-12 min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-50 z-0" />
      
      <AnimatePresence mode="wait">
        {!isEntering ? (
          <motion.div
            key="entry"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="relative z-10 text-center space-y-8 max-w-2xl"
          >
            <div className="p-6 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-block animate-pulse">
              <Ghost size={64} />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-display font-bold text-white uppercase tracking-tighter">The Abyss</h1>
              <p className="text-purple-400/60 uppercase tracking-[0.4em] text-xs">Where the boldest trade in the dark pools of the cosmos.</p>
            </div>

            <div className="glass-card p-8 border-purple-500/20 bg-purple-500/5 space-y-6">
              <p className="text-sm text-white/60 leading-relaxed italic">
                "In the Abyss, indicators fail and standard strategies crumble. Only those with true cosmic intuition survive the high-stakes dark pools."
              </p>
              <div className="flex items-center justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-purple-400">
                <span className="flex items-center gap-2"><ShieldAlert size={14} /> Extreme Risk</span>
                <span className="flex items-center gap-2"><Zap size={14} /> Instant Execution</span>
                <span className="flex items-center gap-2"><Target size={14} /> 1:5+ R:R</span>
              </div>
            </div>

            <button 
              onClick={enterAbyss}
              className="w-full py-4 bg-purple-600 text-white font-display font-bold uppercase tracking-[0.3em] rounded-xl hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all"
            >
              Enter the Dark Pool
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="abyss-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 w-full max-w-6xl space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Eye size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Abyssal Dark Pool</h2>
                  <p className="text-purple-400/60 text-[10px] uppercase tracking-widest font-bold">Active Session: {(userProfile.tier || 'FREE').toUpperCase()} ACCESS</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-purple-400/40 uppercase tracking-widest font-bold">Abyssal Power</p>
                  <p className="text-2xl font-display font-bold text-purple-400">{abyssalPower}%</p>
                </div>
                <div className="h-12 w-12 rounded-full border-2 border-purple-500/20 flex items-center justify-center">
                  <Activity className="text-purple-400 animate-pulse" size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Liquidity Heatmap Simulation */}
              <div className="md:col-span-3 glass-card p-6 border-purple-500/20 bg-purple-900/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={16} className="text-purple-400" /> Dark Pool Liquidity Heatmap
                  </h3>
                  <span className="text-[10px] text-purple-400/40 uppercase font-bold">Real-time Scanning</span>
                </div>
                <div className="grid grid-cols-10 gap-1 h-32">
                  {heatmapData.map((val, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="rounded-sm transition-colors duration-500"
                      style={{ 
                        backgroundColor: `rgba(168, 85, 247, ${val / 100})`,
                        boxShadow: val > 80 ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none'
                      }}
                      title={`Liquidity: ${val}%`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] text-white/20 uppercase tracking-widest font-bold">
                  <span>Low Liquidity</span>
                  <span>Institutional Cluster</span>
                </div>
              </div>

              {loading ? (
                <div className="col-span-full text-center py-20">
                  <Sparkles className="w-12 h-12 text-purple-500/20 animate-spin mx-auto mb-4" />
                  <p className="text-purple-400/40 italic">Scanning the dark pools...</p>
                </div>
              ) : activeSignals.length > 0 ? (
                activeSignals.map((signal, i) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 border-purple-500/20 bg-purple-900/5 space-y-6 group hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white/40">{signal.pair}</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${signal.type === 'BUY' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {signal.type}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Entry</span>
                        <span className="font-mono text-white">{signal.entry}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Target</span>
                        <span className="font-mono text-purple-400">{signal.tp}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Skull className="text-red-400/40" size={14} />
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{signal.risk}</span>
                      </div>
                      <span className="text-xs font-bold text-purple-400">{signal.reward} R:R</span>
                    </div>

                    <button 
                      onClick={() => addToast(`Executing ${signal.type} on ${signal.pair}...`, 'info')}
                      className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all"
                    >
                      Execute Abyssal Trade
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-20 glass-card border-purple-500/10">
                  <Ghost className="w-12 h-12 text-purple-500/10 mx-auto mb-4" />
                  <p className="text-purple-400/20 italic">The Abyss is silent. No signals detected in the dark pools.</p>
                </div>
              )}
            </div>

            <div className="glass-card p-8 border-purple-500/10 bg-purple-900/10 space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-400" size={20} />
                <h3 className="text-lg font-display font-bold text-white uppercase tracking-widest">Abyssal Wisdom</h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed italic">
                "The dark pools are showing massive institutional liquidity shifts in the Volatility indices. The cosmic whales are moving. Position yourself before the tide turns."
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
