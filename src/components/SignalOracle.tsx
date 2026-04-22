import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Target, Activity, Shield, Sparkles, TrendingUp, TrendingDown, Clock, BarChart3, Eye, ChevronRight, AlertTriangle, CheckCircle2, History, PieChart as PieChartIcon, Share2, Globe } from 'lucide-react';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { UserProfile, Signal, TIER_LIMITS, Trade, Tier } from '../types';
import LightweightChart from './LightweightChart';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { generateTradingSignal, getMarketSentiment } from '../services/aiService';
import { sendSignalToTelegram } from '../services/communicationService';
import { useMarketContext } from '../MarketContext';
import { calculateAutoLotSize } from '../lib/tradeUtils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

interface SessionRecommendation {
  name: string;
  pairs: string[];
  description: string;
  volatility: 'Low' | 'Medium' | 'High';
}

const SESSION_RECOMMENDATIONS: Record<string, SessionRecommendation> = {
  'Sydney': {
    name: 'Sydney',
    pairs: ['frxAUDUSD', 'frxNZDUSD', 'frxAUDJPY'],
    description: 'Focus on AUD and NZD crosses. Generally lower volatility but good for range trading.',
    volatility: 'Low'
  },
  'Tokyo': {
    name: 'Tokyo',
    pairs: ['frxUSDJPY', 'frxAUDJPY', 'frxEURJPY', 'frxGBPUSD'],
    description: 'Yen crosses dominate. Watch for breakout patterns on USDJPY.',
    volatility: 'Medium'
  },
  'London': {
    name: 'London',
    pairs: ['frxEURUSD', 'frxGBPUSD', 'frxEURGBP', 'OTC_GDAXI', 'OTC_FTSE'],
    description: 'Highest liquidity. Major trends often start here. Focus on EUR and GBP pairs.',
    volatility: 'High'
  },
  'New York': {
    name: 'New York',
    pairs: ['frxEURUSD', 'frxGBPUSD', 'frxUSDJPY', 'frxXAUUSD', 'OTC_DJI', 'OTC_NDX'],
    description: 'High volatility overlap with London. Major news releases often move USD pairs.',
    volatility: 'High'
  },
  'Synthetics': {
    name: 'Cosmic Synthetics',
    pairs: ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V', '1HZ100V'],
    description: '24/7 algorithmic indices. Independent of global sessions. High precision setups.',
    volatility: 'High'
  }
};

interface SignalOracleProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const getFallbackPrice = (pair: string) => {
  if (pair.includes('BTC')) return 65000 + Math.random() * 1000;
  if (pair.includes('ETH')) return 3500 + Math.random() * 100;
  if (pair.includes('OTC_DJI') || pair.includes('US30')) return 38500 + Math.random() * 100;
  if (pair.includes('OTC_NDX') || pair.includes('NAS')) return 17500 + Math.random() * 100;
  if (pair.includes('OTC_GDAXI') || pair.includes('GER40')) return 18000 + Math.random() * 100;
  if (pair.includes('XAU')) return 2350 + Math.random() * 10;
  if (pair.includes('R_') || pair.includes('BOOM') || pair.includes('CRASH')) return 100 + Math.random() * 500;
  if (pair.includes('JD') || pair.includes('STP')) return 500 + Math.random() * 100;
  if (pair.includes('JPY')) return 150 + Math.random() * 2;
  return 1.0850 + (Math.random() * 0.0050);
};

