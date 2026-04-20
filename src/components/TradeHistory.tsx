import { useState, useMemo } from 'react';
import { Trade } from '../types';
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight, Calendar, Clock, Target, Activity, ShieldAlert, ShieldCheck, BookOpen, Smile, Frown, Meh, Zap, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

interface TradeHistoryProps {
  trades: Trade[];
  userId: string;
}

export default function TradeHistory({ trades, userId }: TradeHistoryProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'win' | 'loss'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [journalNote, setJournalNote] = useState('');
  const [journalEmotion, setJournalEmotion] = useState<Trade['emotion']>('neutral');

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesSearch = t.pair.toLowerCase().includes(search.toLowerCase()) || 
                            t.type.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'open' ? t.status === 'open' :
        filter === 'closed' ? t.status === 'closed' :
        filter === 'win' ? t.pnl > 0 :
        filter === 'loss' ? t.pnl < 0 : true;
      
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [trades, search, filter, sortConfig]);

  const saveJournal = async () => {
    if (!editingTrade) return;
    try {
      const { error } = await supabase
        .from('trades')
        .update({
          notes: journalNote,
          emotion: journalEmotion
        })
        .eq('id', editingTrade.id);
      
      if (error) throw error;
      setEditingTrade(null);
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, 'trades');
    }
  };

  const openJournal = (trade: Trade) => {
    setEditingTrade(trade);
    setJournalNote(trade.notes || '');
    setJournalEmotion(trade.emotion || 'neutral');
  };

  const EMOTIONS = [
    { id: 'confident', icon: Zap, color: 'text-emerald-400', label: 'Confident' },
    { id: 'neutral', icon: Meh, color: 'text-white/40', label: 'Neutral' },
    { id: 'anxious', icon: Activity, color: 'text-amber-400', label: 'Anxious' },
    { id: 'greedy', icon: AlertTriangle, color: 'text-gold', label: 'Greedy' },
    { id: 'fearful', icon: ShieldAlert, color: 'text-rose-400', label: 'Fearful' },
  ];

  const exportToCSV = () => {
    const headers = ['Date', 'Pair', 'Type', 'Entry', 'Exit', 'PnL', 'PnL %', 'MAE', 'MFE', 'Status', 'Reason'];
    const rows = filteredTrades.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.pair,
      t.type.toUpperCase(),
      t.entry_price,
      t.exit_price || '-',
      t.pnl.toFixed(2),
      t.pnl_percentage.toFixed(2) + '%',
      t.mae?.toFixed(2) || '-',
      t.mfe?.toFixed(2) || '-',
      t.status.toUpperCase(),
      t.close_reason || '-'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `oracle_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: keyof Trade) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'closed', 'win', 'loss'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                filter === f 
                  ? 'bg-gold text-black border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <input 
              type="text"
              placeholder="Search pairs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full cosmic-input pl-10 py-2 text-xs"
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-gold hover:border-gold/50 transition-all"
            title="Export to CSV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th onClick={() => handleSort('created_at')} className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-2">Date <Calendar size={10} /></div>
                </th>
                <th onClick={() => handleSort('pair')} className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Asset</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Entry/Exit</th>
                <th onClick={() => handleSort('pnl')} className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">PnL</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">MAE/MFE</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest">Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-white/20 italic text-sm">No rituals found in the ledger.</td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => (
                    <motion.tr 
                      key={trade.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-white/80">{new Date(trade.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-white/30 font-mono">{new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${trade.pnl >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                          <span className="font-bold text-sm tracking-tight">{trade.pair.replace('frx', '').replace('R_', 'Vol ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${
                          trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-white/60">In: {trade.entry_price.toFixed(4)}</div>
                        <div className="text-xs font-mono text-white/40">Out: {trade.exit_price?.toFixed(4) || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold font-mono ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-white/30 font-mono">{trade.pnl_percentage.toFixed(2)}%</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-400/50" style={{ width: `${Math.min(100, Math.abs(trade.mae || 0) * 10)}%` }}></div>
                            </div>
                            <span className="text-[9px] font-mono text-rose-400/60">{trade.mae?.toFixed(1) || '0.0'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400/50" style={{ width: `${Math.min(100, Math.abs(trade.mfe || 0) * 10)}%` }}></div>
                            </div>
                            <span className="text-[9px] font-mono text-emerald-400/60">{trade.mfe?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                            trade.status === 'open' ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-white/5 text-white/40'
                          }`}>
                            {trade.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => openJournal(trade)}
                          className={`p-2 rounded-lg transition-all ${
                            trade.notes ? 'bg-gold/10 text-gold' : 'bg-white/5 text-white/20 hover:text-white'
                          }`}
                        >
                          <BookOpen size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal Modal */}
      <AnimatePresence>
        {editingTrade && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-8 border-gold/20 relative"
            >
              <button 
                onClick={() => setEditingTrade(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <BookOpen className="text-gold" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold gold-gradient">Ritual Journal</h3>
                  <p className="text-xs text-white/40 uppercase tracking-widest">{editingTrade.pair} • {editingTrade.type}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">The Oracle's Emotion</label>
                  <div className="grid grid-cols-5 gap-2">
                    {EMOTIONS.map((emo) => (
                      <button
                        key={emo.id}
                        onClick={() => setJournalEmotion(emo.id as any)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          journalEmotion === emo.id 
                            ? 'bg-gold/10 border-gold/50 text-gold' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        <emo.icon size={20} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">{emo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Ritual Notes & Insights</label>
                  <textarea
                    value={journalNote}
                    onChange={(e) => setJournalNote(e.target.value)}
                    placeholder="Describe the celestial alignment during this ritual..."
                    className="w-full cosmic-input min-h-[150px] p-4 text-sm resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setEditingTrade(null)}
                    className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/10"
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveJournal}
                    className="flex-1 px-6 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all"
                  >
                    Seal Journal
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
