import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Trash2, TrendingUp, TrendingDown, Clock, Tag, MessageSquare, Brain, Sparkles, Filter, Save, Download, Bot, Sprout } from 'lucide-react';
import { analyzeTradeReview } from '../services/aiService';

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
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
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

  const handleExportStatement = async (period: 'daily' | 'weekly' | 'monthly' | 'all') => {
      try {
          addToast(`Generating ${period} statement...`, "info");
          
          let startDate = new Date(0); // Epoch for 'all'
          const now = new Date();
          if (period === 'daily') {
             startDate = new Date(now.setHours(0,0,0,0));
          } else if (period === 'weekly') {
             startDate = new Date(now.setDate(now.getDate() - 7));
          } else if (period === 'monthly') {
             startDate = new Date(now.setMonth(now.getMonth() - 1));
          }

          const constraints = [
              where('uid', '==', userProfile.uid),
              where('status', '==', 'closed')
          ];
          
          const rawTrades = await dbService.list('trades', constraints);
          const trades = rawTrades.filter((t: any) => new Date(t.closed_at) >= startDate);
          
          const { data: rawJournals } = await supabase.from('journal').select('*').eq('uid', userProfile.uid);
          const journals = (rawJournals || []).filter((j: any) => new Date(j.created_at) >= startDate);
          
          if (trades.length === 0 && journals.length === 0) {
              addToast(`No activity found for the ${period} period.`, "info");
              return;
          }

          let csvContent = "data:text/csv;charset=utf-8,";
          
          if (trades.length > 0) {
              csvContent += "--- TRADE HISTORY ---\n";
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
          }

          if (journals.length > 0) {
              csvContent += (trades.length > 0 ? "\n\n" : "");
              csvContent += "--- JOURNAL ENTRIES ---\n";
              csvContent += "Date,Pair,Type,P/L,Emotion,Notes,Mistakes\n";
              journals.forEach((j: any) => {
                  const notesSafe = j.notes ? j.notes.replace(/"/g, '""') : "";
                  const mistakesSafe = j.mistakes ? j.mistakes.join('; ') : "";
                  const row = [
                      j.created_at,
                      j.pair,
                      j.type,
                      j.pnl,
                      j.emotion,
                      `"${notesSafe}"`,
                      `"${mistakesSafe}"`
                  ].join(",");
                  csvContent += row + "\r\n";
              });
          }

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `account_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          addToast(`${period.charAt(0).toUpperCase() + period.slice(1)} Statement Downloaded.`, "success");
      } catch (err) {
          addToast("Failed to retrieve statement.", "error");
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

  const handleAnalyzeTrade = async (entry: JournalEntry) => {
    setAnalyzingId(entry.id);
    addToast("Submitting trade to Zion AI for analysis...", "info");
    
    try {
      const insight = await analyzeTradeReview(
        {
          pair: entry.pair,
          type: entry.type,
          pnl: entry.pnl,
          entry_price: entry.entry_price,
          exit_price: entry.exit_price,
          tags: entry.tags,
          mistakes: entry.mistakes
        },
        entry.notes
      );

      // Append Zion's analysis to the entry's notes
      const zionFeedback = `\n\n[Zion AI Reflection]\nEmotion Score: ${insight.emotional_state}\nStrategy Adherence: ${insight.strategy_adherence}\nImprovement Advice: ${insight.potential_improvements}\nOverall Quality: ${insight.overall_rating}/10\n\n[Cosmic Summary]\n${insight.trade_summary}`;
      
      const { error } = await supabase
        .from('journal')
        .update({ 
          notes: entry.notes + zionFeedback,
          mistakes: [...entry.mistakes, `Zion Rating: ${insight.overall_rating}/10`].filter((v, i, a) => a.indexOf(v) === i)
        })
        .eq('id', entry.id);

      if (error) throw error;
      
      addToast("Zion Analysis complete and attached to journal entry.", "success");
    } catch (e) {
      addToast("Zion could not analyze this trade at the moment.", "error");
    } finally {
      setAnalyzingId(null);
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
            <div className="relative group">
              <button 
                  className="px-6 py-2 border border-gold/40 text-gold hover:bg-gold hover:text-black rounded-lg font-bold transition-all flex items-center gap-2"
              >
                  <Download size={18} /> Export Activity
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                 <button onClick={() => handleExportStatement('daily')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white">Daily Statement</button>
                 <button onClick={() => handleExportStatement('weekly')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white">Weekly Statement</button>
                 <button onClick={() => handleExportStatement('monthly')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/5 text-white/60 hover:text-white">Monthly Statement</button>
                 <button onClick={() => handleExportStatement('all')} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/5 text-gold border-t border-white/5">Complete Archive</button>
              </div>
            </div>
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

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 relative">
                  {(() => {
                    const notes = entry.notes || '';
                    if (!notes.includes('[Zion AI Reflection]')) {
                      return <p className="text-sm text-white/60 italic whitespace-pre-wrap">"{notes}"</p>;
                    }

                    const parts = notes.split('[Zion AI Reflection]');
                    const userNotes = parts[0].trim();
                    const aiNotes = parts[1] || '';

                    let summary = '';
                    let restAi = aiNotes;
                    if (aiNotes.includes('[Cosmic Summary]')) {
                      const summaryParts = aiNotes.split('[Cosmic Summary]');
                      restAi = summaryParts[0].trim();
                      summary = summaryParts[1] ? summaryParts[1].trim() : '';
                    }

                    return (
                      <div className="space-y-4">
                        <p className="text-sm text-white/60 italic whitespace-pre-wrap">"{userNotes}"</p>
                        
                        <div className="p-4 rounded-xl bg-black/40 border border-gold/10 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                            <Bot size={14} /> Zion AI Reflection
                          </h4>
                          <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{restAi}</p>
                        </div>

                        {summary && (
                          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                              <Sparkles size={14} /> Detailed Trade Narrative
                            </h4>
                            <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed text-justify">{summary}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  {!(entry.notes || '').includes('[Zion AI Reflection]') && (
                    <button
                      onClick={() => handleAnalyzeTrade(entry)}
                      disabled={analyzingId === entry.id}
                      className="absolute bottom-2 right-2 text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border border-gold/20"
                    >
                      {analyzingId === entry.id ? 'Analyzing...' : <><Bot size={12} /> Post-Ritual Reflection</>}
                    </button>
                  )}
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

          {/* PHASE 25: COSMIC MILESTONES (ACHIEVEMENTS) */}
          <div className="glass-card p-6 border-purple-500/20 bg-purple-500/5 space-y-6">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-purple-400">
              <Sprout size={20} /> Cosmic Milestones
            </h3>
            <p className="text-xs text-white/40 italic">Unlock the secrets of the universe through disciplined trading.</p>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-white/5 border border-purple-500/30 rounded-xl text-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-2 text-lg">🛡️</div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Iron Discipline</p>
                  <p className="text-[8px] text-white/40 mt-1">10 trades w/ 1% risk</p>
               </div>
               <div className="p-3 bg-white/5 border border-emerald-500/30 rounded-xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rotate-45 blur-xl"></div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 text-lg">👁️</div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Zen Master</p>
                  <p className="text-[8px] text-white/40 mt-1">5 'Calm' entries</p>
               </div>
               <div className="p-3 bg-white/5 border border-white/5 opacity-50 grayscale rounded-xl text-center cursor-not-allowed">
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center mx-auto mb-2 text-lg">🔒</div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">The Oracle</p>
                  <p className="text-[8px] text-white/40 mt-1">80% WR over 50 trades</p>
               </div>
               <div className="p-3 bg-white/5 border border-white/5 opacity-50 grayscale rounded-xl text-center cursor-not-allowed">
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center mx-auto mb-2 text-lg">🔒</div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Abyssal Voyager</p>
                  <p className="text-[8px] text-white/40 mt-1">Survive 15% drawdown</p>
               </div>
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
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Notes & Outcome (BE, TP, SL)</label>
                    <textarea 
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      placeholder="E.g. Price swept liquidity then perfectly hit TP1 before I trailed to Breakeven..."
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
