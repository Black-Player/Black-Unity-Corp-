import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Trash2, TrendingUp, TrendingDown, Clock, Tag, MessageSquare, Brain, Sparkles, Filter, Save, Download } from 'lucide-react';

interface JournalEntry {
  id: string;
  uid: string;
  pair: string;
  type: 'buy' | 'sell';
  pnl: number;
  entry_price: number;
  exit_price: number;
  notes: string;
  emotion: 'calm' | 'anxious' | 'excited' | 'greedy' | 'fearful';
  mistakes: string[];
  created_at: string;
  tags: string[];
}

export default function Archive({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Omit<JournalEntry, 'id' | 'uid' | 'created_at'>>({
    pair: 'BTCUSD',
    type: 'buy',
    pnl: 0,
    entry_price: 0,
    exit_price: 0,
    notes: '',
    emotion: 'calm',
    mistakes: [],
    tags: []
  });

  useEffect(() => {
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('journal')
        .select('*')
        .eq('uid', userProfile.uid)
        .order('created_at', { ascending: false });
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'journal');
      } else {
        setEntries(data as JournalEntry[]);
      }
    };

    fetchEntries();

    const channel = supabase
      .channel(`public:journal:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'journal', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchEntries)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const handleExportRecord = async () => {
      try {
          addToast("Retrieving Immortal Trade Record...", "info");
          const trades = await dbService.list('trades', [
              where('uid', '==', userProfile.uid),
              where('status', '==', 'closed')
          ]);
          
          if (!trades || trades.length === 0) {
              addToast("No closed trades found in the archives.", "info");
              return;
          }

          let csvContent = "data:text/csv;charset=utf-8,";
          csvContent += "ID,Pair,Type,Entry Price,Closing Price,P/L,Close Reason,Closed At\n";

          trades.forEach((trade: any) => {
              const row = [
                  trade.id,
                  trade.pair,
                  trade.type,
                  trade.entry_price,
                  trade.exit_price ||trade.current_price, // fallback
                  trade.pnl,
                  trade.close_reason || 'Unknown',
                  trade.closed_at || ''
              ].join(",");
              csvContent += row + "\r\n";
          });

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `immortal_trade_record_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          addToast("Immortal Trade Record Downloaded.", "success");
      } catch (err) {
          addToast("Failed to retrieve Immortal Record.", "error");
          console.error(err);
      }
  };

  const handleAddEntry = async () => {
    if (!newEntry.pair || !newEntry.notes) return;

    try {
      const { error } = await supabase
        .from('journal')
        .insert([{
          ...newEntry,
          uid: userProfile.uid,
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;

      setIsAdding(false);
      setNewEntry({
        pair: 'BTCUSD',
        type: 'buy',
        pnl: 0,
        entry_price: 0,
        exit_price: 0,
        notes: '',
        emotion: 'calm',
        mistakes: [],
        tags: []
      });
      addToast('Journal entry etched in the cosmic archive.', 'success');
    } catch (err) {
      await handleSupabaseError(err, OperationType.CREATE, 'journal');
      addToast('Failed to save entry.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('journal')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      addToast('Entry removed from the archive.', 'info');
    } catch (err) {
      await handleSupabaseError(err, OperationType.DELETE, 'journal');
      addToast('Failed to delete entry.', 'error');
    }
  };

  const emotions = [
    { id: 'calm', label: 'Calm', color: 'text-emerald-400' },
    { id: 'anxious', label: 'Anxious', color: 'text-gold' },
    { id: 'excited', label: 'Excited', color: 'text-sky-400' },
    { id: 'greedy', label: 'Greedy', color: 'text-purple-400' },
    { id: 'fearful', label: 'Fearful', color: 'text-red-400' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Archive</h1>
          <p className="text-white/40">Reflect on your prophecies, analyze your emotions, and master the self.</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={handleExportRecord}
                className="px-6 py-2 border border-gold/40 text-gold hover:bg-gold hover:text-black rounded-lg font-bold transition-all flex items-center gap-2"
            >
                <Download size={18} /> Immortal Record
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="gold-button px-6 py-2 flex items-center gap-2"
            >
              <Plus size={18} /> New Entry
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-6 border-white/5 hover:border-gold/20 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${entry.pnl >= 0 ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                      {entry.type === 'buy' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">{entry.pair}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                        <span>{entry.type}</span>
                        <span>•</span>
                        <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={emotions.find(e => e.id === entry.emotion)?.color}>
                          {entry.emotion}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-display font-bold ${entry.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.pnl >= 0 ? '+' : ''}{entry.pnl}
                      </p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">P/L Credits</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <p className="text-sm text-white/60 italic">"{entry.notes}"</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {entry.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold text-[8px] font-bold uppercase tracking-widest">
                      <Tag size={8} className="inline mr-1" /> {tag}
                    </span>
                  ))}
                  {entry.mistakes.map(mistake => (
                    <span key={mistake} className="px-2 py-0.5 rounded bg-red-400/10 border border-red-400/20 text-red-400 text-[8px] font-bold uppercase tracking-widest">
                      {mistake}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {entries.length === 0 && !isAdding && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                <Book size={40} />
              </div>
              <p className="text-white/40 italic">The archive is empty. Start journaling your cosmic journey.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-6">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Brain className="text-gold" size={20} /> AI Emotional Insight
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <p className="text-xs text-white/60 leading-relaxed">
                  The Oracle observes that <span className="text-gold font-bold">60%</span> of your losses occur when you feel <span className="text-red-400 font-bold uppercase tracking-widest">Anxious</span>.
                </p>
                <p className="text-xs text-white/40 italic">
                  "Master the breath, and the charts will follow."
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/20">Dominant Emotion</span>
                <span className="text-emerald-400">Calm (45%)</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Sparkles size={20} /> Common Mistakes
            </h3>
            <div className="space-y-3">
              {[
                { label: 'FOMO Entry', count: 12, color: 'bg-red-400' },
                { label: 'Oversized Risk', count: 8, color: 'bg-gold' },
                { label: 'Early Exit', count: 15, color: 'bg-sky-400' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-white/60">{item.count}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${(item.count / 20) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card p-8 border-gold/20 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-2xl font-display font-bold gold-gradient mb-6 flex items-center gap-3">
                <Save className="text-gold" size={24} /> Etch New Entry
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Asset Pair</label>
                    <input 
                      type="text"
                      value={newEntry.pair}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, pair: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Type</label>
                    <div className="flex gap-2">
                      {['buy', 'sell'].map(t => (
                        <button
                          key={t}
                          onClick={() => setNewEntry(prev => ({ ...prev, type: t as any }))}
                          className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${
                            newEntry.type === t ? 'bg-gold/10 border-gold/50 text-gold' : 'bg-white/5 border-white/10 text-white/40'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">P/L Credits</label>
                    <input 
                      type="number"
                      value={newEntry.pnl}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, pnl: parseFloat(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Dominant Emotion</label>
                    <select 
                      value={newEntry.emotion}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, emotion: e.target.value as any }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                    >
                      {emotions.map(e => <option key={e.id} value={e.id} className="bg-cosmic-black">{e.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Notes & Reflection</label>
                    <textarea 
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEntry}
                  className="flex-1 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-gold/20 transition-all"
                >
                  Archive Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