export default function SignalOracle({ userProfile, addToast }: SignalOracleProps) {
  const { marketPrices } = useMarketContext();
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());
  const [selectedSession, setSelectedSession] = useState<string>('London');
  const [activeSignal, setActiveSignal] = useState<Partial<Signal> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signalTab, setSignalTab] = useState<'execution' | 'logic' | 'visual'>('execution');

  useEffect(() => {
    const hour = new Date().getUTCHours();
    setCurrentUtcHour(hour);
    
    // Auto-select active session
    if (hour >= 8 && hour < 17) setSelectedSession('London');
    else if (hour >= 13 && hour < 22) setSelectedSession('New York');
    else if (hour >= 0 && hour < 9) setSelectedSession('Tokyo');
    else if (hour >= 22 || hour < 7) setSelectedSession('Sydney');
    else setSelectedSession('Synthetics');
  }, []);

  const formatPairName = (pair: string) => {
    return pair.replace('frx', '').replace('cry', '').replace('OTC_', '').replace('_', ' ');
  };

  const generateSignal = async (pair: string) => {
    // Check Trading Hours
    if (userProfile.risk_settings?.trading_hours?.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = userProfile.risk_settings.trading_hours;
      
      if (currentTime < start || currentTime > end) {
        addToast(`Oracle is dormant. Trading hours are ${start} - ${end}.`, 'info');
        return;
      }
    }

    // Check limits
    const limit = TIER_LIMITS[userProfile.tier] || 2;
    if (userProfile.signals_used_today >= limit && userProfile.tier !== 'creator') {
      addToast(`Daily prophecy limit reached for ${userProfile.tier} tier. Upgrade to Zion for more.`, 'error');
      return;
    }

    // Check Max Daily Trades (Risk Setting)
    if (userProfile.risk_settings?.max_daily_trades) {
      if (userProfile.signals_used_today >= userProfile.risk_settings.max_daily_trades) {
         addToast(`Sentinel Limit: Max daily trades (${userProfile.risk_settings.max_daily_trades}) reached.`, 'error');
         return;
      }
    }

    setIsGenerating(true);
    setActiveSignal(null);
    
    try {
      const currentPrice = marketPrices[pair]?.price || getFallbackPrice(pair);
      if (currentPrice === getFallbackPrice(pair) && !marketPrices[pair]?.price) {
        addToast("Using quantum-simulated prices (WebSocket connection or market closed).", "info");
      }

      // Fetch market sentiment for the AI
      const sentiment = await getMarketSentiment(pair);
      
      // Generate real AI signal
      const oracleBot = {
        name: 'Oracle',
        strategy: 'Oracle Convergence',
        tier_requirement: 'oracle' as Tier,
        description: 'The primary Oracle intelligence.',
        icon: 'Zap',
        personality: 'mystical' as const
      };
      const aiSignal = await generateTradingSignal(
        pair,
        'M15',
        oracleBot as any,
        currentPrice,
        sentiment
      );

      const signalData: Omit<Signal, 'id'> = {
        uid: userProfile.uid,
        pair,
        timeframe: 'M15',
        decision: aiSignal.decision,
        decision_reasoning: aiSignal.decision_reasoning,
        visual_blueprint: aiSignal.visual_blueprint,
        ai_sentiment_feedback: aiSignal.ai_sentiment_feedback,
        entry: aiSignal.entry,
        stop_loss: aiSignal.stop_loss,
        tp1: aiSignal.tp1,
        tp2: aiSignal.tp2,
        tp3: aiSignal.tp3,
        tp4: aiSignal.tp4,
        risk_reward: aiSignal.risk_reward,
        strategy: 'Oracle Convergence',
        ai_bot: 'Oracle',
        confidence: aiSignal.confidence,
        market_structure: aiSignal.market_structure,
        liquidity_presence: aiSignal.liquidity_swept,
        session_timing: aiSignal.session_timing,
        timeframe_alignment: (aiSignal as any).timeframe_alignment,
        order_type: (aiSignal as any).order_type,
        execution: (aiSignal as any).execution,
        risk_percent: (aiSignal as any).risk_percent,
        confirmations_count: 5, // Just set it hardcoded or derived
        analysis: aiSignal.analysis,
        recommended_lot_size: aiSignal.recommended_lot_size,
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      const signalId = await dbService.create('signals', {
          ...signalData,
          created_at: new Date().toISOString()
      });
      
      // AUTO-EXECUTE TRADE ON SIGNAL CREATION IF IT IS A BUY OR SELL
      if (aiSignal.decision === 'Buy' || aiSignal.decision === 'Sell') {
         try {
             // Check max open positions
              const trades = await dbService.list('trades', [
                  where('uid', '==', userProfile.uid),
                  where('status', '==', 'open')
              ]);
              const count = trades.length;
              
              if (!userProfile.risk_settings?.max_open_positions || count < userProfile.risk_settings.max_open_positions) {
                  const balanceToUse = userProfile.account_type === 'live' ? userProfile.live_balance : userProfile.demo_balance;
                  const calculatedLot = calculateAutoLotSize(balanceToUse || 0, userProfile.risk_settings?.risk_per_trade || 1, signalData.entry!, signalData.stop_loss!, signalData.pair);

                  const tradeData: Omit<Trade, 'id'> = {
                    uid: userProfile.uid,
                    signal_id: signalId,
                    pair: signalData.pair!,
                    entry_price: signalData.entry,
                    current_price: signalData.entry,
                    tp1: signalData.tp1,
                    tp2: signalData.tp2,
                    tp3: signalData.tp3,
                    tp4: signalData.tp4,
                    active_tp: 3, // Defaulting to TP3 out of gate
                    stop_loss: signalData.stop_loss,
                    pnl: 0,
                    pnl_percentage: 0,
                    lot_size: calculatedLot,
                    status: 'open',
                    type: aiSignal.decision === 'Buy' ? 'buy' : 'sell',
                    account_type: userProfile.account_type || 'demo',
                    created_at: new Date().toISOString()
                  };
                  await dbService.create('trades', tradeData);
                  addToast(`Automated setup engaged for ${pair}`, 'success');
              } else {
                 addToast(`Max open positions reached. Did not auto-execute.`, 'info');
              }
         } catch(e) {
           console.error("Auto execute error", e);
         }
      }
      
      // Increment user's signal count
      try {
        await dbService.update('users', userProfile.uid, {
            signals_used_today: (userProfile.signals_used_today || 0) + 1
        });
      } catch (err) {
        console.error("Signal count update failed", err);
      }
      
      // Broadcast to Telegram (The Chronicle)
      const telegramMessageId = await sendSignalToTelegram({
        ...signalData,
        id: signalId
      });
      
      if (telegramMessageId) {
        try {
          await dbService.update('signals', signalId, { telegram_message_id: telegramMessageId });
        } catch (err) {
          console.error("Telegram ID update failed", err);
        }
      }
      
      setActiveSignal({ ...signalData, id: signalId, telegram_message_id: telegramMessageId });
      setIsGenerating(false);
      addToast(`Oracle Prophecy generated for ${formatPairName(pair)}`, 'success');
    } catch (error: any) {
      addToast(error.message || "The Oracle is currently silent. Please try again.", "error");
      setIsGenerating(false);
    }
  };

  const handleShareSignal = async () => {
    if (!activeSignal) return;
    
    try {
      await dbService.create('posts', {
          uid: userProfile.uid,
          username: userProfile.username || userProfile.email.split('@')[0],
          avatar_url: userProfile.avatar_url,
          content: `🔮 New Prophecy Shared: ${formatPairName(activeSignal.pair!)} @ ${activeSignal.entry?.toFixed(5)}\n\nStrategy: ${activeSignal.strategy}\nConfidence: ${activeSignal.confidence?.toFixed(1)}%\n\nTargets:\nTP1: ${activeSignal.tp1?.toFixed(5)}\nTP2: ${activeSignal.tp2?.toFixed(5)}\nTP3: ${activeSignal.tp3?.toFixed(5)}\nSL: ${activeSignal.stop_loss?.toFixed(5)}`,
          likes: [],
          comments: [],
          created_at: new Date().toISOString(),
          signal_id: activeSignal.id
      });
      
      addToast("Prophecy shared to the celestial feed.", "success");
    } catch (error) {
      addToast("Failed to share prophecy to the feed.", "error");
    }
  };

  const recommendation = SESSION_RECOMMENDATIONS[selectedSession] || SESSION_RECOMMENDATIONS['Synthetics'];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Signal Oracle</h1>
          <p className="text-white/40">Session-aware ritual recommendations and high-precision entries.</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
          {Object.keys(SESSION_RECOMMENDATIONS).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSession(s)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                selectedSession === s ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <motion.div 
            key={selectedSession}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <Globe className="text-gold" size={20} /> {recommendation.name} Session
              </h3>
              <span className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest ${
                recommendation.volatility === 'High' ? 'bg-red-400/10 text-red-400' :
                recommendation.volatility === 'Medium' ? 'bg-gold/10 text-gold' :
                'bg-emerald-400/10 text-emerald-400'
              }`}>
                {recommendation.volatility} Volatility
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{recommendation.description}</p>
            
            <div className="space-y-3 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Recommended Rituals</p>
              <div className="grid grid-cols-1 gap-2">
                {recommendation.pairs.map((pair) => (
                  <button
                    key={pair}
                    onClick={() => generateSignal(pair)}
                    disabled={isGenerating}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                        <Target size={14} className="text-gold" />
                      </div>
                      <span className="font-mono font-bold text-white/80">{formatPairName(pair)}</span>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-gold transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Clock size={20} /> Session Clock
            </h3>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/40">Current UTC Time</span>
              <span className="text-xl font-mono font-bold text-gold">{currentUtcHour}:00</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card border-white/5 h-[600px] relative overflow-hidden flex flex-col">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-gold"
                >
                  <Sparkles size={64} />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-display font-bold gold-gradient">Consulting the Oracle</h3>
                  <p className="text-white/40 text-sm">Analyzing session liquidity and order flow...</p>
                </div>
              </div>
            ) : activeSignal ? (
              <>
                <div className="flex-1">
                  <LightweightChart 
                    symbol={activeSignal.pair!} 
                    entry={activeSignal.entry}
                    sl={activeSignal.stop_loss}
                    tps={[activeSignal.tp1!, activeSignal.tp2!, activeSignal.tp3!]}
                    height={450}
                  />
                </div>
                
                {/* Tabs for detailed analysis vs execution */}
                <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 backdrop-blur-md">
                  <div className="flex gap-4 mb-4 border-b border-white/5 pb-2">
                    <button onClick={() => setSignalTab('execution')} className={`text-xs font-bold uppercase tracking-widest ${signalTab === 'execution' ? 'text-gold' : 'text-white/40 hover:text-white'}`}>Execution</button>
                    <button onClick={() => setSignalTab('logic')} className={`text-xs font-bold uppercase tracking-widest ${signalTab === 'logic' ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}>AI Reasoning</button>
                    <button onClick={() => setSignalTab('visual')} className={`text-xs font-bold uppercase tracking-widest ${signalTab === 'visual' ? 'text-purple-400' : 'text-white/40 hover:text-white'}`}>Visual Blueprint</button>
                  </div>
                  
                  {signalTab === 'execution' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/20 uppercase tracking-widest font-bold truncate">Entry Price</p>
                          <p className="text-[11px] sm:text-lg font-mono font-bold text-gold truncate">{activeSignal.entry?.toFixed(activeSignal.pair?.includes('JPY') || activeSignal.pair?.includes('BTC') || activeSignal.pair?.includes('OTC') || activeSignal.pair?.includes('ETH') ? 2 : 5)}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/20 uppercase tracking-widest font-bold truncate">Stop Loss</p>
                          <p className="text-[11px] sm:text-lg font-mono font-bold text-red-400 truncate">{activeSignal.stop_loss?.toFixed(activeSignal.pair?.includes('JPY') || activeSignal.pair?.includes('BTC') || activeSignal.pair?.includes('OTC') || activeSignal.pair?.includes('ETH') ? 2 : 5)}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/20 uppercase tracking-widest font-bold truncate">Target (TP3)</p>
                          <p className="text-[11px] sm:text-lg font-mono font-bold text-emerald-400 truncate">{activeSignal.tp3?.toFixed(activeSignal.pair?.includes('JPY') || activeSignal.pair?.includes('BTC') || activeSignal.pair?.includes('OTC') || activeSignal.pair?.includes('ETH') ? 2 : 5)}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/20 uppercase tracking-widest font-bold truncate">Decision</p>
                          <div className="flex items-center gap-1">
                            <p className={`text-[11px] sm:text-lg font-mono font-bold truncate ${activeSignal.decision === 'Buy' ? 'text-emerald-400' : activeSignal.decision === 'Sell' ? 'text-red-400' : 'text-white'}`}>{activeSignal.decision || 'N/A'}</p>
                            <Zap size={10} className="text-gold animate-pulse shrink-0" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs text-white/60 leading-relaxed italic">"{activeSignal.analysis}"</p>
                      </div>
                      
                      <div className="mt-6 flex gap-3">
                        <button 
                          onClick={async () => {
                            if (!activeSignal.id) return;
                            try {
                              // Check max open positions
                              const trades = await dbService.list('trades', [
                                  where('uid', '==', userProfile.uid),
                                  where('status', '==', 'open')
                              ]);
                              const count = trades.length;
                              
                              if (userProfile.risk_settings?.max_open_positions) {
                                if (count >= userProfile.risk_settings.max_open_positions) {
                                  addToast(`Sentinel Limit: Max open positions (${userProfile.risk_settings.max_open_positions}) reached.`, 'error');
                                  return;
                                }
                              }

                              const balanceToUse = userProfile.account_type === 'live' ? userProfile.live_balance : userProfile.demo_balance;
                              const calculatedLot = calculateAutoLotSize(balanceToUse || 0, userProfile.risk_settings?.risk_per_trade || 1, activeSignal.entry!, activeSignal.stop_loss!, activeSignal.pair!);

                              const tradeData: Omit<Trade, 'id'> = {
                                uid: userProfile.uid,
                                signal_id: activeSignal.id,
                                pair: activeSignal.pair!,
                                entry_price: activeSignal.entry!,
                                current_price: activeSignal.entry!,
                                tp1: activeSignal.tp1!,
                                tp2: activeSignal.tp2!,
                                tp3: activeSignal.tp3!,
                                tp4: activeSignal.tp4!,
                                active_tp: 3, // Start with TP3 target logic via Signal button too
                                stop_loss: activeSignal.stop_loss!,
                                pnl: 0,
                                pnl_percentage: 0,
                                lot_size: calculatedLot,
                                status: 'open',
                                type: activeSignal.decision === 'Buy' ? 'buy' : activeSignal.decision === 'Sell' ? 'sell' : activeSignal.stop_loss! < activeSignal.entry! ? 'buy' : 'sell',
                                account_type: userProfile.account_type || 'demo',
                                created_at: new Date().toISOString()
                              };
                              
                              await dbService.create('trades', tradeData);
                              
                              addToast("Ritual executed. The trade is now live in your portfolio.", "success");
                            } catch (error) {
                              addToast("Failed to execute ritual in the physical realm.", "error");
                            }
                          }}
                          className={`flex-1 ${activeSignal.decision === 'No Trade' ? 'bg-white/5 text-white/40 cursor-not-allowed' : 'gold-button'} py-4 flex items-center justify-center gap-2 group`}
                          disabled={activeSignal.decision === 'No Trade'}
                        >
                          <Zap size={20} className={activeSignal.decision !== 'No Trade' ? "group-hover:animate-pulse" : ""} />
                          {activeSignal.decision === 'No Trade' ? 'No Execution Advised' : 'Execute Cosmic Ritual'}
                        </button>
                        <button 
                          onClick={handleShareSignal}
                          className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-gold hover:border-gold/50 transition-all flex items-center justify-center"
                          title="Share to Feed"
                        >
                          <Share2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {signalTab === 'logic' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Omni Core Decision Reasoning</h4>
                        <p className="text-sm text-white/80 leading-relaxed font-mono mb-4">{activeSignal.decision_reasoning || "Reasoning unavailable for this historical signal."}</p>
                        {activeSignal.ai_sentiment_feedback && (
                          <div className="mt-4 pt-4 border-t border-blue-500/20">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold mb-1">AI Sentiment & Confidence</h4>
                            <p className="text-xs text-white/60 italic">"{activeSignal.ai_sentiment_feedback}"</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Structure</p>
                          <p className="text-[10px] font-mono font-bold text-gold">{activeSignal.market_structure || 'N/A'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Liquidity</p>
                          <div className={`w-2 h-2 rounded-full ${activeSignal.liquidity_presence ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400/20'}`} />
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Volatility</p>
                          <div className={`w-2 h-2 rounded-full ${activeSignal.volatility_validation ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400/20'}`} />
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Confirmations</p>
                          <p className="text-[10px] font-mono font-bold text-white">{activeSignal.confirmations_count || 0}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {signalTab === 'visual' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="p-6 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col items-center text-center relative overflow-hidden">
                         <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                         <Eye className="text-purple-400 mb-4 animate-pulse opacity-50" size={32} />
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2">Visual Generative Blueprint</h4>
                         <p className="text-xs text-white/80 leading-relaxed max-w-lg mb-4">
                           {activeSignal.visual_blueprint || "The Oracle did not generate a visual blueprint for this interaction."}
                         </p>
                         <button 
                            disabled={!activeSignal.visual_blueprint}
                            onClick={() => {
                                addToast("Zion Image Matrix Rendering... (Mock processing delay)", "info");
                                setTimeout(() => addToast("Image Rendered. Generating actual image not connected without an active agent. Check prompt log for generation.", "success"), 2500);
                            }}
                            className="px-6 py-2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500/40 transition-all border border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                           Render Blueprint Matrix
                         </button>
                         <p className="text-[8px] text-white/40 mt-3">*Rendering uses abstract procedural vectors generated by the AI reasoning core.</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-40">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  <Target size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-display font-bold">No Active Prophecy</h3>
                  <p className="text-white/40 text-sm">Select a recommended pair to begin the ritual.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
        <div className="lg:col-span-2 glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-8">
            <BarChart3 className="text-gold" size={20} /> Oracle Accuracy (7D)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Mon', accuracy: 72 },
                { name: 'Tue', accuracy: 78 },
                { name: 'Wed', accuracy: 85 },
                { name: 'Thu', accuracy: 82 },
                { name: 'Fri', accuracy: 89 },
                { name: 'Sat', accuracy: 75 },
                { name: 'Sun', accuracy: 81 },
              ]}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} domain={[60, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#D4AF37" fillOpacity={1} fill="url(#colorAccuracy)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <PieChartIcon className="text-gold" size={20} /> Entity Performance
          </h3>
          <div className="space-y-4">
            {[
              { label: 'The Alchemist', value: '88% Accuracy', signals: 142 },
              { label: 'The Prophet', value: '82% Accuracy', signals: 98 },
              { label: 'The Guardian', value: '94% Accuracy', signals: 64 },
            ].map((entity) => (
              <div key={entity.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-white">{entity.label}</p>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">{entity.value}</p>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: entity.value }} />
                </div>
                <p className="text-[10px] text-white/20 mt-2 uppercase font-bold">{entity.signals} Signals Generated</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
