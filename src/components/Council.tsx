import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, MessageSquare, Shield, Sparkles, TrendingUp, TrendingDown, Zap, Users, Info } from 'lucide-react';
import { generateTradingSignal } from '../services/aiService';

interface CouncilProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface BotOpinion {
  bot: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
  icon: any;
}

export default function Council({ userProfile, addToast }: CouncilProps) {
  const [pair, setPair] = useState('Volatility 100 (1s) Index');
  const [isDebating, setIsDebating] = useState(false);
  const [opinions, setOpinions] = useState<BotOpinion[]>([]);
  const [consensus, setConsensus] = useState<{ sentiment: string; confidence: number; signal: any } | null>(null);

  const bots = [
    { name: 'Trinity', strategy: 'Price Action & Order Flow', icon: Brain, color: 'text-gold' },
    { name: 'Sentinel', strategy: 'Trend Following & Momentum', icon: Shield, color: 'text-emerald-400' },
    { name: 'Oracle', strategy: 'Predictive AI & Sentiment', icon: Sparkles, color: 'text-blue-400' },
  ];

  const pairs = [
    'Volatility 100 (1s) Index',
    'Volatility 75 Index',
    'Volatility 10 Index',
    'Crash 1000 Index',
    'Boom 1000 Index',
    'Step Index',
    'Jump 100 Index'
  ];

  const startDebate = async () => {
    setIsDebating(true);
    setOpinions([]);
    setConsensus(null);

    try {
      // Simulate bot opinions (in a real app, we'd call the AI for each bot)
      const newOpinions: BotOpinion[] = [];
      
      for (const bot of bots) {
        // We'll use a slightly different prompt for each bot to get varied opinions
        // For now, we simulate to save API tokens and time
        await new Promise(resolve => setTimeout(resolve, 1500));
        const sentiment: 'bullish' | 'bearish' | 'neutral' = Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral';
        const confidence = Math.floor(Math.random() * 30) + 60;
        
        newOpinions.push({
          bot: bot.name,
          sentiment,
          confidence,
          reasoning: `Based on ${bot.strategy}, I see a ${sentiment} structure forming. The cosmic alignment suggests ${sentiment === 'bullish' ? 'upward expansion' : 'downward contraction'}.`,
          icon: bot.icon
        });
        setOpinions([...newOpinions]);
      }

      // Calculate consensus
      const bullishCount = newOpinions.filter(o => o.sentiment === 'bullish').length;
      const bearishCount = newOpinions.filter(o => o.sentiment === 'bearish').length;
      
      let finalSentiment = 'Neutral';
      if (bullishCount > bearishCount) finalSentiment = 'Bullish';
      if (bearishCount > bullishCount) finalSentiment = 'Bearish';

      const avgConfidence = Math.round(newOpinions.reduce((acc, o) => acc + o.confidence, 0) / newOpinions.length);

      // Generate the final signal if consensus is strong
      if (finalSentiment !== 'Neutral' && avgConfidence > 70) {
        const signal = await generateTradingSignal(pair, 'H1', 'Council', 'Multi-Bot Consensus', 1000, { sentiment: finalSentiment });
        setConsensus({ sentiment: finalSentiment, confidence: avgConfidence, signal });
      } else {
        setConsensus({ sentiment: finalSentiment, confidence: avgConfidence, signal: null });
      }

    } catch (err) {
      addToast('The Council is divided. Cosmic interference detected.', 'error');
    } finally {
      setIsDebating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Trading Council</h1>
          <p className="text-white/40">Multi-bot consensus engine for high-probability cosmic entries.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gold/50"
          >
            {pairs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button 
            onClick={startDebate}
            disabled={isDebating}
            className="gold-button px-8 py-2 flex items-center gap-2 disabled:opacity-50"
          >
            {isDebating ? <Zap className="animate-pulse" size={18} /> : <Users size={18} />}
            {isDebating ? 'Council Debating...' : 'Convene Council'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {bots.map((bot, i) => {
          const opinion = opinions.find(o => o.bot === bot.name);
          return (
            <motion.div
              key={bot.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 border-white/5 space-y-6 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full bg-current opacity-5 blur-3xl ${bot.color}`} />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-white/5 ${bot.color}`}>
                    <bot.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{bot.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{bot.strategy}</p>
                  </div>
                </div>
                {opinion && (
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    opinion.sentiment === 'bullish' ? 'bg-emerald-400/10 text-emerald-400' :
                    opinion.sentiment === 'bearish' ? 'bg-red-400/10 text-red-400' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {opinion.sentiment}
                  </div>
                )}
              </div>

              <div className="h-32 flex flex-col justify-center">
                {opinion ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm text-white/70 italic leading-relaxed">"{opinion.reasoning}"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase font-bold">Confidence</span>
                      <span className={`text-sm font-bold ${bot.color}`}>{opinion.confidence}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${opinion.confidence}%` }}
                        className={`h-full bg-current ${bot.color}`}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/20 space-y-2">
                    <Info size={32} strokeWidth={1} />
                    <p className="text-xs uppercase tracking-widest">Awaiting Convocation</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {consensus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-10 border-gold/30 bg-gold/5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent opacity-50" />
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="p-4 rounded-full bg-gold/10 text-gold border border-gold/20">
                <Sparkles size={48} />
              </div>
              
              <div>
                <h2 className="text-4xl font-display font-bold gold-gradient uppercase tracking-tighter">Council Consensus</h2>
                <p className="text-white/40 uppercase tracking-[0.3em] text-xs mt-2">Final Verdict for {pair}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-3xl py-8">
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Sentiment</p>
                  <p className={`text-3xl font-display font-bold ${
                    consensus.sentiment === 'Bullish' ? 'text-emerald-400' :
                    consensus.sentiment === 'Bearish' ? 'text-red-400' :
                    'text-white/60'
                  }`}>{consensus.sentiment}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Confidence</p>
                  <p className="text-3xl font-display font-bold text-gold">{consensus.confidence}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Verdict</p>
                  <p className="text-3xl font-display font-bold text-white">
                    {consensus.confidence > 75 ? 'EXECUTE' : 'OBSERVE'}
                  </p>
                </div>
              </div>

              {consensus.signal ? (
                <div className="w-full max-w-2xl p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase font-bold">Entry</p>
                      <p className="text-sm font-mono text-gold">{consensus.signal.entry}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase font-bold">Stop Loss</p>
                      <p className="text-sm font-mono text-red-400">{consensus.signal.stop_loss}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase font-bold">TP 1</p>
                      <p className="text-sm font-mono text-emerald-400">{consensus.signal.tp1}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase font-bold">TP 4</p>
                      <p className="text-sm font-mono text-emerald-400">{consensus.signal.tp4}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed italic">
                    "{consensus.signal.analysis}"
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white/40 italic">
                    The Council is not in full agreement. No execution signal generated. Patience is the ultimate cosmic virtue.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
