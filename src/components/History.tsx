import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile, Signal } from '../types';
import { History as HistoryIcon, Search, Filter, CheckCircle2, XCircle, Clock, BarChart3, Bot, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function History({ userProfile, addToast }: HistoryProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<'all' | 'tp_hit' | 'sl_hit' | 'active'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSignals = async () => {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('uid', userProfile.uid)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'signals');
      } else {
        setSignals(data as Signal[]);
      }
    };

    fetchSignals();

    const channel = supabase
      .channel(`public:signals:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'signals', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchSignals)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const filteredSignals = signals.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = s.pair.toLowerCase().includes(search.toLowerCase()) || 
                          s.ai_bot.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: signals.length,
    wins: signals.filter(s => s.status.includes('tp')).length,
    losses: signals.filter(s => s.status === 'sl_hit').length,
    active: signals.filter(s => s.status === 'active').length,
  };

  const winRate = stats.total > stats.active ? Math.round((stats.wins / (stats.total - stats.active)) * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">Signal History</h1>
          <p className="text-white/40">Review your past prophecies and performance.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Total</p>
            <p className="text-lg font-bold font-display">{stats.total}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Wins</p>
            <p className="text-lg font-bold font-display text-emerald-400">{stats.wins}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Losses</p>
            <p className="text-lg font-bold font-display text-red-400">{stats.losses}</p>
          </div>
          <div className="glass-card px-4 py-2 text-center border-gold/20">
            <p className="text-[10px] text-gold uppercase tracking-widest">Win Rate</p>
            <p className="text-lg font-bold font-display text-gold">{winRate}%</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text"
            placeholder="Search by pair or bot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full cosmic-input pl-12"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'tp_hit', 'sl_hit'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                filter === f 
                  ? 'bg-gold text-black border-gold' 
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Signal</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Bot & Strategy</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Levels</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Confidence</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredSignals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/20 italic">No signals found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredSignals.map((signal) => (
                    <motion.tr 
                      key={signal.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Zap className="text-gold" size={16} />
                          </div>
                          <div>
                            <p className="font-bold">{signal.pair}</p>
                            <p className="text-[10px] text-white/40">{signal.timeframe}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Bot size={14} className="text-gold/50" />
                          <div>
                            <p className="text-sm font-medium">{signal.ai_bot}</p>
                            <p className="text-[10px] text-white/40">{signal.strategy}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono whitespace-nowrap">
                          <div className="text-gold">E: {signal.entry}</div>
                          <div className="text-red-400">SL: {signal.stop_loss}</div>
                          <div className="text-emerald-400">TP1: {signal.tp1}</div>
                          <div className="text-emerald-400">TP4: {signal.tp4}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${signal.confidence}%` }}></div>
                          </div>
                          <span className="text-xs font-bold">{signal.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 ${
                          signal.status.includes('tp') ? 'bg-emerald-400/10 text-emerald-400' :
                          signal.status === 'sl_hit' ? 'bg-red-400/10 text-red-400' :
                          'bg-gold/10 text-gold'
                        }`}>
                          {signal.status.includes('tp') ? <CheckCircle2 size={10} /> :
                           signal.status === 'sl_hit' ? <XCircle size={10} /> :
                           <Clock size={10} />}
                          {signal.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-white/40">{new Date(signal.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-white/20">{new Date(signal.created_at).toLocaleTimeString()}</p>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {filteredSignals.length === 0 ? (
              <div className="px-6 py-12 text-center text-white/20 italic">No signals found matching your criteria.</div>
            ) : (
              filteredSignals.map((signal) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Zap className="text-gold" size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{signal.pair}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{signal.timeframe} • {signal.ai_bot}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 ${
                      signal.status.includes('tp') ? 'bg-emerald-400/10 text-emerald-400' :
                      signal.status === 'sl_hit' ? 'bg-red-400/10 text-red-400' :
                      'bg-gold/10 text-gold'
                    }`}>
                      {signal.status.includes('tp') ? <CheckCircle2 size={10} /> :
                       signal.status === 'sl_hit' ? <XCircle size={10} /> :
                       <Clock size={10} />}
                      {signal.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Entry & SL</p>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-gold">{signal.entry}</span>
                        <span className="text-white/20">/</span>
                        <span className="text-red-400">{signal.stop_loss}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Targets</p>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400">{signal.tp1}</span>
                        <span className="text-white/20">-</span>
                        <span className="text-emerald-400">{signal.tp4}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${signal.confidence}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-white/40">{signal.confidence}%</span>
                    </div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">
                      {new Date(signal.created_at).toLocaleDateString()} {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
