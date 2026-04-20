import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, User, Search, Filter, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/dbService';
import { orderBy, limit } from 'firebase/firestore';
import { LeaderboardEntry, Tier } from '../types';

interface LeaderboardProps {
  setTargetUserId: (uid: string) => void;
  setActivePage: (page: string) => void;
}

export default function Leaderboard({ setTargetUserId, setActivePage }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const pnlField = timeframe === 'weekly' ? 'weekly_pnl' : timeframe === 'monthly' ? 'monthly_pnl' : 'total_pnl';
    
    const fetchLeaderboard = async () => {
      try {
        const data = await dbService.list('users', [
          orderBy(pnlField, 'desc'),
          limit(50)
        ]);
        
        const newEntries = (data || []).map((doc: any) => ({
          uid: doc.uid,
          username: doc.username || (doc.email as string)?.split('@')[0] || 'Anonymous Trader',
          avatar_url: doc.avatar_url,
          total_pnl: doc[pnlField] || 0,
          win_rate: doc.win_rate || 0,
          level: doc.level || 1,
          tier: doc.tier || 'free',
          win_streak: doc.win_streak || 0,
          best_asset: doc.best_asset || 'N/A'
        } as LeaderboardEntry));
        setEntries(newEntries);
      } catch (error) {
        console.error("Fetch leaderboard failed", error);
      }
      setLoading(false);
    };

    fetchLeaderboard();

    // Subscribe to changes
    const unsubscribe = dbService.subscribeCollection('users', [
      orderBy(pnlField, 'desc'),
      limit(50)
    ], (data) => {
      const newEntries = (data || []).map((doc: any) => ({
        uid: doc.uid,
        username: doc.username || (doc.email as string)?.split('@')[0] || 'Anonymous Trader',
        avatar_url: doc.avatar_url,
        total_pnl: doc[pnlField] || 0,
        win_rate: doc.win_rate || 0,
        level: doc.level || 1,
        tier: doc.tier || 'free',
        win_streak: doc.win_streak || 0,
        best_asset: doc.best_asset || 'N/A'
      } as LeaderboardEntry));
      setEntries(newEntries);
    });

    return () => unsubscribe();
  }, [timeframe]);

  const filteredEntries = entries.filter(entry => 
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: Tier) => {
    switch (tier) {
      case 'mythic': return 'text-purple-400';
      case 'legendary': return 'text-gold';
      case 'zion': return 'text-blue-400';
      case 'oracle': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-gold animate-pulse" />;
      case 1: return <Medal className="w-6 h-6 text-slate-300" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-white/40">{index + 1}</span>;
    }
  };

  const handleUserClick = (uid: string) => {
    setTargetUserId(uid);
    setActivePage('profile');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-gold" />
            Hall of Legends
          </h1>
          <p className="text-white/60 mt-1">The most elite traders in the Zion network.</p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          {(['all', 'monthly', 'weekly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeframe === t 
                  ? 'bg-gold text-black shadow-lg shadow-gold/20' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search for a legend..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
        />
      </div>

      {/* Top 3 Podium */}
      {!loading && filteredEntries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleUserClick(filteredEntries[1].uid)}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-400/50" />
            <div className="w-20 h-20 rounded-full bg-slate-400/20 flex items-center justify-center mb-4 border-2 border-slate-400/50 relative">
              <User className="w-10 h-10 text-slate-400" />
              <div className="absolute -bottom-2 -right-2 bg-slate-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</div>
            </div>
            <h3 className="text-xl font-bold text-white">{filteredEntries[1].username}</h3>
            <p className={`text-sm font-medium ${getTierColor(filteredEntries[1].tier)} uppercase tracking-wider`}>
              {filteredEntries[1].tier}
            </p>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 font-mono text-lg">
              <TrendingUp className="w-4 h-4" />
              +${filteredEntries[1].total_pnl.toLocaleString()}
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => handleUserClick(filteredEntries[0].uid)}
            className="bg-gold/10 border border-gold/30 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden group shadow-2xl shadow-gold/5 cursor-pointer hover:border-gold/50 transition-all"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gold" />
            <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mb-4 border-4 border-gold relative">
              <User className="w-12 h-12 text-gold" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Crown className="w-10 h-10 text-gold drop-shadow-lg animate-bounce" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gold text-black w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">1</div>
            </div>
            <h3 className="text-2xl font-bold text-white">{filteredEntries[0].username}</h3>
            <p className={`text-sm font-medium ${getTierColor(filteredEntries[0].tier)} uppercase tracking-wider`}>
              {filteredEntries[0].tier}
            </p>
            <div className="mt-4 flex flex-col items-center">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-2xl font-bold">
                <TrendingUp className="w-6 h-6" />
                +${filteredEntries[0].total_pnl.toLocaleString()}
              </div>
              <div className="text-white/40 text-sm mt-1">Win Rate: {filteredEntries[0].win_rate}%</div>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleUserClick(filteredEntries[2].uid)}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-600/50" />
            <div className="w-20 h-20 rounded-full bg-amber-600/20 flex items-center justify-center mb-4 border-2 border-amber-600/50 relative">
              <User className="w-10 h-10 text-amber-600" />
              <div className="absolute -bottom-2 -right-2 bg-amber-600 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</div>
            </div>
            <h3 className="text-xl font-bold text-white">{filteredEntries[2].username}</h3>
            <p className={`text-sm font-medium ${getTierColor(filteredEntries[2].tier)} uppercase tracking-wider`}>
              {filteredEntries[2].tier}
            </p>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 font-mono text-lg">
              <TrendingUp className="w-4 h-4" />
              +${filteredEntries[2].total_pnl.toLocaleString()}
            </div>
          </motion.div>
        </div>
      )}

      {/* List */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Legend</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">Tier</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Win Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Streak</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Best Asset</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Total P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-4 bg-white/10 rounded" /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10" />
                          <div className="h-4 w-24 bg-white/10 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 bg-white/10 rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-8 bg-white/10 rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-white/10 rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-white/10 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  filteredEntries.map((entry, index) => (
                    <motion.tr
                      key={entry.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleUserClick(entry.uid)}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(index)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:border-gold/50 transition-colors">
                            {entry.avatar_url ? (
                              <img src={entry.avatar_url} alt={entry.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-white/40" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              {entry.username}
                              {entry.level >= 50 && <Zap className="w-3 h-3 text-gold fill-gold" />}
                            </div>
                            <div className="text-xs text-white/40">Level {entry.level}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold uppercase tracking-wider ${getTierColor(entry.tier)}`}>
                          {entry.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white/80">
                        {entry.win_rate}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-gold font-bold font-mono">
                          <Zap size={10} />
                          {entry.win_streak}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                          {entry.best_asset?.replace('frx', '').replace('R_', 'Vol ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`font-mono font-bold ${entry.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {entry.total_pnl >= 0 ? '+' : ''}${entry.total_pnl.toLocaleString()}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {!loading && filteredEntries.length === 0 && (
          <div className="py-20 text-center">
            <User className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No Legends Found</h3>
            <p className="text-white/40">Try searching for another name.</p>
          </div>
        )}
      </div>
    </div>
  );
}
