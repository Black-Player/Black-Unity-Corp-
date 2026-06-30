import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { UserProfile, Signal } from '../types';
import { exportToGoogleSheets, exportToGoogleDrive } from '../services/workspaceService';
import { History as HistoryIcon, Search, Filter, CheckCircle2, XCircle, Clock, BarChart3, Bot, Zap, XOctagon, Download, FileSpreadsheet, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendSignalToTelegram } from '../services/communicationService';

interface HistoryProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function History({ userProfile, addToast }: HistoryProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<'all' | 'tp_hit' | 'sl_hit' | 'active'>('all');
  const [search, setSearch] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleCloseAllActive = async () => {
    setIsClosing(true);
    try {
      const activeSigs = signals.filter(s => s.status === 'active');
      for (const sig of activeSigs) {
        await dbService.update('signals', sig.id, { status: 'rejected' });
      }
      addToast(`Cleared ${activeSigs.length} stuck active signals.`, 'success');
      // Trigger update manually or wait for subscription
      setSignals(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'rejected' } : s));
    } catch (e) {
      console.error(e);
      addToast('Failed to close active signals', 'error');
    } finally {
      setIsClosing(false);
    }
  };

  const handleExportSheets = async () => {
    if (!window.confirm("Export your trading history to a new Google Sheet?")) return;
    setIsExporting(true);
    try {
      const url = await exportToGoogleSheets(signals);
      addToast(`Exported to Google Sheets successfully!`, 'success');
      window.open(url, '_blank');
    } catch (e: any) {
      console.error(e);
      addToast(`Failed to export to Sheets: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDrive = async () => {
    if (!window.confirm("Backup your trading history as a CSV file to Google Drive?")) return;
    setIsExporting(true);
    try {
      const fileId = await exportToGoogleDrive(signals);
      addToast(`Exported to Google Drive successfully! File ID: ${fileId}`, 'success');
    } catch (e: any) {
      console.error(e);
      addToast(`Failed to export to Drive: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

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
          {stats.active > 0 && (
            <button
              onClick={handleCloseAllActive}
              disabled={isClosing}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 active:bg-red-500/30 flex items-center gap-2 ml-auto"
            >
              <XOctagon size={14} />
              {isClosing ? 'Closing...' : 'Close All Active'}
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleExportDrive}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 active:bg-blue-500/30 flex items-center gap-2"
              title="Export to Google Drive"
            >
              <Download size={14} />
              Drive
            </button>
            <button
              onClick={handleExportSheets}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 active:bg-emerald-500/30 flex items-center gap-2"
              title="Export to Google Sheets"
            >
              <FileSpreadsheet size={14} />
              Sheets
            </button>
          </div>
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
                <th className="px-6 py-4 text-[10px] text-white/40 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredSignals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-white/20 italic">No signals found matching your criteria.</td>
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
                          <div className="text-gold">E: {Number(signal.entry).toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                          <div className="text-red-400">SL: {Number(signal.stop_loss).toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                          <div className="text-emerald-400">TP1: {Number(signal.tp1).toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                          <div className="text-emerald-400">TP4: {Number(signal.tp4).toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
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
                          signal.status === 'active' ? 'bg-blue-400/10 text-blue-400' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {signal.status.includes('tp') ? <CheckCircle2 size={10} /> :
                           signal.status === 'sl_hit' ? <XCircle size={10} /> :
                           signal.status === 'active' ? <Zap size={10} className="animate-pulse" /> :
                           <Clock size={10} />}
                          {signal.status === 'active' ? '🟢 LIVE' : signal.status === 'rejected' ? '⚪ REJECTED' : signal.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-white/40">{new Date(signal.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-white/20">{new Date(signal.created_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={async () => {
                            if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                              addToast("Please configure your Telegram credentials in Settings first.", "error");
                              return;
                            }
                            addToast(`Broadcasting signal for ${signal.pair} to Telegram...`, "info");
                            const msgId = await sendSignalToTelegram(signal, userProfile.integrations, true);
                            if (msgId) {
                              try {
                                await dbService.update('signals', signal.id, { telegram_message_id: msgId });
                                addToast(`🚀 Signal for ${signal.pair} successfully broadcast to Telegram!`, "success");
                              } catch (err) {
                                console.error("Telegram ID update failed", err);
                                addToast(`🚀 Signal successfully broadcast to Telegram!`, "success");
                              }
                            } else {
                              addToast("Failed to send signal to Telegram. Verify your credentials in Settings.", "error");
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500 hover:text-black hover:border-emerald-500/40 transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Broadcast Signal to Telegram"
                        >
                          <Send size={10} />
                          <span>Broadcast</span>
                        </button>
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
                      signal.status === 'active' ? 'bg-blue-400/10 text-blue-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {signal.status.includes('tp') ? <CheckCircle2 size={10} /> :
                       signal.status === 'sl_hit' ? <XCircle size={10} /> :
                       signal.status === 'active' ? <Zap size={10} className="animate-pulse" /> :
                       <Clock size={10} />}
                      {signal.status === 'active' ? '🟢 LIVE' : signal.status === 'rejected' ? '⚪ REJECTED' : signal.status.replace('_', ' ')}
                    </span>
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest">Entry & SL</p>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-gold">{Number(signal.entry).toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                          <span className="text-white/20">/</span>
                          <span className="text-red-400">{Number(signal.stop_loss).toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest">Targets</p>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-emerald-400">{Number(signal.tp1).toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                          <span className="text-white/20">-</span>
                          <span className="text-emerald-400">{Number(signal.tp4).toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
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

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                          addToast("Please configure your Telegram credentials in Settings first.", "error");
                          return;
                        }
                        addToast(`Broadcasting signal for ${signal.pair} to Telegram...`, "info");
                        const msgId = await sendSignalToTelegram(signal, userProfile.integrations, true);
                        if (msgId) {
                          try {
                            await dbService.update('signals', signal.id, { telegram_message_id: msgId });
                            addToast(`🚀 Signal for ${signal.pair} successfully broadcast to Telegram!`, "success");
                          } catch (err) {
                            console.error("Telegram ID update failed", err);
                            addToast(`🚀 Signal successfully broadcast to Telegram!`, "success");
                          }
                        } else {
                          addToast("Failed to send signal to Telegram. Verify your credentials in Settings.", "error");
                        }
                      }}
                      className="w-full py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-600 hover:text-white hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Broadcast Signal to Telegram"
                    >
                      <Send size={12} />
                      <span>Broadcast Signal</span>
                    </button>
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
