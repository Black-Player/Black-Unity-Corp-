import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Gift, Share2, Copy, Check, Sparkles, TrendingUp, UserPlus, Zap } from 'lucide-react';

interface ReferralsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Referrals({ userProfile, addToast }: ReferralsProps) {
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferredUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('referred_by', userProfile.referral_code || userProfile.uid);
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'users');
      } else {
        setReferredUsers(data || []);
      }
    };

    fetchReferredUsers();

    const channel = supabase
      .channel(`public:users:referred_by=${userProfile.referral_code || userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users', 
        filter: `referred_by=eq.${userProfile.referral_code || userProfile.uid}` 
      }, fetchReferredUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid, userProfile.referral_code]);

  const copyToClipboard = () => {
    const code = userProfile.referral_code || userProfile.uid;
    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast('Referral code copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const rewards = [
    { threshold: 1, reward: '10 Bonus Signals', icon: Zap },
    { threshold: 5, reward: '1 Week Shaka Tier', icon: Gift },
    { threshold: 10, reward: 'Lifetime Zulu Tier', icon: Sparkles },
    { threshold: 25, reward: 'Oracle Forge Access', icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">The Ubuntu Network</h1>
        <p className="text-white/40">Grow the network, empower fellow Oracles, and earn cosmic rewards.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 bg-gold/5 border-gold/20 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center text-gold border-2 border-gold/20">
                <Share2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold">Your Referral Code</h3>
                <p className="text-sm text-white/40">Share this code with your network to start earning.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 py-4 font-mono text-xl tracking-widest text-gold flex items-center justify-between">
                {userProfile.referral_code || userProfile.uid}
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-gold"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <button className="gold-button px-8 py-4 flex items-center gap-2">
                <Share2 size={20} /> Share Link
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Gift className="text-gold" size={20} /> Reward Milestones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward, i) => {
                const isAchieved = referredUsers.length >= reward.threshold;
                return (
                  <div 
                    key={reward.threshold}
                    className={`p-6 rounded-xl border transition-all flex items-center gap-4 ${
                      isAchieved ? 'bg-gold/10 border-gold/50' : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${isAchieved ? 'bg-gold text-black' : 'bg-white/5 text-white/20'}`}>
                      <reward.icon size={24} />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${isAchieved ? 'text-gold' : 'text-white/60'}`}>{reward.reward}</p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                        {isAchieved ? 'Achieved' : `${reward.threshold - referredUsers.length} More Needed`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 space-y-6 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Users className="text-gold" size={20} /> Your Network
            </h3>
            <div className="space-y-4">
              {referredUsers.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                    <UserPlus size={32} />
                  </div>
                  <p className="text-white/40 italic text-sm">No Oracles referred yet. Start sharing the wisdom.</p>
                </div>
              ) : (
                referredUsers.map((user) => (
                  <div key={user.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20 text-[10px] font-bold">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{user.email.split('@')[0]}</p>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{user.tier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Joined</p>
                      <p className="text-xs text-white/40">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-8 bg-emerald-400/5 border-emerald-400/20">
            <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2 text-emerald-400">
              <TrendingUp size={18} /> Network Impact
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Total Referred</span>
                <span className="text-xl font-display font-bold text-emerald-400">{referredUsers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Network Tier</span>
                <span className="text-xl font-display font-bold text-emerald-400">Level {Math.floor(referredUsers.length / 5) + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
