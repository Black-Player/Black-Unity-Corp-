import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { UserProfile, BOTS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, Trash2, Plus, Sparkles, ShieldCheck, Zap, Bot, Settings, Save, Layers, Activity, Target } from 'lucide-react';

interface MasterStrategy {
  id: string;
  user_id: string;
  name: string;
  bots: string[];
  risk_weight: number;
  created_at: string;
}

interface StrategyBuilderProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function StrategyBuilder({ userProfile, addToast }: StrategyBuilderProps) {
  const [strategies, setStrategies] = useState<MasterStrategy[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [riskWeight, setRiskWeight] = useState(50);

  useEffect(() => {
    const q = query(
      collection(db, 'users', userProfile.uid, 'strategies')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterStrategy));
      setStrategies(data);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  const handleBuild = async () => {
    if (!newStrategyName.trim() || selectedBots.length === 0) return;

    const strategyData: Omit<MasterStrategy, 'id'> = {
      user_id: userProfile.uid,
      name: newStrategyName,
      bots: selectedBots,
      risk_weight: riskWeight,
      created_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'users', userProfile.uid, 'strategies'), strategyData);
      setNewStrategyName('');
      setSelectedBots([]);
      setIsBuilding(false);
      addToast('Master Strategy woven successfully.', 'success');
    } catch (err) {
      addToast('Failed to weave strategy.', 'error');
    }
  };

  const toggleBot = (botName: string) => {
    setSelectedBots(prev => 
      prev.includes(botName) ? prev.filter(b => b !== botName) : [...prev, botName]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', userProfile.uid, 'strategies', id));
      addToast('Strategy unraveled.', 'info');
    } catch (err) {
      addToast('Failed to delete strategy.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Weaver's Loom</h1>
          <p className="text-white/40">Combine multiple AI Oracle strategies into a single Master Strategy.</p>
        </div>
        <button 
          onClick={() => setIsBuilding(true)}
          className="gold-button px-6 py-2 flex items-center gap-2"
        >
          <Plus size={16} /> Weave Strategy
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {strategies.map((strategy) => (
                <motion.div
                  key={strategy.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card p-6 border-gold/20 bg-gold/5 flex flex-col space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                      <Layers size={24} />
                    </div>
                    <button 
                      onClick={() => handleDelete(strategy.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xl font-display font-bold">{strategy.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {strategy.bots.map(bot => (
                        <span key={bot} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] text-white/40 uppercase tracking-widest font-bold">
                          {bot}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Risk Weight</p>
                      <p className="text-sm font-bold text-gold">{strategy.risk_weight}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-bold text-emerald-400 uppercase">Optimized</p>
                    </div>
                  </div>

                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2">
                    <Activity size={12} /> View Performance
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {strategies.length === 0 && !isBuilding && (
              <div className="md:col-span-2 py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                  <Layers size={40} />
                </div>
                <p className="text-white/40 italic">The loom is silent. Start weaving your first Master Strategy.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 space-y-6 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Zap className="text-gold" size={20} /> Backtest Simulation
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Simulated Period</span>
                  <span className="text-xs text-white">Last 30 Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Win Rate</span>
                  <span className="text-xs text-emerald-400 font-bold">72.4%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Profit Factor</span>
                  <span className="text-xs text-gold font-bold">2.84</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gold w-3/4" />
                </div>
              </div>
              <p className="text-[10px] text-white/20 italic text-center">
                Simulations are based on historical data and AI projections. Past performance does not guarantee future results.
              </p>
              <button className="w-full py-3 rounded-xl bg-gold text-black text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-gold/20 transition-all">
                Run New Simulation
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-gold/20 bg-gold/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <ShieldCheck className="text-gold" size={20} /> Safety Protocols
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Max Drawdown Limit', value: '5%' },
                { label: 'Daily Loss Cap', value: '$200' },
                { label: 'Auto-Hedge', value: 'Enabled' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-white/40 uppercase font-bold">{item.label}</span>
                  <span className="text-xs text-white font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBuilding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsBuilding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 border-gold/20 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold gold-gradient mb-6 flex items-center gap-3">
                <Layers className="text-gold" size={24} /> Weave Master Strategy
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Strategy Name</label>
                  <input 
                    type="text"
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    placeholder="e.g. The Great Convergence"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Select Oracles to Combine</label>
                  <div className="grid grid-cols-2 gap-3">
                    {BOTS.map((bot) => (
                      <button
                        key={bot.name}
                        onClick={() => toggleBot(bot.name)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedBots.includes(bot.name) 
                            ? 'bg-gold/10 border-gold/50 text-gold' 
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-bold">{bot.name}</p>
                        <p className="text-[10px] opacity-60">{bot.strategy}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Risk Weighting</label>
                    <span className="text-gold font-bold text-xs">{riskWeight}%</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={riskWeight}
                    onChange={(e) => setRiskWeight(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                  <div className="flex justify-between text-[8px] text-white/20 uppercase tracking-widest font-bold">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsBuilding(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBuild}
                    disabled={!newStrategyName.trim() || selectedBots.length === 0}
                    className="flex-1 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} /> Weave Strategy
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
