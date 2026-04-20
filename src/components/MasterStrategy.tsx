import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Plus, Trash2, Shield, Zap, Cpu, Eye, Activity, Grid, Layout, X } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { MasterStrategy as MasterStrategyType, UserProfile, BOTS } from '../types';

interface MasterStrategyProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MasterStrategy: React.FC<MasterStrategyProps> = ({ userProfile, addToast }) => {
  const [strategies, setStrategies] = useState<MasterStrategyType[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    bots: [] as string[],
    risk_weight: 1.0
  });

  useEffect(() => {
    const fetchStrategies = async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('uid', userProfile.uid);
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'strategies');
      } else {
        setStrategies(data as MasterStrategyType[]);
      }
    };

    fetchStrategies();

    const channel = supabase
      .channel(`public:strategies:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'strategies', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchStrategies)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStrategy.bots.length === 0) {
      addToast('Select at least one bot for your strategy', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('strategies')
        .insert([{
          ...newStrategy,
          uid: userProfile.uid,
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setShowAdd(false);
      setNewStrategy({ name: '', bots: [], risk_weight: 1.0 });
      addToast('Master Strategy forged!', 'success');
    } catch (error) {
      await handleSupabaseError(error, OperationType.CREATE, 'strategies');
      addToast('Failed to forge strategy', 'error');
    }
  };

  const toggleBot = (botName: string) => {
    setNewStrategy(prev => ({
      ...prev,
      bots: prev.bots.includes(botName)
        ? prev.bots.filter(b => b !== botName)
        : [...prev.bots, botName]
    }));
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      addToast('Strategy dissolved', 'info');
    } catch (error) {
      await handleSupabaseError(error, OperationType.DELETE, 'strategies');
      addToast('Failed to dissolve strategy', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Master Strategies</h2>
            <p className="text-sm text-white/40">Combine the power of multiple Oracles</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg shadow-purple-500/25"
        >
          <Plus className="w-4 h-4" />
          Forge Strategy
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="glass-card p-6 space-y-6 border-purple-500/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400">Forge New Master Strategy</h3>
                <button type="button" onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Strategy Name</label>
                  <input
                    type="text"
                    required
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 outline-none"
                    placeholder="e.g., The Trinity Protocol"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Select Oracles</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BOTS.map(bot => (
                      <button
                        key={bot.name}
                        type="button"
                        onClick={() => toggleBot(bot.name)}
                        className={`p-3 rounded-xl border transition-all text-left space-y-2 ${
                          newStrategy.bots.includes(bot.name)
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-bold">{bot.name}</div>
                        <div className="text-[8px] uppercase tracking-tighter opacity-60">{bot.strategy}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Risk Weight</label>
                    <span className="text-xs font-mono text-purple-400">{newStrategy.risk_weight}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={newStrategy.risk_weight}
                    onChange={(e) => setNewStrategy({ ...newStrategy, risk_weight: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20"
              >
                Forge Strategy
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.length > 0 ? (
          strategies.map((strat) => (
            <motion.div
              key={strat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-5 space-y-4 group border-purple-500/10 hover:border-purple-500/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">{strat.name}</h3>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-white/40">Risk Weight: {strat.risk_weight}x</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(strat.id)}
                  className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {strat.bots.map(bot => (
                  <span key={bot} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                    {bot}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                <span>Created {new Date(strat.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Zap className="w-3 h-3" />
                  Active
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
            <Layers className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-blue-200/40 italic">No master strategies forged yet. Combine your Oracles for maximum power.</p>
          </div>
        )}
      </div>
    </div>
  );
};
