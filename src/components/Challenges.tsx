import { useState, useEffect } from 'react';
import { UserProfile, Challenge } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { motion } from 'motion/react';
import { Trophy, Zap, Clock, Users, Shield, Award, ArrowRight, CheckCircle2, Lock, Flame } from 'lucide-react';

interface UserChallengeStatus {
  challenge_id: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
}

interface ChallengesProps {
  userProfile: UserProfile;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const Challenges: React.FC<ChallengesProps> = ({ userProfile, addToast }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Record<string, UserChallengeStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch global challenges
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*');
      
      if (error) {
        await handleSupabaseError(error, OperationType.LIST, 'challenges');
      } else {
        setChallenges(data as Challenge[]);
      }
      setLoading(false);
    };

    fetchChallenges();

    // Fetch user's active challenges
    const fetchUserChallenges = async () => {
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('uid', userProfile.uid);
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'user_challenges');
      } else {
        const statuses: Record<string, UserChallengeStatus> = {};
        (data || []).forEach(item => {
          statuses[item.challenge_id] = item as UserChallengeStatus;
        });
        setUserChallenges(statuses);
      }
    };

    fetchUserChallenges();

    // Realtime subscriptions
    const challengesChannel = supabase
      .channel('public:challenges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, fetchChallenges)
      .subscribe();

    const userChallengesChannel = supabase
      .channel(`public:user_challenges:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_challenges', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchUserChallenges)
      .subscribe();

    return () => {
      supabase.removeChannel(challengesChannel);
      supabase.removeChannel(userChallengesChannel);
    };
  }, [userProfile.uid]);

  const handleJoinChallenge = async (challenge: Challenge) => {
    // Check tier requirements if they exist in the challenge data
    const requiredTier = (challenge as any).required_tier || 'free';
    if (userProfile.tier === 'free' && requiredTier !== 'free') {
      addToast(`This challenge requires ${requiredTier.toUpperCase()} tier.`, 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_challenges')
        .insert([{
          uid: userProfile.uid,
          challenge_id: challenge.id,
          status: 'active',
          progress: 0,
          joined_at: new Date().toISOString()
        }]);
      
      if (error) throw error;

      addToast(`Challenge "${challenge.title}" accepted. Good luck, Warrior.`, 'success');
    } catch (err) {
      await handleSupabaseError(err, OperationType.CREATE, 'user_challenges');
      addToast('Failed to join challenge.', 'error');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Intermediate': return 'text-gold bg-gold/10 border-gold/20';
      case 'Elite': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Warrior Trials</h1>
        <p className="text-white/40">Complete challenges to earn exclusive badges, Zion points, and cosmic rewards.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gold/5 border-gold/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Current Streak</p>
            <p className="text-xl font-display font-bold">12 Days</p>
          </div>
        </div>
        <div className="glass-card p-6 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Badges</p>
            <p className="text-xl font-display font-bold">8 Earned</p>
          </div>
        </div>
        <div className="glass-card p-6 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Zion Points</p>
            <p className="text-xl font-display font-bold">2,450 ZP</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-20 flex justify-center">
            <Zap className="text-gold animate-pulse" size={48} />
          </div>
        ) : challenges.length === 0 ? (
          <div className="col-span-2 glass-card p-20 text-center space-y-4">
            <Trophy className="mx-auto text-white/10" size={64} />
            <p className="text-white/40">No trials available in the current cycle.</p>
          </div>
        ) : challenges.map((challenge) => {
          const status = userChallenges[challenge.id];
          const requiredTier = (challenge as any).required_tier || 'free';
          const isLocked = userProfile.tier === 'free' && requiredTier !== 'free';

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-6 border-white/5 hover:border-gold/20 transition-all relative overflow-hidden group ${isLocked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${getDifficultyColor((challenge as any).difficulty || 'Beginner')}`}>
                      {(challenge as any).difficulty || 'Beginner'}
                    </span>
                    <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">{(challenge as any).type || 'Profit'}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold">{challenge.title}</h3>
                  <p className="text-sm text-white/40">{challenge.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Reward</p>
                  <p className="text-lg font-display font-bold text-gold">{challenge.reward}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2 text-white/40">
                  <Users size={14} />
                  <span className="text-[10px] font-bold">{(challenge as any).participants || 0} Joined</span>
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold">{(challenge as any).time_left || '24h'}</span>
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <Shield size={14} />
                  <span className="text-[10px] font-bold">Verified</span>
                </div>
              </div>

              {status ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">Progress</span>
                    <span className="text-gold">{status.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                      className="h-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest pt-2">
                    <CheckCircle2 size={14} /> Challenge Active
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleJoinChallenge(challenge)}
                  disabled={isLocked}
                  className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isLocked 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'bg-gold/10 border border-gold/20 text-gold hover:bg-gold hover:text-black'
                  }`}
                >
                  {isLocked ? (
                    <><Lock size={14} /> Upgrade to Unlock</>
                  ) : (
                    <><Zap size={14} /> Accept Trial</>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="glass-card p-8 border-gold/20 bg-gold/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy size={120} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <h2 className="text-2xl font-display font-bold">The Grand Oracle Tournament</h2>
          <p className="text-white/60">
            The ultimate test of skill. Compete against the top 1% of traders for a share of the 50,000 USDT prize pool and the title of Grand Oracle.
          </p>
          <button className="px-8 py-3 bg-gold text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center gap-2">
            Register Now <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
