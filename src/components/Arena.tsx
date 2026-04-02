import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, TrendingUp, Star, Shield, Zap, ExternalLink, Filter, Search, Sparkles, Target, Activity, ArrowUpRight } from 'lucide-react';

interface EliteOracle {
  id: string;
  name: string;
  win_rate: number;
  total_pnl: number;
  followers: number;
  risk_score: number;
  strategy: string;
  avatar: string;
  verified: boolean;
}

export default function Arena({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isTournamentActive, setIsTournamentActive] = useState(false);
  const [eliteOracles, setEliteOracles] = useState<EliteOracle[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch elite oracles from users collection
    const q = query(collection(db, 'users'), where('is_elite', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const oracles = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().username || 'Anonymous Oracle',
        win_rate: doc.data().win_rate || 0,
        total_pnl: doc.data().total_pnl || 0,
        followers: doc.data().followers_count || 0,
        risk_score: doc.data().risk_score || 1,
        strategy: doc.data().strategy_description || 'Master Strategy',
        avatar: doc.data().avatar_url || `https://picsum.photos/seed/${doc.id}/100/100`,
        verified: doc.data().tier === 'zion' || doc.data().tier === 'creator'
      }));
      setEliteOracles(oracles);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setLoading(false);
    });

    // Fetch following relationships
    const followQ = query(collection(db, 'followers'), where('follower_id', '==', userProfile.uid));
    const unsubscribeFollow = onSnapshot(followQ, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => doc.data().oracle_id));
      setFollowingIds(ids);
    });

    return () => {
      unsubscribe();
      unsubscribeFollow();
    };
  }, [userProfile.uid]);

  const handleFollow = async (oracle: EliteOracle) => {
    try {
      if (followingIds.has(oracle.id)) {
        // Unfollow
        const q = query(
          collection(db, 'followers'), 
          where('follower_id', '==', userProfile.uid),
          where('oracle_id', '==', oracle.id)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(async (d) => {
          await deleteDoc(doc(db, 'followers', d.id));
        });
        
        // Update oracle's follower count
        const oracleRef = doc(db, 'users', oracle.id);
        await updateDoc(oracleRef, {
          followers_count: Math.max(0, (oracle.followers || 0) - 1)
        });

        addToast(`You are no longer following ${oracle.name}.`, 'info');
      } else {
        // Follow
        await addDoc(collection(db, 'followers'), {
          follower_id: userProfile.uid,
          oracle_id: oracle.id,
          mirror_active: true,
          created_at: new Date().toISOString()
        });

        // Update oracle's follower count
        const oracleRef = doc(db, 'users', oracle.id);
        await updateDoc(oracleRef, {
          followers_count: (oracle.followers || 0) + 1
        });

        addToast(`You are now following ${oracle.name}. Mirror protocol active.`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('The cosmic connection failed.', 'error');
    }
  };

  const tournaments = [
    { id: 't1', name: 'The Mansa Cup', prize: '5,000 USDT', participants: 124, ends_in: '04:23:12', status: 'Active' },
    { id: 't2', name: 'Zulu Warrior Trials', prize: '2,500 USDT', participants: 86, ends_in: '12:45:00', status: 'Starting Soon' },
  ];

  const filteredOracles = eliteOracles.filter(oracle => 
    oracle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Arena</h1>
          <p className="text-white/40">Follow Elite Oracles and mirror their master strategies in real-time.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Oracles..."
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-gold/50 transition-all outline-none"
            />
          </div>
          <button 
            onClick={() => setIsTournamentActive(!isTournamentActive)}
            className={`px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${
              isTournamentActive ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'glass-card border-gold/20 text-gold hover:bg-gold hover:text-black'
            }`}
          >
            <Trophy size={18} /> {isTournamentActive ? 'Tournament Active' : 'Join Tournament'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isTournamentActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {tournaments.map(t => (
                <div key={t.id} className="glass-card p-6 border-gold/20 bg-gold/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-all">
                    <Trophy size={80} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                        t.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-gold/10 text-gold border border-gold/20'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">{t.ends_in}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">{t.name}</h3>
                      <p className="text-sm text-gold font-bold">Prize Pool: {t.prize}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase">
                        <Users size={14} /> {t.participants} Warriors
                      </div>
                      <button className="px-4 py-2 rounded-lg bg-gold text-black text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all">
                        Enter Battle
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Zap className="text-gold animate-pulse" size={48} />
            </div>
          ) : filteredOracles.length === 0 ? (
            <div className="glass-card p-20 text-center space-y-4">
              <Users className="mx-auto text-white/10" size={64} />
              <p className="text-white/40">No elite oracles found in this dimension.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredOracles.map((oracle) => (
                <motion.div
                  key={oracle.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-6 border-white/5 hover:border-gold/20 transition-all space-y-6 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -z-10 group-hover:bg-gold/10 transition-all" />
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={oracle.avatar} alt={oracle.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/5 group-hover:border-gold/50 transition-all" referrerPolicy="no-referrer" />
                        {oracle.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-gold text-black rounded-full p-0.5 border-2 border-cosmic-black">
                            <Star size={10} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold">{oracle.name}</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{oracle.strategy}</p>
                      </div>
                    </div>
                    <button className="p-2 text-white/20 hover:text-gold transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Win Rate</p>
                      <p className="text-lg font-display font-bold text-emerald-400">{oracle.win_rate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Total P/L</p>
                      <p className="text-lg font-display font-bold text-gold">+{oracle.total_pnl}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Risk</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i <= oracle.risk_score ? 'bg-gold' : 'bg-white/5'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white/40">
                      <Users size={14} />
                      <span className="text-xs font-bold">{oracle.followers} Followers</span>
                    </div>
                    <button 
                      onClick={() => handleFollow(oracle)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        followingIds.has(oracle.id)
                          ? 'bg-gold text-black border-gold'
                          : 'bg-gold/10 border-gold/20 text-gold hover:bg-gold hover:text-black'
                      }`}
                    >
                      {followingIds.has(oracle.id) ? 'Following' : 'Mirror Strategy'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Shield className="text-gold" size={20} /> Mirror Protocol
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Mirroring an Oracle automatically executes their trades on your account. You can set individual risk limits and stop-losses for each mirrored strategy.
            </p>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Mirror Fee</span>
                <span className="text-gold">5% P/L</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Execution Lag</span>
                <span className="text-emerald-400">{'<'} 50ms</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Activity size={20} /> Arena Leaderboard
            </h3>
            <div className="space-y-4">
              {eliteOracles.slice(0, 3).map((oracle, i) => (
                <div key={oracle.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-display font-bold text-white/20">#0{i + 1}</span>
                    <img src={oracle.avatar} alt={oracle.name} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <span className="text-sm font-bold">{oracle.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gold">+{oracle.total_pnl}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all">
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
