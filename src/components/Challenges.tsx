import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Zap, Shield, Star, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Challenge, UserProfile } from '../types';

interface ChallengesProps {
  userProfile: UserProfile;
}

export const Challenges: React.FC<ChallengesProps> = ({ userProfile }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'challenges'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
      setChallenges(data);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'challenges'));

    return () => unsubscribe();
  }, []);

  const handleStartChallenge = async (challengeId: string) => {
    setStarting(challengeId);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        active_challenges: arrayUnion(challengeId)
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`));
      
      // In a real app, we'd also create a progress document
    } catch (err: any) {
      console.error(err);
    } finally {
      setStarting(null);
    }
  };

  const handleClaimReward = async (challengeId: string) => {
    const challenge = displayChallenges.find(c => c.id === challengeId);
    if (!challenge) return;

    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        xp: (userProfile.xp || 0) + 500,
        credits: (userProfile.credits || 0) + 100,
        active_challenges: arrayRemove(challengeId)
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`));
      
      alert(`Reward claimed for "${challenge.title}"! +500 XP, +100 Credits.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Mock data if Firestore is empty
  const defaultChallenges: Challenge[] = [
    {
      id: '1',
      title: 'The Genesis Trial',
      description: 'Achieve a 5% profit on your demo account within 24 hours.',
      target_pnl: 50,
      reward: '500 XP + 100 Credits',
      active: true
    },
    {
      id: '2',
      title: 'Consistency King',
      description: 'Maintain a 70% win rate over 20 trades.',
      target_pnl: 0,
      reward: '1000 XP + 250 Credits',
      active: true
    },
    {
      id: '3',
      title: 'The Whale Hunter',
      description: 'Capture a single trade with a 1:5 Risk/Reward ratio.',
      target_pnl: 0,
      reward: '2000 XP + 500 Credits',
      active: true
    }
  ];

  const displayChallenges = challenges.length > 0 ? challenges : defaultChallenges;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gold/20 rounded-lg border border-gold/30">
          <Trophy className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Celestial Challenges</h2>
          <p className="text-sm text-white/40">Prove your worth and ascend the ranks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayChallenges.map((challenge, index) => {
          const isActive = userProfile.active_challenges?.includes(challenge.id);
          const isCompleted = false; // In a real app, check progress

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 flex flex-col justify-between group border-white/5 hover:border-gold/30 transition-all duration-500"
            >
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all">
                      {index === 0 ? <Zap className="w-6 h-6 text-gold" /> : 
                       index === 1 ? <Shield className="w-6 h-6 text-blue-400" /> : 
                       <Star className="w-6 h-6 text-purple-400" />}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      isActive ? 'bg-gold/10 border border-gold/20 text-gold' : 'bg-white/5 border border-white/10 text-white/20'
                    }`}>
                      {isActive ? 'In Progress' : 'Available'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">
                      {challenge.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {challenge.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-white/20">Progress</span>
                      <span className="text-gold">{isActive ? '65%' : '0%'}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isActive ? '65%' : '0%' }}
                        className="h-full bg-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">Reward</div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Star className="w-4 h-4 text-gold" />
                      {challenge.reward}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3">
                  {isActive ? (
                    <button 
                      onClick={() => handleClaimReward(challenge.id)}
                      className="w-full py-3 bg-gold text-black rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      Claim Reward (Simulated)
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartChallenge(challenge.id)}
                      disabled={starting === challenge.id}
                      className="w-full py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold hover:bg-gold hover:text-black hover:border-gold transition-all flex items-center justify-center gap-2 group"
                    >
                      {starting === challenge.id ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Start Challenge
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="glass-card p-8 border-gold/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Lock className="w-40 h-40 text-gold" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h3 className="text-2xl font-bold text-white">Unlock Legendary Challenges</h3>
          <p className="text-white/40 leading-relaxed">
            Legendary challenges are only available to Oracles who have proven their consistency. 
            Complete the Genesis Trial to unlock the next tier of celestial tasks.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-white/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Account
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-white/40">
              <Lock className="w-4 h-4 text-gold" />
              Tier 2 Access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
