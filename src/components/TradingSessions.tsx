import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Clock, Sun, Moon, Zap, Bell, BellOff } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface Session {
  name: string;
  city: string;
  start: number; // UTC hour
  end: number;   // UTC hour
  color: string;
}

const SESSIONS: Session[] = [
  { name: 'Sydney', city: 'Sydney', start: 22, end: 7, color: 'bg-emerald-400' },
  { name: 'Tokyo', city: 'Tokyo', start: 0, end: 9, color: 'bg-indigo-400' },
  { name: 'London', city: 'London', start: 8, end: 17, color: 'bg-gold' },
  { name: 'New York', city: 'New York', start: 13, end: 22, color: 'bg-red-400' },
];

interface TradingSessionsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TradingSessions({ userProfile, addToast }: TradingSessionsProps) {
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUtcHour(new Date().getUTCHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isSessionActive = (session: Session) => {
    if (session.start < session.end) {
      return currentUtcHour >= session.start && currentUtcHour < session.end;
    } else {
      // Overnight session (e.g., Sydney 22 to 7)
      return currentUtcHour >= session.start || currentUtcHour < session.end;
    }
  };

  const toggleSubscription = async (sessionName: string) => {
    const isSubscribed = userProfile.subscribed_sessions?.includes(sessionName);
    const userRef = doc(db, 'users', userProfile.uid);

    try {
      if (isSubscribed) {
        await updateDoc(userRef, {
          subscribed_sessions: arrayRemove(sessionName)
        });
        addToast(`Unsubscribed from ${sessionName} session rituals.`, 'info');
      } else {
        await updateDoc(userRef, {
          subscribed_sessions: arrayUnion(sessionName)
        });
        addToast(`Subscribed to ${sessionName} session rituals. Oracle will monitor closely.`, 'success');
      }
    } catch (err) {
      addToast('Failed to update cosmic subscription.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">The Solar Cycle</h1>
        <p className="text-white/40">Real-time global trading sessions and market overlaps.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {SESSIONS.map((session) => {
          const active = isSessionActive(session);
          const isSubscribed = userProfile.subscribed_sessions?.includes(session.name);

          return (
            <motion.div
              key={session.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-6 border-white/5 transition-all relative overflow-hidden ${
                active ? 'border-gold/30 bg-gold/5' : 'opacity-60'
              }`}
            >
              {active && (
                <motion.div 
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 ${session.color} blur-[100px] opacity-10`}
                />
              )}
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/20'}`}>
                    {active ? <Sun size={20} /> : <Moon size={20} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {active && (
                      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-emerald-400">
                        <Zap size={10} /> Active
                      </span>
                    )}
                    <button 
                      onClick={() => toggleSubscription(session.name)}
                      className={`p-1.5 rounded-lg transition-all ${isSubscribed ? 'bg-gold text-black' : 'bg-white/5 text-white/40 hover:text-gold'}`}
                      title={isSubscribed ? 'Unsubscribe' : 'Subscribe for Auto-Rituals'}
                    >
                      {isSubscribed ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-display font-bold">{session.name}</h3>
                  <p className="text-xs text-white/40">{session.city}</p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-white/20">Hours (UTC)</span>
                  <span className="text-white/60">{session.start}:00 - {session.end}:00</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass-card p-8 border-white/5 space-y-6">
        <h3 className="text-xl font-display font-bold flex items-center gap-2">
          <Globe className="text-gold" size={20} /> Market Overlap Timeline
        </h3>
        
        <div className="relative h-12 bg-white/5 rounded-xl overflow-hidden flex">
          {Array.from({ length: 24 }).map((_, hour) => (
            <div 
              key={hour} 
              className={`flex-1 border-r border-white/5 relative flex flex-col items-center justify-center ${
                hour === currentUtcHour ? 'bg-gold/20' : ''
              }`}
            >
              <div className="absolute top-0 bottom-0 flex flex-col gap-0.5 w-full">
                {SESSIONS.map((session, i) => {
                  const active = session.start < session.end 
                    ? (hour >= session.start && hour < session.end)
                    : (hour >= session.start || hour < session.end);
                  
                  return active ? (
                    <div key={session.name} className={`h-1 w-full ${session.color} opacity-40`} />
                  ) : null;
                })}
              </div>
              <span className="text-[8px] text-white/20 mt-6">{hour}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Current UTC</p>
            <p className="text-lg font-mono font-bold text-gold">{currentUtcHour}:00</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Session Overlap</p>
            <p className="text-lg font-mono font-bold text-emerald-400">
              {SESSIONS.filter(s => isSessionActive(s)).length} Active
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Next Open</p>
            <p className="text-lg font-mono font-bold text-white/60">London (8:00)</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Market State</p>
            <p className="text-lg font-mono font-bold text-white/60">High Volatility</p>
          </div>
        </div>
      </div>
    </div>
  );
}
