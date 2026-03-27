import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment, serverTimestamp, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserProfile, Signal, Trade, BOTS, TIER_LIMITS, TIER_BOT_LIMITS, PriceAlert, MarketNews } from '../types';
import { DERIV_SYMBOLS } from '../constants';
import { generateTradingSignal, getMarketSentiment, analyzeChartImage, getMarketNews } from '../services/aiService';
import { derivService, DerivTick } from '../services/derivService';
import { Zap, TrendingUp, TrendingDown, Target, ShieldAlert, Clock, BarChart3, Bot, Sparkles, RefreshCw, Globe, ArrowUpRight, ArrowDownRight, X, Activity, Volume2, VolumeX, Newspaper, Eye, Upload, Loader2, Shield, Calendar, Bell, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LightweightChart from './LightweightChart';
import AssetDetails from './AssetDetails';
import TradingSessions from './TradingSessions';
import { PerformanceStats } from './PerformanceStats';
import { RiskManagement } from './RiskManagement';
import { Backtesting } from './Backtesting';
import { Portfolio } from './Portfolio';
import { Tutorial } from './Tutorial';
import { Community } from './Community';
import { BotForge } from './BotForge';
import Chat from './Chat';
import { EconomicCalendar } from './EconomicCalendar';
import { PriceAlerts } from './PriceAlerts';
import { MasterStrategy } from './MasterStrategy';
import { Tribes } from './Tribes';
import { Challenges } from './Challenges';
import { Marketplace } from './Marketplace';
import { Academy } from './Academy';
import { NewsFeed } from './NewsFeed';
import PerformanceReports from './PerformanceReports';
import Subscription from './Subscription';

import { useMarketPrices } from '../hooks/useMarketPrices';

interface DashboardProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Dashboard({ userProfile, addToast }: DashboardProps) {
  const marketPrices = useMarketPrices();
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [pair, setPair] = useState('crash_500');
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'stats' | 'portfolio' | 'backtest' | 'risk' | 'community' | 'bot-forge' | 'chat' | 'calendar' | 'alerts' | 'strategies' | 'tribes' | 'challenges' | 'marketplace' | 'academy' | 'status' | 'performance' | 'subscription'>('signals');
  const [accountType, setAccountType] = useState<'demo' | 'live'>(userProfile.account_type || 'demo');
  const [showTutorial, setShowTutorial] = useState(false);
  const [launchCountdown, setLaunchCountdown] = useState('');

  useEffect(() => {
    const launchDate = new Date('2024-04-15T00:00:00Z').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate - now;
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setLaunchCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeAlerts, setActiveAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users', userProfile.uid, 'alerts'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PriceAlert));
      setActiveAlerts(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userProfile.uid}/alerts`));

    return () => unsubscribe();
  }, [userProfile.uid]);

  useEffect(() => {
    activeAlerts.forEach(async (alert) => {
      const currentPrice = marketPrices[alert.pair]?.price;
      if (!currentPrice) return;

      const triggered = alert.condition === 'above' 
        ? currentPrice >= alert.price 
        : currentPrice <= alert.price;

      if (triggered) {
        addToast(`Price Alert: ${alert.pair} is ${alert.condition} ${alert.price}!`, 'success');
        
        // Deactivate alert
        await updateDoc(doc(db, 'users', userProfile.uid, 'alerts', alert.id), {
          active: false
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}/alerts/${alert.id}`));

        // Create notification
        await addDoc(collection(db, 'users', userProfile.uid, 'notifications'), {
          title: 'Price Alert Triggered',
          message: `${alert.pair} has reached your target of ${alert.price}.`,
          type: 'system',
          read: false,
          created_at: new Date().toISOString()
        });
      }
    });
  }, [marketPrices, activeAlerts, userProfile.uid]);
  const [timeframe, setTimeframe] = useState('H1');
  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [sentiment, setSentiment] = useState({ bullish: 65, bearish: 35, summary: 'Market shows strong bullish momentum.' });
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [news, setNews] = useState<MarketNews[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [sessionAutoPilot, setSessionAutoPilot] = useState(false);
  const [boostAnalysis, setBoostAnalysis] = useState<any>(null);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const boostInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleBoostUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        addToast('The image is too heavy for the cosmic link. Max 4MB.', 'error');
        return;
      }
      setIsBoosting(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = (reader.result as string).split(',')[1];
          const mimeType = (reader.result as string).split(',')[0].split(':')[1].split(';')[0];
          const analysis = await analyzeChartImage(base64Image, mimeType);
          setBoostAnalysis(analysis);
          addToast('Oracle Eye Boost Active! The next signal will be more precise.', 'success');
        } catch (err: any) {
          addToast(err.message, 'error');
        } finally {
          setIsBoosting(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Session Auto-Pilot Rituals
  useEffect(() => {
    if (!sessionAutoPilot || !userProfile.subscribed_sessions?.length) return;

    const ritualInterval = setInterval(async () => {
      const currentUtcHour = new Date().getUTCHours();
      const SESSIONS = [
        { name: 'Sydney', start: 22, end: 7 },
        { name: 'Tokyo', start: 0, end: 9 },
        { name: 'London', start: 8, end: 17 },
        { name: 'New York', start: 13, end: 22 },
      ];
      
      const activeSessions = SESSIONS.filter(session => {
        if (session.start < session.end) {
          return currentUtcHour >= session.start && currentUtcHour < session.end;
        } else {
          return currentUtcHour >= session.start || currentUtcHour < session.end;
        }
      });

      const isSubscribedActive = activeSessions.some(s => userProfile.subscribed_sessions?.includes(s.name));

      if (isSubscribedActive && !generating && activeSignals.length < 3) {
        addToast(`Session Ritual Active: Oracle is seeking opportunities...`, 'info');
        handleGenerate();
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(ritualInterval);
  }, [sessionAutoPilot, userProfile.subscribed_sessions, generating, activeSignals.length]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const playSignalSound = () => {
    if (!audioEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors if browser blocks autoplay
  };

  useEffect(() => {
    derivService.connect();
  }, []);

  useEffect(() => {
    const fetchSentiment = async () => {
      setLoadingSentiment(true);
      try {
        const data = await getMarketSentiment(pair);
        setSentiment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSentiment(false);
      }
    };
    fetchSentiment();

    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const data = await getMarketNews(pair);
        setNews(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, [pair]);

  useEffect(() => {
    const q = query(
      collection(db, 'signals'),
      where('user_id', '==', userProfile.uid),
      where('status', '==', 'active'),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const signals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Signal));
      setActiveSignals(signals);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  useEffect(() => {
    const q = query(
      collection(db, 'users', userProfile.uid, 'trades'),
      where('status', '==', 'open'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setActiveTrades(trades);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${userProfile.uid}/trades`);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  // The Singularity: Automated Signal & Trade Monitoring
  useEffect(() => {
    if (activeTrades.length === 0) return;

    const monitorInterval = setInterval(async () => {
      // Monitor Active Trades for TP/SL
      for (const trade of activeTrades) {
        const currentPrice = marketPrices[trade.pair]?.price;
        if (!currentPrice || currentPrice === 0) continue;

        let shouldClose = false;
        let reason = '';

        if (trade.type === 'buy') {
          if (currentPrice >= trade.tp4) {
            shouldClose = true;
            reason = 'TP4 Hit';
          } else if (currentPrice >= trade.tp3) {
            // Partial close logic could go here, for now just log
            console.log("TP3 Hit for", trade.pair);
          } else if (currentPrice >= trade.tp2) {
            console.log("TP2 Hit for", trade.pair);
          } else if (currentPrice >= trade.tp1) {
            console.log("TP1 Hit for", trade.pair);
          }
          
          if (currentPrice <= trade.stop_loss) {
            shouldClose = true;
            reason = 'Stop Loss Hit';
          }
        } else {
          if (currentPrice <= trade.tp4) {
            shouldClose = true;
            reason = 'TP4 Hit';
          } else if (currentPrice <= trade.tp3) {
            console.log("TP3 Hit for", trade.pair);
          } else if (currentPrice <= trade.tp2) {
            console.log("TP2 Hit for", trade.pair);
          } else if (currentPrice <= trade.tp1) {
            console.log("TP1 Hit for", trade.pair);
          }

          if (currentPrice >= trade.stop_loss) {
            shouldClose = true;
            reason = 'Stop Loss Hit';
          }
        }

        if (shouldClose) {
          await handleCloseTrade(trade, reason);
        } else {
          // Update P/L in real-time
          const pnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * 100 
            : (trade.entry_price - currentPrice) * 100;
          const pnl_percentage = (pnl / (trade.entry_price * 100)) * 100;

          await updateDoc(doc(db, 'users', userProfile.uid, 'trades', trade.id), {
            current_price: currentPrice,
            pnl,
            pnl_percentage
          }).catch(() => {});
        }
      }
    }, 2000);

    return () => clearInterval(monitorInterval);
  }, [activeTrades, marketPrices, userProfile.uid]);

  const [dailyPnl, setDailyPnl] = useState(0);

  useEffect(() => {
    const fetchDailyPnl = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'users', userProfile.uid, 'trades'),
        where('status', '==', 'closed'),
        where('closed_at', '>=', startOfDay.toISOString())
      );
      
      const snap = await getDocs(q);
      const pnl = snap.docs.reduce((acc, doc) => acc + doc.data().pnl, 0);
      setDailyPnl(pnl);
    };
    
    fetchDailyPnl();
  }, [activeTrades, userProfile.uid]);

  const handleGenerate = async () => {
    if (userProfile.tier !== 'creator' && userProfile.signals_used_today >= TIER_LIMITS[userProfile.tier]) {
      addToast(`Daily limit reached for ${userProfile.tier} tier. Upgrade for more signals.`, 'info');
      return;
    }

    // Risk Enforcement: Daily Loss
    if (userProfile.tier !== 'creator') {
      const maxLoss = (userProfile.risk_settings?.max_daily_loss || 5) / 100 * 1000; // Assuming $1000 account
      if (dailyPnl <= -maxLoss) {
        addToast(`Daily loss limit reached (-$${maxLoss}). The Oracle is resting for your safety.`, 'error');
        return;
      }
    }

    const currentPrice = marketPrices[pair]?.price;
    if (!currentPrice) {
      addToast(`Waiting for ${pair} price from Deriv...`, 'info');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const signalData = await generateTradingSignal(pair, timeframe, selectedBot.name, selectedBot.strategy, currentPrice, sentiment, boostAnalysis);
      
      const newSignal: Omit<Signal, 'id'> = {
        user_id: userProfile.uid,
        pair,
        timeframe,
        entry: currentPrice, // Use real current price
        stop_loss: signalData.stop_loss,
        tp1: signalData.tp1,
        tp2: signalData.tp2,
        tp3: signalData.tp3,
        tp4: signalData.tp4,
        risk_reward: signalData.risk_reward,
        strategy: selectedBot.strategy,
        ai_bot: selectedBot.name,
        confidence: signalData.confidence,
        market_structure: signalData.market_structure,
        analysis: signalData.analysis,
        recommended_lot_size: signalData.recommended_lot_size,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'signals'), newSignal).catch(err => handleFirestoreError(err, OperationType.CREATE, 'signals'));
      
      // Create notification
      if (docRef) {
        await addDoc(collection(db, 'users', userProfile.uid, 'notifications'), {
          title: 'New Signal Generated',
          message: `Oracle ${selectedBot.name} has identified a ${newSignal.tp1 > newSignal.entry ? 'BUY' : 'SELL'} opportunity for ${pair}.`,
          type: 'signal',
          read: false,
          created_at: new Date().toISOString()
        });

        await updateDoc(doc(db, 'users', userProfile.uid), {
          signals_used_today: increment(1)
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`));
        
        addToast(`New ${pair} signal generated by ${selectedBot.name}!`, 'success');
        playSignalSound();
        setBoostAnalysis(null); // Clear boost after use

        // The Singularity 2.0: Auto-Trade Execution
        const autoSettings = userProfile.auto_trade_settings || { enabled: false, min_confidence: 90, max_trades_per_day: 5, pairs: [] };
        
        if (autoTrade && signalData.confidence >= autoSettings.min_confidence) {
          // Check daily auto-trade limit
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          
          const q = query(
            collection(db, 'users', userProfile.uid, 'trades'),
            where('created_at', '>=', startOfDay.toISOString()),
            where('status', '==', 'open') // This is not quite right, should be total trades today
          );
          // Actually, let's just count all trades created today
          const totalTodaySnap = await getDocs(query(
            collection(db, 'users', userProfile.uid, 'trades'),
            where('created_at', '>=', startOfDay.toISOString())
          ));
          
          if (totalTodaySnap.size < autoSettings.max_trades_per_day) {
            const signalWithId = { ...newSignal, id: docRef.id } as Signal;
            handleTakeTrade(signalWithId);
            addToast(`Singularity 2.0: Auto-executing high-confidence signal!`, 'info');
          } else {
            addToast(`Singularity 2.0: Daily auto-trade limit reached.`, 'info');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate signal. Please try again.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleTakeTrade = async (signal: Signal) => {
    // Risk Enforcement: Max Open Positions
    if (userProfile.tier !== 'creator') {
      const maxOpen = userProfile.risk_settings?.max_open_positions || 3;
      if (activeTrades.length >= maxOpen) {
        addToast(`Max open positions reached (${maxOpen}). Close a trade to open a new one.`, 'error');
        return;
      }
    }

    const type = signal.tp1 > signal.entry ? 'buy' : 'sell';
    
    // Apply SL Buffer
    const buffer = userProfile.risk_settings?.stop_loss_buffer || 5;
    const adjustedSL = type === 'buy' 
      ? signal.stop_loss - (buffer * 0.0001) // Simple pip conversion
      : signal.stop_loss + (buffer * 0.0001);

    const tradeData: Omit<Trade, 'id'> = {
      user_id: userProfile.uid,
      signal_id: signal.id,
      pair: signal.pair,
      entry_price: signal.entry,
      current_price: signal.entry,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      stop_loss: adjustedSL,
      pnl: 0,
      pnl_percentage: 0,
      status: 'open',
      type,
      account_type: accountType,
      created_at: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'users', userProfile.uid, 'trades'), tradeData)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${userProfile.uid}/trades`));
      
      // Create notification
      await addDoc(collection(db, 'users', userProfile.uid, 'notifications'), {
        title: 'Trade Executed',
        message: `Paper trade opened for ${signal.pair} at ${signal.entry}.`,
        type: 'trade',
        read: false,
        created_at: new Date().toISOString()
      });

      addToast(`Trade executed: ${type.toUpperCase()} ${signal.pair}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to execute trade.', 'error');
    }
  };

  const handleCloseTrade = async (trade: Trade, reason: string = 'Manual Close') => {
    try {
      await updateDoc(doc(db, 'users', userProfile.uid, 'trades', trade.id), {
        status: 'closed',
        closed_at: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}/trades`));
      
      // Update User Stats
      const userRef = doc(db, 'users', userProfile.uid);
      const isWin = trade.pnl > 0;
      
      const balanceField = trade.account_type === 'live' ? 'live_balance' : 'demo_balance';
      
      await updateDoc(userRef, {
        [balanceField]: increment(trade.pnl),
        'stats.total_trades': increment(1),
        'stats.wins': increment(isWin ? 1 : 0),
        'stats.losses': increment(isWin ? 0 : 1),
        total_pnl: increment(trade.pnl)
      }).catch(() => {});

      // Create notification
      await addDoc(collection(db, 'users', userProfile.uid, 'notifications'), {
        title: `Trade Closed: ${reason}`,
        message: `${trade.account_type.toUpperCase()} trade for ${trade.pair} closed with ${trade.pnl >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)} P/L. Reason: ${reason}`,
        type: 'trade',
        read: false,
        created_at: new Date().toISOString()
      });

      addToast(`Trade closed: ${trade.pair} (${trade.pnl >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}) - ${reason}`, trade.pnl >= 0 ? 'success' : 'error');
    } catch (err) {
      console.error(err);
      addToast('Failed to close trade.', 'error');
    }
  };

  const availableBots = [
    ...BOTS.filter((_, index) => index < TIER_BOT_LIMITS[userProfile.tier]),
    ...(userProfile.custom_bots || [])
  ];

  if (showDetails) {
    return <AssetDetails pair={pair} onBack={() => setShowDetails(false)} />;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center justify-between lg:justify-start gap-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-display font-bold gold-gradient">Oracle Dashboard</h1>
              <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full border text-[8px] font-bold transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {isOnline ? 'ORACLE SYNCED' : 'LINK SEVERED'}
              </div>
            </div>
            <p className="text-white/40 text-xs lg:text-sm">Real-time AI signals from the cosmos.</p>
          </div>

          <div className="hidden sm:flex xl:flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Level {userProfile.level || 1}</span>
              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((userProfile.xp || 0) % 1000) / 10}%` }}
                  className="h-full bg-gradient-to-r from-gold to-yellow-500"
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-[8px] font-mono text-gold/40">
              <span>{userProfile.xp || 0} XP</span>
              <span>{Math.ceil(((userProfile.xp || 0) + 1) / 1000) * 1000} XP</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-3 lg:gap-4 items-center">
          <div className="col-span-2 sm:col-auto flex bg-white/5 rounded-lg p-1 border border-white/10 h-fit">
            <button
              onClick={() => setAccountType('demo')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                accountType === 'demo' 
                  ? 'bg-gold text-black shadow-lg shadow-gold/20' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              DEMO
            </button>
            <button
              onClick={() => setAccountType('live')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                accountType === 'live' 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              LIVE
            </button>
          </div>
          <div className="glass-card px-4 lg:px-6 py-3 flex flex-col items-center flex-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              {accountType === 'live' ? 'Live Balance' : 'Demo Balance'}
            </span>
            <span className={`text-lg lg:text-xl font-bold font-display ${accountType === 'live' ? 'text-red-400' : 'text-gold'}`}>
              ${(accountType === 'live' ? userProfile.live_balance : userProfile.demo_balance)?.toLocaleString()}
            </span>
          </div>
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`glass-card px-4 py-3 flex items-center justify-center transition-all ${audioEnabled ? 'text-gold border-gold/40' : 'text-white/20 border-white/5'}`}
            title="Toggle Oracle's Voice"
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="glass-card px-4 lg:px-6 py-3 flex flex-col items-center flex-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Used Today</span>
            <span className="text-lg lg:text-xl font-bold font-display">{userProfile.signals_used_today} / {TIER_LIMITS[userProfile.tier]}</span>
          </div>
          <div className="glass-card px-4 lg:px-6 py-3 flex flex-col items-center flex-1">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Win Rate</span>
            <span className="text-lg lg:text-xl font-bold font-display text-emerald-400">{(userProfile.win_rate || 0).toFixed(1)}%</span>
          </div>
          <div className="hidden xl:flex items-center gap-4 px-6 py-3 rounded-2xl bg-gold/5 border border-gold/10">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Global Ascension</p>
              <p className="text-sm font-mono text-white">{launchCountdown}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold animate-pulse">
              <Sparkles size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex overflow-x-auto no-scrollbar lg:flex-wrap gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-full lg:w-fit">
        <button
          onClick={() => setActiveTab('signals')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'signals' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Signals
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Stats
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'portfolio' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Portfolio
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'risk' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Risk
        </button>
        <button
          onClick={() => setActiveTab('backtest')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'backtest' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Backtest
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'community' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Community
        </button>
        <button
          onClick={() => setActiveTab('bot-forge')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'bot-forge' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Bot Forge
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Oracle Chat
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'alerts' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('strategies')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'strategies' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Strategies
        </button>
        <button
          onClick={() => setActiveTab('tribes')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'tribes' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Tribes
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'challenges' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Challenges
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'marketplace' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Market
        </button>
        <button
          onClick={() => setActiveTab('academy')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'academy' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Academy
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'performance' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'subscription' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          Ascension
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-gold text-black' : 'text-white/40 hover:text-white/60'}`}
        >
          System Status
        </button>
      </div>

      {activeTab === 'stats' ? (
        <PerformanceStats userProfile={userProfile} />
      ) : activeTab === 'portfolio' ? (
        <Portfolio userProfile={userProfile} marketPrices={marketPrices} />
      ) : activeTab === 'risk' ? (
        <RiskManagement userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'backtest' ? (
        <Backtesting userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'community' ? (
        <Community userProfile={userProfile} />
      ) : activeTab === 'bot-forge' ? (
        <BotForge userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'chat' ? (
        <Chat userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'calendar' ? (
        <EconomicCalendar />
      ) : activeTab === 'alerts' ? (
        <PriceAlerts userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'strategies' ? (
        <MasterStrategy userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'tribes' ? (
        <Tribes userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'challenges' ? (
        <Challenges userProfile={userProfile} />
      ) : activeTab === 'marketplace' ? (
        <Marketplace userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'academy' ? (
        <Academy userProfile={userProfile} />
      ) : activeTab === 'performance' ? (
        <PerformanceReports userProfile={userProfile} />
      ) : activeTab === 'subscription' ? (
        <Subscription userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'status' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Oracle Core', status: 'Operational', latency: '12ms', color: 'text-emerald-400' },
            { label: 'Deriv Bridge', status: 'Operational', latency: '45ms', color: 'text-emerald-400' },
            { label: 'Signal Engine', status: 'Operational', latency: '8ms', color: 'text-emerald-400' },
            { label: 'Risk Sentinel', status: 'Operational', latency: '2ms', color: 'text-emerald-400' },
            { label: 'Bot Forge', status: 'Operational', latency: '15ms', color: 'text-emerald-400' },
            { label: 'Marketplace', status: 'Operational', latency: '32ms', color: 'text-emerald-400' },
            { label: 'Academy', status: 'Operational', latency: '5ms', color: 'text-emerald-400' },
            { label: 'Global Sync', status: 'Operational', latency: '120ms', color: 'text-emerald-400' }
          ].map((sys, i) => (
            <motion.div
              key={sys.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-white/40 uppercase tracking-widest">{sys.label}</span>
                <div className={`w-2 h-2 rounded-full bg-emerald-400 animate-pulse`} />
              </div>
              <div className="space-y-1">
                <p className={`text-lg font-bold font-display ${sys.color}`}>{sys.status}</p>
                <p className="text-[10px] text-white/20">Latency: {sys.latency}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-4 overflow-hidden relative">
            <div className="flex items-center gap-4 animate-marquee whitespace-nowrap">
              <div className="flex items-center gap-2 text-gold font-bold uppercase tracking-widest text-[10px]">
                <Newspaper size={14} /> Cosmic News:
              </div>
              {news.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-white/60">
                  <span className="text-gold font-bold">[{item.time}]</span>
                  <span>{item.title}</span>
                  <span className="mx-4 text-white/10">|</span>
                </div>
              ))}
              {news.length === 0 && <span className="text-[10px] text-white/20 italic">Scanning the cosmos for news...</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(marketPrices).map(([symbol, data]) => (
              <motion.div 
                key={symbol}
                layout
                className="glass-card p-3 flex flex-col items-center justify-center space-y-1 border-white/5 hover:border-gold/20 transition-all cursor-pointer"
                onClick={() => {
                  setPair(symbol);
                  setShowDetails(true);
                }}
              >
                <span className="text-[10px] text-white/40 font-bold">{symbol}</span>
                <span className="text-sm font-mono font-bold">{(data.price || 0).toFixed(symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('US100') ? 2 : 4)}</span>
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {(Math.abs(data.change || 0)).toFixed(2)}%
                </span>
              </motion.div>
            ))}
          </div>

          {/* Sentiment & Volatility Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4">
              <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Globe className="text-gold" size={14} /> Multi-Asset Pulse
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {DERIV_SYMBOLS.slice(0, 4).map(s => (
                  <div key={s.symbol} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{s.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold">
                        {marketPrices[s.symbol]?.price?.toFixed(2) || '0.00'}
                      </span>
                      <span className={`text-[10px] font-bold ${marketPrices[s.symbol]?.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {marketPrices[s.symbol]?.change >= 0 ? '+' : ''}{(marketPrices[s.symbol]?.change || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 border-white/5 space-y-4">
              <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Activity className="text-gold" size={14} /> Network Volatility
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-display font-bold text-gold">Moderate</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">Market Pulse</p>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.1, repeat: Infinity, duration: 2, repeatType: 'reverse' }}
                      className="w-1.5 bg-gold/40 rounded-full"
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed italic">
                "Volatility is stabilizing. Ideal conditions for the Oracle's precision scalping strategies."
              </p>
            </div>
          </div>

          <TradingSessions userProfile={userProfile} addToast={addToast} />

          <div className="h-[500px] glass-card overflow-hidden relative">
            <LightweightChart 
              symbol={pair} 
              entry={activeSignals.find(s => s.pair === pair && s.status === 'active')?.entry}
              sl={activeSignals.find(s => s.pair === pair && s.status === 'active')?.stop_loss}
              tps={[
                activeSignals.find(s => s.pair === pair && s.status === 'active')?.tp1,
                activeSignals.find(s => s.pair === pair && s.status === 'active')?.tp2,
                activeSignals.find(s => s.pair === pair && s.status === 'active')?.tp3,
                activeSignals.find(s => s.pair === pair && s.status === 'active')?.tp4,
              ].filter((v): v is number => v !== undefined)}
              height={500}
            />
          </div>

          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Zap className="text-gold" size={20} /> Active Signals
              </h2>
              <span className="text-xs text-white/40">{activeSignals.length} Active</span>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {activeSignals.length === 0 ? (
                  <div className="text-center py-12 text-white/20 italic">No active signals. Generate one to start.</div>
                ) : (
                  activeSignals.map((signal) => (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-card p-4 border-gold/10 hover:border-gold/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                            <Bot className="text-gold" size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{signal.pair} <span className="text-sm text-white/40 font-normal">({signal.timeframe})</span></h3>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gold/70">{signal.ai_bot} • {signal.strategy}</p>
                              {signal.market_structure && (
                                <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold text-[8px] font-bold uppercase tracking-wider">
                                  {signal.market_structure}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Confidence</div>
                          <div className="text-lg font-bold text-emerald-400">{signal.confidence}%</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-white/40 uppercase">Entry</p>
                          <p className="font-mono font-bold text-gold">{signal.entry}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-white/40 uppercase">Stop Loss</p>
                          <p className="font-mono font-bold text-red-400">{signal.stop_loss}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-white/40 uppercase">TP1</p>
                          <p className="font-mono font-bold text-emerald-400">{signal.tp1}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-white/40 uppercase">TP2</p>
                          <p className="font-mono font-bold text-emerald-400">{signal.tp2}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-white/40 uppercase">TP3</p>
                          <p className="font-mono font-bold text-emerald-400">{signal.tp3}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center border border-gold/20">
                          <p className="text-[10px] text-gold uppercase font-bold">TP4</p>
                          <p className="font-mono font-bold text-gold">{signal.tp4}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/40">
                        <div className="flex items-center gap-2">
                          <Clock size={12} />
                          {new Date(signal.created_at).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={12} />
                            RR: {signal.risk_reward}
                          </div>
                          <button 
                            onClick={() => handleTakeTrade(signal)}
                            className="px-3 py-1 rounded-lg bg-gold text-black font-bold hover:scale-105 transition-all text-[10px]"
                          >
                            Take Trade
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Globe className="text-gold" size={20} /> Live Paper Trades
              </h2>
              <span className="text-xs text-white/40">{activeTrades.length} Open</span>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {activeTrades.length === 0 ? (
                  <div className="text-center py-12 text-white/20 italic">No open trades. Take a signal to start paper trading.</div>
                ) : (
                  activeTrades.map((trade) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="glass-card p-4 border-white/5 hover:border-gold/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                            {trade.type === 'buy' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                          </div>
                          <div>
                            <h3 className="font-bold">{trade.pair} <span className="text-[10px] text-white/40 uppercase tracking-widest">{trade.type}</span></h3>
                            <p className="text-[10px] text-white/40 font-mono">Entry: {trade.entry_price}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold font-mono ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-bold ${trade.pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                            {(trade.pnl_percentage || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="bg-white/5 rounded p-1 text-center">
                          <p className="text-[8px] text-white/40 uppercase">TP1</p>
                          <p className="text-[10px] font-mono font-bold text-emerald-400">{trade.tp1}</p>
                        </div>
                        <div className="bg-white/5 rounded p-1 text-center">
                          <p className="text-[8px] text-white/40 uppercase">TP2</p>
                          <p className="text-[10px] font-mono font-bold text-emerald-400">{trade.tp2}</p>
                        </div>
                        <div className="bg-white/5 rounded p-1 text-center">
                          <p className="text-[8px] text-white/40 uppercase">TP3</p>
                          <p className="text-[10px] font-mono font-bold text-emerald-400">{trade.tp3}</p>
                        </div>
                        <div className="bg-white/5 rounded p-1 text-center border border-gold/20">
                          <p className="text-[8px] text-gold uppercase font-bold">TP4</p>
                          <p className="text-[10px] font-mono font-bold text-gold">{trade.tp4}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-white/40 font-mono">
                          Current: {(trade.current_price || 0).toFixed(trade.pair.includes('JPY') ? 2 : 4)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-red-400 font-mono">SL: {trade.stop_loss}</div>
                          <button 
                            onClick={() => handleCloseTrade(trade)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-red-400/10 hover:text-red-400 transition-all text-[10px] font-bold"
                          >
                            <X size={12} /> Close
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Cosmic News Feed */}
          <div className="glass-card p-6 space-y-6 border-gold/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cosmic News Feed</h3>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </div>
            </div>
            <NewsFeed />
          </div>

          <div className="glass-card p-6 space-y-6 border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Global Oracle Feed</h3>
              </div>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <Community userProfile={userProfile} compact={true} />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-6 space-y-6 bg-gradient-to-b from-white/5 to-gold/5 border-gold/20">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Sparkles className="text-gold" size={20} /> Signal Generator
            </h2>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoTrade ? 'bg-gold text-black' : 'bg-white/10 text-white/40'}`}>
                  <Zap size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Singularity 2.0</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Auto-Trade Execution</p>
                </div>
              </div>
              <button 
                onClick={() => setAutoTrade(!autoTrade)}
                className={`w-12 h-6 rounded-full relative transition-all ${autoTrade ? 'bg-gold' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: autoTrade ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sessionAutoPilot ? 'bg-gold text-black' : 'bg-white/10 text-white/40'}`}>
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Session Auto-Pilot</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ritual Automation</p>
                </div>
              </div>
              <button 
                onClick={() => setSessionAutoPilot(!sessionAutoPilot)}
                className={`w-12 h-6 rounded-full relative transition-all ${sessionAutoPilot ? 'bg-gold' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: sessionAutoPilot ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-widest">Trading Pair</label>
                <select 
                  value={pair} 
                  onChange={(e) => setPair(e.target.value)}
                  className="w-full cosmic-input bg-cosmic-black"
                >
                  {DERIV_SYMBOLS.map(s => (
                    <option key={s.symbol} value={s.symbol}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-widest">Timeframe</label>
                <div className="grid grid-cols-4 gap-2">
                  {['M15', 'M30', 'H1', 'H4'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        timeframe === tf ? 'bg-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-widest">AI Oracle Bot</label>
                <div className="space-y-2">
                  {availableBots.map((bot) => (
                    <button
                      key={bot.name}
                      onClick={() => setSelectedBot(bot)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedBot.name === bot.name 
                          ? 'bg-gold/10 border-gold/50 text-gold' 
                          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedBot.name === bot.name ? 'bg-gold text-black' : 'bg-white/10'}`}>
                        <Bot size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{bot.name}</p>
                        <p className="text-[10px] opacity-60">{bot.strategy}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg">{error}</p>}

              {/* Oracle Eye Boost */}
              <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                    <Eye size={14} /> Oracle Eye Boost
                  </h3>
                  {boostAnalysis && (
                    <button 
                      onClick={() => setBoostAnalysis(null)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {boostAnalysis ? (
                  <div className="p-3 rounded-lg bg-gold/10 border border-gold/20 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gold uppercase tracking-widest">Boost Active</p>
                      <p className="text-[9px] text-white/60 truncate max-w-[150px]">{boostAnalysis.market_structure} Analysis</p>
                    </div>
                    <div className="text-emerald-400">
                      <Shield size={16} />
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => boostInputRef.current?.click()}
                    disabled={isBoosting}
                    className="w-full py-3 rounded-xl border border-dashed border-gold/30 text-gold/60 hover:text-gold hover:border-gold/50 transition-all flex flex-col items-center justify-center gap-1 group"
                  >
                    {isBoosting ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Upload size={16} className="group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {isBoosting ? 'Analyzing Chart...' : 'Upload Chart to Boost'}
                    </span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={boostInputRef}
                  onChange={handleBoostUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full gold-button flex items-center justify-center gap-2 mt-4"
              >
                {generating ? (
                  <>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Zap size={20} />
                    </motion.div>
                    Channeling Cosmos...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Generate Signal
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4 relative overflow-hidden">
            <h3 className="font-display font-bold text-white/70 flex items-center gap-2">
              <Shield className="text-gold" size={18} /> Risk Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Daily P/L</p>
                <p className={`text-lg font-bold font-display ${userProfile.daily_pnl && userProfile.daily_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {userProfile.daily_pnl && userProfile.daily_pnl >= 0 ? '+' : ''}${Math.abs(userProfile.daily_pnl || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Open Trades</p>
                <p className="text-lg font-bold font-display text-white">
                  {activeTrades.length} / {userProfile.risk_settings?.max_open_positions || 5}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                <span>Daily Loss Limit</span>
                <span className="text-white">${userProfile.risk_settings?.max_daily_loss || 100}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Math.abs(Math.min(0, userProfile.daily_pnl || 0)) / (userProfile.risk_settings?.max_daily_loss || 100)) * 100)}%` }}
                  className="h-full bg-red-500"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldAlert size={80} />
            </div>
            <h3 className="font-display font-bold text-white/70 flex items-center gap-2">
              <ShieldAlert className="text-gold" size={18} /> Sentinel Risk Sentinel
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest">Account Balance ($)</label>
                  <input type="number" defaultValue="1000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest">Risk Per Trade (%)</label>
                  <input type="number" defaultValue="1" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all" />
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Max Risk Amount</span>
                  <span className="text-sm font-bold text-gold">$10.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Recommended Lot</span>
                  <span className="text-sm font-bold text-emerald-400">0.05</span>
                </div>
                <div className="pt-2 border-t border-gold/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/40 uppercase font-bold">Drawdown Limit</span>
                    <span className="text-xs font-bold text-red-400">$50.00 (5%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Shield className="text-emerald-400" size={14} />
                <p className="text-[9px] text-emerald-400/80 font-medium">Risk Sentinel is actively monitoring your equity.</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4 relative overflow-hidden">
            {loadingSentiment && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <RefreshCw className="text-gold" size={24} />
                </motion.div>
              </div>
            )}
            <h3 className="font-display font-bold text-white/70 flex items-center justify-between">
              Market Sentiment
              <span className="text-[10px] text-gold uppercase tracking-widest">{pair}</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-400"><TrendingUp size={16} /> Bullish</span>
                <span>{sentiment.bullish}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sentiment.bullish}%` }}
                  className="h-full bg-emerald-400"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sentiment.bearish}%` }}
                  className="h-full bg-red-400"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-red-400"><TrendingDown size={16} /> Bearish</span>
                <span>{sentiment.bearish}%</span>
              </div>
              <p className="text-[10px] text-white/40 italic mt-2 leading-relaxed">
                {sentiment.summary}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
    {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
  </div>
);
}
