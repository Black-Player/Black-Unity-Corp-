import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Star, Zap, Shield, TrendingUp, Users, Search, Filter, Sparkles, MessageSquare, Lock, Unlock, Trophy, Target } from 'lucide-react';
import { BOTS, UserProfile, TIER_BOT_LIMITS } from '../types';

export default function Gallery({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedBot, setSelectedBot] = useState<any>(null);

  const filters = ['All', 'Scalping', 'Trend', 'Contrarian', 'HFT', 'Neural'];

  const filteredBots = BOTS.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bot.strategy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || bot.strategy.includes(activeFilter);
    return matchesSearch && matchesFilter;
  });

  const isUnlocked = (index: number) => index < TIER_BOT_LIMITS[userProfile.tier];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <Sparkles className="text-gold" size={32} /> The Gallery
          </h1>
          <p className="text-white/40">Browse and unlock the most powerful AI Oracles in the cosmos.</p>
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
          <div className="flex gap-1 p-1 glass-card border-white/5">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeFilter === f ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBots.map((bot, index) => {
          const unlocked = isUnlocked(index);
          return (
            <motion.div
              key={bot.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-card p-6 border-white/5 hover:border-gold/20 transition-all relative overflow-hidden group ${!unlocked ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -z-10 group-hover:bg-gold/10 transition-all" />
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    unlocked ? 'bg-gold/10 border-gold/30 text-gold group-hover:scale-110' : 'bg-white/5 border-white/10 text-white/20'
                  }`}>
                    <Bot size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold">{bot.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{bot.strategy}</p>
                  </div>
                </div>
                {!unlocked && <Lock className="text-white/20" size={18} />}
              </div>

              <div className="space-y-4">
                <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                  {bot.description || "A master of the markets, trained on cosmic data and neural networks to reveal the path to abundance."}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Win Rate</p>
                    <p className="text-lg font-display font-bold text-emerald-400">78.4%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Risk Level</p>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= (index % 5 + 1) ? 'bg-gold' : 'bg-white/5'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2 text-white/40">
                    <Users size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">1.2k Active</span>
                  </div>
                  <button 
                    onClick={() => unlocked ? setSelectedBot(bot) : addToast(`Upgrade to unlock ${bot.name}`, 'info')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      unlocked 
                        ? 'bg-gold text-black shadow-lg shadow-gold/20 hover:scale-105' 
                        : 'bg-white/5 border border-white/10 text-white/40'
                    }`}
                  >
                    {unlocked ? 'Summon Oracle' : 'Access Restricted'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedBot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-2xl p-8 border-gold/30 bg-cosmic-black relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setSelectedBot(null)} className="text-white/40 hover:text-white">Close</button>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-gold">
                  <Bot size={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold gold-gradient">{selectedBot.name}</h2>
                  <p className="text-sm text-white/60 uppercase tracking-[0.2em] font-bold">{selectedBot.strategy}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                      <Zap size={12} /> High Performance
                    </span>
                    <span className="flex items-center gap-1 text-gold text-[10px] font-bold uppercase tracking-widest">
                      <Shield size={12} /> Verified Oracle
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Oracle Mission</h4>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {selectedBot.name} is a neural-link Oracle specialized in {selectedBot.strategy}. It utilizes multi-dimensional data analysis to predict market shifts before they manifest in the physical realm.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Avg. Monthly ROI</p>
                      <p className="text-xl font-display font-bold text-emerald-400">+24.8%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Max Drawdown</p>
                      <p className="text-xl font-display font-bold text-red-400">-4.2%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Preferred Assets</h4>
                    <div className="flex flex-wrap gap-2">
                      {['EURUSD', 'GBPUSD', 'XAUUSD', 'BTC', 'V75', 'V100'].map(asset => (
                        <span key={asset} className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Oracle Stats</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Total Signals</span>
                        <span className="text-white font-bold">14,284</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Accuracy Rating</span>
                        <span className="text-emerald-400 font-bold">92%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Community Trust</span>
                        <span className="text-gold font-bold">4.9/5.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                <button className="flex-1 py-4 bg-gold text-black font-display font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-gold/20">
                  Connect to Neural Link
                </button>
                <button className="px-6 py-4 glass-card border-white/10 text-white/60 hover:text-white transition-all">
                  <MessageSquare size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
