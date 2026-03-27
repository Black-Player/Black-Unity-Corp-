import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  email: string;
  total_pnl: number;
  win_rate: number;
  tier: string;
}

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('total_pnl', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LeaderboardUser));
      setTopUsers(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">The High Council</h1>
        <p className="text-white/40">The most elite Oracles in the Blāck-Unity network.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top 3 Podium */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {topUsers.slice(0, 3).map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-6 border-gold/20 relative overflow-hidden ${
                i === 0 ? 'bg-gold/10 scale-105 z-10' : 'bg-white/5'
              }`}
            >
              <div className="absolute top-4 right-4">
                {i === 0 && <Crown className="text-gold" size={32} />}
                {i === 1 && <Medal className="text-slate-300" size={28} />}
                {i === 2 && <Medal className="text-amber-600" size={24} />}
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center border-2 border-gold/20">
                  <User size={40} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{user.email.split('@')[0]}</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{user.tier} Oracle</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Total P/L</p>
                    <p className="text-xl font-bold text-emerald-400">+{user.total_pnl?.toFixed(2) || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Win Rate</p>
                    <p className="text-xl font-bold text-gold">{user.win_rate?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Remaining Top 10 */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Trophy className="text-gold" size={20} /> Council Members
          </h2>
          
          {/* Desktop Table View */}
          <div className="hidden md:block glass-card overflow-hidden border-white/5">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Oracle</th>
                  <th className="px-6 py-4">Win Rate</th>
                  <th className="px-6 py-4 text-right">Total P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topUsers.slice(3).map((user, i) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-all">
                    <td className="px-6 py-4 font-mono text-white/40">#{i + 4}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                          <User size={16} className="text-white/40" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.email.split('@')[0]}</p>
                          <p className="text-[10px] text-white/20 uppercase tracking-widest">{user.tier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gold">{user.win_rate?.toFixed(1) || 0}%</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">+{user.total_pnl?.toFixed(2) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {topUsers.slice(3).map((user, i) => (
              <div key={user.id} className="glass-card p-4 border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white/20 text-xs">#{i + 4}</span>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <User size={20} className="text-white/40" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{user.email.split('@')[0]}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">{user.tier}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">+{user.total_pnl?.toFixed(2) || 0}</p>
                  <p className="text-[10px] text-gold font-bold">{user.win_rate?.toFixed(1) || 0}% WR</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
