import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { Signal, BOTS, UserProfile } from '../types';
import { getBotCharacter } from '../lib/themeUtils';
import { motion } from 'motion/react';
import LightweightChart from './LightweightChart';
import { TrendingUp, TrendingDown, Target, BarChart3, Clock, Bot, Sparkles, ArrowLeft } from 'lucide-react';

interface AssetDetailsProps {
  pair: string;
  onBack: () => void;
  userProfile: UserProfile;
}

export default function AssetDetails({ pair, onBack, userProfile }: AssetDetailsProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .eq('pair', pair)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        setSignals(data as Signal[]);
      } catch (err) {
        await handleSupabaseError(err, OperationType.LIST, 'signals');
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [pair]);

  // Mock bot performance for this asset
  const botPerformance = BOTS.map(bot => ({
    name: bot.name,
    winRate: Math.floor(Math.random() * 30) + 60, // 60-90%
    totalSignals: Math.floor(Math.random() * 50) + 10
  }));

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl glass-card border-white/5 hover:border-gold/20 transition-all text-white/60"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">{pair} Deep Dive</h1>
          <p className="text-white/40">Advanced cosmic analysis and historical performance.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="h-[500px] glass-card overflow-hidden">
            <LightweightChart symbol={pair} height={500} />
          </div>

          <div className="glass-card p-6 space-y-6">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Bot className="text-gold" size={20} /> Bot Performance on {pair}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {botPerformance.map((bot, i) => (
                <motion.div
                  key={bot.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm">{getBotCharacter(bot.name, userProfile.theme)}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{bot.totalSignals} Signals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{bot.winRate}%</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Win Rate</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Clock className="text-gold" size={20} /> Recent Signals
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-white/20">Loading cosmic data...</div>
              ) : signals.length === 0 ? (
                <div className="text-center py-8 text-white/20 italic">No historical signals for this pair.</div>
              ) : (
                signals.map((signal) => (
                  <div key={signal.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gold">{getBotCharacter(signal.ai_bot, userProfile.theme)}</span>
                      <span className={`text-[10px] font-bold uppercase ${signal.status === 'tp_hit' ? 'text-emerald-400' : signal.status === 'sl_hit' ? 'text-red-400' : 'text-white/40'}`}>
                        {signal.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{signal.strategy}</span>
                      <span className="font-mono">{signal.entry}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6 bg-gold/5 border-gold/20">
            <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <Sparkles className="text-gold" size={18} /> Oracle Insight
            </h3>
            <p className="text-sm text-white/70 leading-relaxed italic">
              "{pair} is currently exhibiting strong liquidity sweeps near key psychological levels. The Oracles suggest monitoring the H4 timeframe for a potential SMC reversal."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
