import { BOTS, UserProfile, TIER_BOT_LIMITS } from '../types';
import { Bot, Lock, CheckCircle2, Zap, Cpu, Eye, Activity, Grid, Shield, Layout } from 'lucide-react';
import { motion } from 'motion/react';

interface BotGalleryProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setActivePage: (page: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Zap, Cpu, Eye, Activity, Grid, Shield, Layout
};

export default function BotGallery({ userProfile, addToast, setActivePage }: BotGalleryProps) {
  const botLimit = TIER_BOT_LIMITS[userProfile.tier];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">AI Oracle Gallery</h1>
        <p className="text-white/40">The divine entities behind every signal.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {BOTS.map((bot, index) => {
          const isLocked = index >= botLimit;
          const Icon = ICON_MAP[bot.icon] || Bot;

          return (
            <motion.div
              key={bot.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 flex flex-col items-center text-center space-y-4 relative overflow-hidden group ${
                isLocked ? 'opacity-50 grayscale' : 'border-gold/20'
              }`}
            >
              {isLocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="bg-gold text-black p-3 rounded-full shadow-lg shadow-gold/20 mb-4">
                    <Lock size={24} />
                  </div>
                  <h4 className="font-bold text-lg mb-2">Locked Bot</h4>
                  <p className="text-xs text-white/60 mb-4">Requires {(bot.tier_requirement || 'FREE').toUpperCase()} tier access.</p>
                  <button 
                    onClick={() => setActivePage('subscription')}
                    className="gold-button px-4 py-2 text-[10px]"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isLocked ? 'bg-white/10' : 'bg-gold/10 text-gold group-hover:bg-gold group-hover:text-black'
              }`}>
                <Icon size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-display font-bold uppercase tracking-tight">{bot.name}</h3>
                <p className="text-xs text-gold/70 font-bold uppercase tracking-widest">{bot.strategy}</p>
              </div>

              <p className="text-sm text-white/60 leading-relaxed min-h-[3rem]">
                {bot.description}
              </p>

              {/* BotGallery Specific Performance Mock */}
              <div className="w-full grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-white/5 rounded-xl px-2 my-2">
                 <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Win Rate</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      {(75 + (index % 12)).toFixed(1)}%
                    </p>
                 </div>
                 <div className="flex flex-col items-center justify-center text-center border-l border-white/10">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Drawdown</p>
                    <p className="text-xs font-mono font-bold text-red-400">
                      -{(2.5 + (index % 5)).toFixed(1)}%
                    </p>
                 </div>
                 <div className="flex flex-col items-center justify-center text-center border-l border-white/10">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Profit Fact.</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      {(1.5 + (index % 10) * 0.1).toFixed(1)}
                    </p>
                 </div>
              </div>

              <div className="pt-2 w-full flex items-center justify-between text-xs">
                <span className="text-white/40 uppercase tracking-widest">Tier</span>
                <span className={`font-bold uppercase ${isLocked ? 'text-white/40' : 'text-gold'}`}>
                  {bot.tier_requirement}
                </span>
              </div>

              {!isLocked && (
                <div className="absolute top-4 right-4 text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {userProfile.tier !== 'creator' && userProfile.tier !== 'zion' && (
        <div className="glass-card p-8 bg-gradient-to-r from-gold/10 to-transparent border-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold">Unlock the Full Pantheon</h2>
            <p className="text-white/60">Upgrade your tier to access more advanced AI bots and higher precision signals.</p>
          </div>
          <button 
            onClick={() => setActivePage('subscription')}
            className="gold-button whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
