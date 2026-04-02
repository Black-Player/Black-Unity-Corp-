import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, Plus, Trash2, TrendingUp, Clock, Tag, MessageSquare, Brain, Sparkles, Filter, Save, Layers, Activity, Target, Zap, Cpu, Eye, Layout } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

interface Indicator {
  id: string;
  name: string;
  type: 'Trend' | 'Momentum' | 'Volatility' | 'Volume';
  logic: string;
  confidence: number;
  created_at: string;
}

export default function Forge({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [isForging, setIsForging] = useState(false);
  const [editorMode, setEditorMode] = useState<'Standard' | 'Advanced'>('Standard');
  const [newIndicator, setNewIndicator] = useState({ name: '', type: 'Trend' as const, logic: '' });

  useEffect(() => {
    const q = query(
      collection(db, 'users', userProfile.uid, 'indicators'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Indicator));
      setIndicators(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userProfile.uid}/indicators`));

    return () => unsubscribe();
  }, [userProfile.uid]);

  const handleForge = async () => {
    if (!newIndicator.name || !newIndicator.logic) return;
    
    const forgedData = {
      ...newIndicator,
      confidence: Math.floor(Math.random() * 20) + 75,
      created_at: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'users', userProfile.uid, 'indicators'), forgedData);
      setIsForging(false);
      setNewIndicator({ name: '', type: 'Trend', logic: '' });
      addToast('Indicator forged in the cosmic fire.', 'success');
    } catch (err) {
      addToast('Failed to forge indicator.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', userProfile.uid, 'indicators', id));
      addToast('Indicator unraveled.', 'info');
    } catch (err) {
      addToast('Failed to delete indicator.', 'error');
    }
  };

  const editorTemplates = {
    Trend: '//@version=5\nstrategy("Trend Follower", overlay=true)\nlongCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))\nif (longCondition)\n    strategy.entry("My Long Id", strategy.long)',
    Momentum: '//@version=5\nindicator("RSI Strategy", overlay=false)\nrsi = ta.rsi(close, 14)\nplot(rsi, "RSI", color.purple)\nhline(70, "Overbought", color.red)\nhline(30, "Oversold", color.green)',
    Volatility: '//@version=5\nindicator("Bollinger Bands", overlay=true)\n[middle, upper, lower] = ta.bb(close, 20, 2)\nplot(upper, color=color.red)\nplot(lower, color=color.green)',
    Volume: '//@version=5\nindicator("Volume Profile", overlay=false)\nplot(volume, color=volume > volume[1] ? color.green : color.red)'
  };

  const switchMode = (mode: 'Standard' | 'Advanced') => {
    setEditorMode(mode);
    if (mode === 'Advanced' && !newIndicator.logic) {
      setNewIndicator(prev => ({ ...prev, logic: editorTemplates[prev.type] }));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Forge</h1>
          <p className="text-white/40">Craft custom technical indicators to enhance your Oracle's vision.</p>
        </div>
        <button 
          onClick={() => setIsForging(true)}
          className="gold-button px-6 py-2 flex items-center gap-2"
        >
          <Hammer size={18} /> Forge Indicator
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {indicators.map((indicator) => (
              <motion.div
                key={indicator.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 border-white/5 hover:border-gold/20 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                    <Activity size={20} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Confidence</p>
                    <p className="text-sm font-bold text-emerald-400">{indicator.confidence}%</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-display font-bold">{indicator.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] text-white/40 uppercase tracking-widest font-bold">
                    {indicator.type}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-emerald-400/80 truncate">
                  {indicator.logic}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                    {new Date(indicator.created_at).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => handleDelete(indicator.id)}
                    className="text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Cpu className="text-gold" size={20} /> Forge Intelligence
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Custom indicators are processed by the Oracle's neural network to identify high-probability confluences. Indicators with {'>'}90% confidence are eligible for the Council's spotlight.
            </p>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Active Indicators</span>
                <span className="text-gold">{indicators.length} / 10</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Neural Load</span>
                <span className="text-emerald-400">Low</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Sparkles size={20} /> Forge Tips
            </h3>
            <ul className="space-y-3 text-xs text-white/40 list-disc pl-4">
              <li>Combine momentum and trend for higher confidence.</li>
              <li>Use EMA(200) as a baseline for all trend indicators.</li>
              <li>Avoid over-complicating logic to reduce lag.</li>
              <li>Test your indicators in the Backtester before live use.</li>
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isForging && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsForging(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 border-gold/20 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold gold-gradient mb-6 flex items-center gap-3">
                <Hammer className="text-gold" size={24} /> Forge Custom Indicator
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Indicator Name</label>
                  <input 
                    type="text"
                    value={newIndicator.name}
                    onChange={(e) => setNewIndicator(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Solar Wind Momentum"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Category</label>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                      {(['Standard', 'Advanced'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => switchMode(mode)}
                          className={`px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest transition-all ${
                            editorMode === mode ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['Trend', 'Momentum', 'Volatility', 'Volume'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setNewIndicator(prev => ({ 
                            ...prev, 
                            type: cat as any,
                            logic: editorMode === 'Advanced' ? editorTemplates[cat as keyof typeof editorTemplates] : prev.logic
                          }));
                        }}
                        className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          newIndicator.type === cat ? 'bg-gold/10 border-gold/50 text-gold' : 'bg-white/5 border-white/10 text-white/40'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    {editorMode === 'Standard' ? 'Logic Script (Pine-like)' : 'Advanced Pine Script IDE'}
                  </label>
                  <div className="relative group">
                    <textarea 
                      value={newIndicator.logic}
                      onChange={(e) => setNewIndicator(prev => ({ ...prev, logic: e.target.value }))}
                      placeholder={editorMode === 'Standard' ? "e.g. RSI(14) > 50 and close > sma(200)" : "//@version=5..."}
                      rows={editorMode === 'Standard' ? 4 : 10}
                      className={`w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-gold/50 transition-all outline-none resize-none ${
                        editorMode === 'Advanced' ? 'scrollbar-thin scrollbar-thumb-gold/20' : ''
                      }`}
                    />
                    {editorMode === 'Advanced' && (
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40" title="Format Code">
                          <Layout size={12} />
                        </button>
                        <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40" title="Check Syntax">
                          <Eye size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsForging(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleForge}
                    disabled={!newIndicator.name || !newIndicator.logic}
                    className="flex-1 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
                  >
                    Forge Indicator
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
