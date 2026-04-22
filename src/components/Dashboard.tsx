import { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { where, orderBy, limit } from 'firebase/firestore';
import { calculateAutoLotSize, evaluateCapitalSafety } from '../lib/tradeUtils';
import { BehavioralService } from '../services/behavioralService';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile, Signal, Trade, BOTS, TIER_LIMITS, TIER_BOT_LIMITS, PriceAlert, MarketNews, Tier, hasTierAccess } from '../types';
import { DERIV_SYMBOLS } from '../constants';
import { generateTradingSignal, getMarketSentiment, analyzeChartImage, getMarketNews } from '../services/aiService';
import { derivService, DerivTick } from '../services/derivService';
import { Zap, TrendingUp, TrendingDown, Target, ShieldAlert, Clock, BarChart3, Bot, Sparkles, RefreshCw, Globe, ArrowUpRight, ArrowDownRight, X, Activity, Volume2, VolumeX, Newspaper, Eye, Upload, Loader2, Shield, Calendar, Bell, Wifi, WifiOff, Lock, Palette } from 'lucide-react';
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
import { IntelligenceCore } from './IntelligenceCore';
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
import MarketPulse from './MarketPulse';
import Subscription from './Subscription';

import { THEMES } from '../constants/themes';
import { AppTheme } from '../types';
import { getBotCharacter } from '../lib/themeUtils';

import { useMarketContext } from '../MarketContext';

interface DashboardProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleCloseTrade: (trade: Trade, reason?: string) => Promise<void>;
}

import { memo } from 'react';

import { speak } from '../lib/voice';

const MarketPriceCard = memo(({ symbol, data, onSelect }: { symbol: string, data: any, onSelect: (symbol: string) => void }) => {
  return (
    <div 
      className="glass-card p-2 sm:p-3 flex flex-col items-center justify-center space-y-1 border-white/5 hover:border-gold/20 transition-all cursor-pointer min-w-0"
      onClick={() => onSelect(symbol)}
    >
      <span className="text-[8px] sm:text-[10px] text-white/40 font-bold truncate w-full text-center">{symbol}</span>
      <span className="text-[10px] sm:text-sm font-mono font-bold">{(data.price || 0).toFixed(symbol.includes('JPY') || symbol.includes('BTC') || symbol.includes('OTC') || symbol.includes('ETH') ? 2 : 4)}</span>
      <span className={`text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {data.change >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
        {(Math.abs(data.change || 0)).toFixed(2)}%
      </span>
    </div>
  );
});

const MarketPriceGrid = memo(({ marketPrices, onSelect }: { marketPrices: Record<string, any>, onSelect: (symbol: string) => void }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-4">
      {Object.entries(marketPrices).map(([symbol, data]) => (
        <MarketPriceCard key={symbol} symbol={symbol} data={data} onSelect={onSelect} />
      ))}
    </div>
  );
});

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

export default function Dashboard({ userProfile, addToast, handleCloseTrade }: DashboardProps) {
  const { marketPrices } = useMarketContext();
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [pair, setPair] = useState('CRASH500');
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'stats' | 'portfolio' | 'backtest' | 'risk' | 'community' | 'bot-forge' | 'chat' | 'calendar' | 'alerts' | 'strategies' | 'tribes' | 'challenges' | 'marketplace' | 'academy' | 'status' | 'performance' | 'subscription' | 'intelligence'>('signals');
  const [accountType, setAccountType] = useState<'demo' | 'live'>(userProfile.tier === 'free' ? 'demo' : (userProfile.account_type || 'demo'));
  const [ghostMode, setGhostMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [launchCountdown, setLaunchCountdown] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const theme = THEMES.find(t => t.id === (userProfile.theme || 'cosmic')) || THEMES[0];

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--theme-light', theme.colors.secondary);
    document.documentElement.style.setProperty('--theme-dark', theme.colors.accent);
    document.documentElement.style.setProperty('--theme-bg', theme.colors.background);
  }, [theme]);

  const availableBots = BOTS.filter(bot => hasTierAccess(userProfile.tier, bot.tier_requirement));
  const customBots = userProfile.custom_bots || [];
  const allAvailableBots = [...availableBots, ...customBots];

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
    // Initial fetch
    const fetchAlerts = async () => {
      try {
        const data = await dbService.list('alerts', [
          where('uid', '==', userProfile.uid),
          where('active', '==', true)
        ]);
        setActiveAlerts(data as PriceAlert[]);
      } catch (error) {
         console.error("Fetch alerts failed", error);
      }
    };

    fetchAlerts();

    // Subscribe to changes
    const unsubscribe = dbService.subscribeCollection('alerts', [
      where('uid', '==', userProfile.uid),
      where('active', '==', true)
    ], (data) => {
      setActiveAlerts(data as PriceAlert[]);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  const marketPricesRef = useRef(marketPrices);
  useEffect(() => {
    marketPricesRef.current = marketPrices;
  }, [marketPrices]);

  useEffect(() => {
    if (activeAlerts.length === 0) return;

    const alertInterval = setInterval(() => {
      const currentPrices = marketPricesRef.current;
      
      activeAlerts.forEach(async (alert) => {
        const currentPrice = currentPrices[alert.pair]?.price;
        if (!currentPrice) return;

        const triggered = alert.condition === 'above' 
          ? currentPrice >= alert.price 
          : currentPrice <= alert.price;

        if (triggered) {
          addToast(`Price Alert: ${alert.pair} is ${alert.condition} ${alert.price}!`, 'success');
          
          try {
            // Deactivate alert
            await dbService.update('alerts', alert.id, { active: false });

            // Create notification
            await dbService.create('notifications', {
                uid: userProfile.uid,
                title: 'Price Alert Triggered',
                message: `${alert.pair} has reached your target of ${alert.price}.`,
                type: 'system',
                read: false,
                created_at: new Date().toISOString()
            });
          } catch (err) {
            console.error("Alert trigger processing failed", err);
          }
        }
      });
    }, 5000); // Check alerts every 5 seconds

    return () => clearInterval(alertInterval);
  }, [activeAlerts, userProfile.uid, addToast]);
  const [timeframe, setTimeframe] = useState('H1');
  const [selectedBot, setSelectedBot] = useState(allAvailableBots[0]);
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

  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const [sentimentData, newsData] = await Promise.all([
        getMarketSentiment(pair),
        getMarketNews(pair)
      ]);
      setSentiment(sentimentData);
      setNews(newsData);
      addToast('Celestial Alignment Complete. Market data synchronized.', 'success');
    } catch (err) {
      addToast('Cosmic interference during synchronization.', 'error');
    } finally {
      setTimeout(() => setSyncing(false), 1500); 
    }
  };

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
    // Initial fetch
    const fetchSignals = async () => {
      try {
        const data = await dbService.list('signals', [
          where('uid', '==', userProfile.uid),
          where('status', '==', 'active'),
          orderBy('created_at', 'desc'),
          limit(10)
        ]);
        setActiveSignals(data as Signal[]);
      } catch (error) {
        console.error("Fetch signals failed", error);
      }
    };

    fetchSignals();

    // Subscribe to changes
    const unsubscribe = dbService.subscribeCollection('signals', [
      where('uid', '==', userProfile.uid),
      where('status', '==', 'active'),
      orderBy('created_at', 'desc'),
      limit(10)
    ], (data) => {
      setActiveSignals(data as Signal[]);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  useEffect(() => {
    // Initial fetch
    const fetchTrades = async () => {
      try {
        const data = await dbService.list('trades', [
          where('uid', '==', userProfile.uid),
          where('status', '==', 'open'),
          orderBy('created_at', 'desc')
        ]);
        setActiveTrades(data as Trade[]);
      } catch (error) {
        console.error("Fetch trades failed", error);
      }
    };

    fetchTrades();

    // Subscribe to changes
    const unsubscribe = dbService.subscribeCollection('trades', [
      where('uid', '==', userProfile.uid),
      where('status', '==', 'open'),
      orderBy('created_at', 'desc')
    ], (data) => {
      setActiveTrades(data as Trade[]);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  // The Singularity: Automated Signal & Trade Monitoring
  // Handled by useTradeMonitor hook now for better performance and real-time updates

  const [dailyPnl, setDailyPnl] = useState(0);

  useEffect(() => {
    const fetchDailyPnl = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('trades')
        .select('pnl')
        .eq('uid', userProfile.uid)
        .eq('status', 'closed')
        .gte('closed_at', startOfDay.toISOString());
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'trades');
      } else {
        const pnl = (data || []).reduce((acc, trade) => acc + (trade.pnl || 0), 0);
        setDailyPnl(pnl);
      }
    };
    
    fetchDailyPnl();
  }, [activeTrades.length, userProfile.uid]);

  const handleGenerate = async () => {
    // PART 2: LOSS CONTROL SYSTEM
    if (userProfile.tier !== 'creator' && userProfile.consecutive_losses >= 3) {
        addToast("Hard Pause active. Zion protocols require evaluation after 3 consecutive losses.", 'error');
        return;
    }

    if (userProfile.tier !== 'creator' && userProfile.signals_used_today >= TIER_LIMITS[userProfile.tier]) {
      addToast(`Ascension Limit: Daily limit reached for ${userProfile.tier} tier. Upgrade for more signals.`, 'info');
      return;
    }

    // Risk Enforcement: Daily Loss
    if (userProfile.tier !== 'creator') {
      const balance = userProfile.account_type === 'live' ? userProfile.live_balance : userProfile.demo_balance;
      const maxLossPercent = userProfile.risk_settings?.max_daily_loss || 5;
      const maxLoss = (maxLossPercent / 100) * balance;
      if (dailyPnl <= -maxLoss) {
        addToast(`System Guard: Daily loss limit reached (-$${maxLoss.toFixed(2)}). The Oracle has closed the portal for your safety.`, 'error');
        return;
      }
    }

    const currentPrice = marketPrices[pair]?.price || getFallbackPrice(pair);

    setGenerating(true);
    setError('');
    try {
      const signalData = await generateTradingSignal(pair, timeframe, selectedBot, currentPrice, sentiment, boostAnalysis);
      
      // Phase 4: SIGNAL ENGINE (STRICT FILTER)
      const hasStructure = signalData.bos_detected || signalData.choch_detected || !!signalData.market_structure;
      const hasLiquidity = signalData.liquidity_swept || signalData.analysis?.toLowerCase().includes('liquidity');
      const hasSession = !!signalData.session_timing;
      const hasTimeframeAlignment = !!(signalData as any).timeframe_alignment;
      
      if (!hasStructure || !hasLiquidity || !hasSession || !hasTimeframeAlignment) {
          addToast("The Omni Core rejected the signal: Missing critical institutional confluence (Structure/Liquidity/Session). Capital protected.", "error");
          setGenerating(false);
          return;
      }
      
      const newSignal: Omit<Signal, 'id'> = {
        uid: userProfile.uid,
        pair,
        timeframe,
        entry: currentPrice,
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
        liquidity_presence: signalData.liquidity_swept,
        session_timing: signalData.session_timing,
        timeframe_alignment: (signalData as any).timeframe_alignment,
        order_type: (signalData as any).order_type,
        execution: (signalData as any).execution,
        risk_percent: (signalData as any).risk_percent,
        analysis: signalData.analysis,
        recommended_lot_size: signalData.recommended_lot_size,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const signalResult = await dbService.create('signals', newSignal);
      
      if (signalResult) {
        // Create notification
        await dbService.create('notifications', {
            uid: userProfile.uid,
            title: 'Celestial Signal Received',
            message: `Oracle ${selectedBot.name} detected a ${newSignal.tp1 > newSignal.entry ? 'BUY' : 'SELL'} setup for ${pair}. Confidence: ${signalData.confidence}%`,
            type: 'signal',
            read: false,
            created_at: new Date().toISOString()
        });

        // Update signals used today
        await dbService.update('users', userProfile.uid, {
            signals_used_today: (userProfile.signals_used_today || 0) + 1
        });
        
        addToast(`Dimension Sync: New ${pair} signal generated by ${selectedBot.name}!`, 'success');
        const oracleChar = getBotCharacter('Oracle', userProfile.theme);
        speak(`The Oracle has spoken. High-precision signal generated for ${pair.replace('frx', '').replace('R_', 'Volatility ')}.`, userProfile.notification_settings.sound, oracleChar);
        playSignalSound();
        setBoostAnalysis(null);

        // Auto-Trade Execution
        const autoSettings = userProfile.auto_trade_settings || { enabled: false, min_confidence: 90, max_trades_per_day: 5, pairs: [] };
        
        if (autoTrade && signalData.confidence >= autoSettings.min_confidence) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          
          const tradesToday = await dbService.list('trades', [
              where('uid', '==', userProfile.uid),
              where('created_at', '>=', startOfDay.toISOString())
          ]);
          
          if (tradesToday.length < autoSettings.max_trades_per_day) {
            handleTakeTrade({ id: signalResult as string, ...newSignal } as Signal);
            addToast(`Singularity 2.0: Auto-executing high-confidence signal!`, 'info');
          } else {
            addToast(`Singularity 2.0: Daily auto-trade limit reached.`, 'info');
          }
        }
      }
    } catch (err: any) {
      console.error("Signal generation error:", err);
      setError(err.message || 'The Oracle is silent. Dimension connection issues.');
    } finally {
      setGenerating(false);
    }
  };

  const handleTakeTrade = async (signal: Signal) => {
    // PART 2: CAPITAL PROTECTION ENGINE
    const safety = evaluateCapitalSafety(userProfile, activeTrades.length);
    if (!safety.safe && userProfile.tier !== 'creator') {
        addToast(safety.reason || "Capital protection active. Position blocked.", 'error');
        return;
    }

    // PART 3: ANTI-LOSS ENGINE (Revenge Trading Check)
    if (userProfile.tier !== 'creator') {
        const lastTrades = await dbService.list('trades', [
            where('uid', '==', userProfile.uid),
            where('status', '==', 'closed'),
            orderBy('closed_at', 'desc'),
            limit(1)
        ]) as any[];

        if (lastTrades.length > 0) {
            const isRevenge = await BehavioralService.detectRevengeTrading(userProfile.uid, lastTrades[0].pnl);
            // PHASE 12: PSYCHOLOGY ENGINE
            if (isRevenge || (userProfile.consecutive_losses && userProfile.consecutive_losses >= 3 && lastTrades[0].pnl < 0)) {
                addToast("Psychology Engine: Fear/Revenge pattern detected. Forced correction applied. Portal locked for 15 minutes of meditation.", "error");
                await BehavioralService.triggerCooldown(userProfile.uid, "Revenge/Fear Trading Pattern");
                return;
            }
        }
    }

    const type = signal.tp1 > signal.entry ? 'buy' : 'sell';
    
    // Apply SL Buffer
    const buffer = userProfile.risk_settings?.stop_loss_buffer || 5;
    const adjustedSL = type === 'buy' 
      ? signal.stop_loss - (buffer * 0.0001) 
      : signal.stop_loss + (buffer * 0.0001);

    // PART 2: AUTO LOT SIZE ENGINE
    const balance = accountType === 'live' ? userProfile.live_balance : userProfile.demo_balance;
    const riskPercent = userProfile.risk_settings?.risk_per_trade || 1;
    const autoLotSize = calculateAutoLotSize(balance, riskPercent, signal.entry, adjustedSL);

    const tradeData: Omit<Trade, 'id'> = {
      uid: userProfile.uid,
      signal_id: signal.id,
      pair: signal.pair,
      entry_price: signal.entry,
      current_price: signal.entry,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      active_tp: 3, // Setup active TP logic Default
      stop_loss: adjustedSL,
      pnl: 0,
      pnl_percentage: 0,
      lot_size: autoLotSize,
      status: 'open',
      type,
      account_type: ghostMode ? 'demo' : accountType, // PART 17: GHOST MODE
      created_at: new Date().toISOString(),
      is_ghost: ghostMode
    };

    try {
      await dbService.create('trades', tradeData);
      
      // Create notification
      await dbService.create('notifications', {
          uid: userProfile.uid,
          title: 'Trade Executed',
          message: `Portal opened for ${signal.pair} at ${signal.entry}. Lot Size: ${autoLotSize}`,
          type: 'trade',
          read: false,
          created_at: new Date().toISOString()
      });

      addToast(`Trade executed: ${type.toUpperCase()} ${signal.pair} (Lot: ${autoLotSize})`, 'success');

      // PART 15: SIGNAL STREAMING
      if (signal.confidence > 85) {
          console.log(`[Streaming] Transmitting high-confidence signal for ${signal.pair} to internal APIs...`);
          // Mock Telegram/WhatsApp webhook logic
      }
    } catch (err) {
      console.error("Execution failed", err);
      addToast('Failed to execute trade.', 'error');
    }
  };

  const handleThemeChange = async (themeId: AppTheme) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ theme: themeId })
        .eq('uid', userProfile.uid);
      
      if (error) throw error;

      addToast(`Aura updated: ${THEMES.find(t => t.id === themeId)?.name}`, 'success');
      setShowThemeSelector(false);
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, 'users');
      addToast('Failed to update aura.', 'error');
    }
  };

  if (showDetails) {
    return <AssetDetails pair={pair} onBack={() => setShowDetails(false)} userProfile={userProfile} />;
  }

  return (
    <div className="space-y-8">
      {/* Celestial Alignment Overlay */}
      <AnimatePresence>
        {syncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-64 h-64 rounded-full border border-gold/20 flex items-center justify-center"
              >
                <div className="w-48 h-48 rounded-full border border-gold/40 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-gold/60 flex items-center justify-center">
                    <Zap className="text-gold animate-pulse" size={48} />
                  </div>
                </div>
              </motion.div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gold/5 rounded-full blur-3xl"
              />
            </div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-display font-bold gold-gradient mt-12"
            >
              Celestial Alignment
            </motion.h2>
            <p className="text-white/40 uppercase tracking-[0.3em] text-xs mt-4">Synchronizing with the Zion Network</p>
          </motion.div>
        )}
      </AnimatePresence>
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
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 h-fit flex-1 sm:flex-none">
            <button
              onClick={handleManualSync}
              className="px-3 py-1.5 rounded-md text-[10px] font-bold text-gold hover:bg-gold/10 transition-all flex items-center gap-2"
              title="Manual Sync"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              SYNC
            </button>
            <div className="w-px h-4 bg-white/10 my-auto mx-1" />
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
              onClick={() => {
                if (hasTierAccess(userProfile.tier, 'oracle')) {
                  setAccountType('live');
                } else {
                  addToast('Live Account Trading requires Oracle Tier or higher.', 'info');
                  setActiveTab('subscription');
                }
              }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                accountType === 'live' 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'text-white/40 hover:text-white/60'
              } ${!hasTierAccess(userProfile.tier, 'oracle') ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <button 
            onClick={() => setShowThemeSelector(true)}
            className="glass-card px-4 py-3 flex items-center justify-center transition-all text-white/40 hover:text-gold border-white/5 hover:border-gold/40"
            title="Aura & Theme"
          >
            <Palette size={20} />
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
        {[
          { id: 'signals', label: 'Signals' },
          { id: 'stats', label: 'Stats' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'risk', label: 'Risk' },
          { id: 'backtest', label: 'Backtest' },
          { id: 'community', label: 'Community' },
          { id: 'bot-forge', label: 'Bot Forge', requiredTier: 'zion' },
          { id: 'chat', label: 'Oracle Chat', requiredTier: 'oracle' },
          { id: 'calendar', label: 'Calendar', requiredTier: 'oracle' },
          { id: 'alerts', label: 'Alerts' },
          { id: 'strategies', label: 'Strategies', requiredTier: 'legendary' },
          { id: 'tribes', label: 'Tribes', requiredTier: 'mythic' },
          { id: 'challenges', label: 'Challenges' },
          { id: 'marketplace', label: 'Market', requiredTier: 'mythic' },
          { id: 'academy', label: 'Academy' },
          { id: 'intelligence', label: 'Intelligence', requiredTier: 'oracle' },
          { id: 'performance', label: 'Performance', requiredTier: 'legendary' },
          { id: 'subscription', label: 'Ascension' },
          { id: 'status', label: 'System Status' },
        ].map((tab) => {
          const hasAccess = !tab.requiredTier || hasTierAccess(userProfile.tier, tab.requiredTier as Tier);
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (hasAccess) {
                  setActiveTab(tab.id as any);
                } else {
                  addToast(`${tab.label} requires ${tab.requiredTier} Tier or higher.`, 'info');
                  setActiveTab('subscription');
                }
              }}
              className={`flex-none lg:flex-none px-4 lg:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-gold text-black' 
                  : hasAccess ? 'text-white/40 hover:text-white/60' : 'text-white/20'
              }`}
            >
              {tab.label}
              {!hasAccess && <Lock size={10} />}
            </button>
          );
        })}
      </div>

      {/* System Status Bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white/5 border border-white/5 rounded-xl mb-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Network: {isOnline ? 'Connected' : 'Offline'}</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 whitespace-nowrap">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${ghostMode ? 'text-gold' : 'text-white/20'}`}>Ghost Mode</span>
                <button 
                onClick={() => setGhostMode(!ghostMode)}
                className={`w-10 h-5 rounded-full relative transition-all ${ghostMode ? 'bg-gold/40' : 'bg-white/10'}`}
                >
                <motion.div 
                    animate={{ x: ghostMode ? 20 : 0 }}
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-lg ${ghostMode ? 'bg-gold' : 'bg-white/40'}`} 
                />
                </button>
            </div>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Activity className={`w-3 h-3 ${generating ? 'text-gold animate-pulse' : 'text-emerald-400'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Oracle: {generating ? 'Channeling' : 'Ready'}</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Shield className="w-3 h-3 text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sentinel: Active</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Clock className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Market: Active</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-gold">{userProfile.tier}</span>
          </div>
        </div>
      </div>

      {activeTab === 'stats' ? (
        <PerformanceStats userProfile={userProfile} />
      ) : activeTab === 'portfolio' ? (
        <Portfolio userProfile={userProfile} addToast={addToast} handleCloseTrade={handleCloseTrade} />
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
        <Challenges userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'marketplace' ? (
        <Marketplace userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'academy' ? (
        <Academy userProfile={userProfile} addToast={addToast} setActiveTab={(tab) => setActiveTab(tab as any)} />
      ) : activeTab === 'performance' ? (
        <PerformanceReports userProfile={userProfile} />
      ) : activeTab === 'subscription' ? (
        <Subscription userProfile={userProfile} addToast={addToast} />
      ) : activeTab === 'intelligence' ? (
        <IntelligenceCore userProfile={userProfile} addToast={addToast} />
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

          <MarketPriceGrid 
            marketPrices={marketPrices} 
            onSelect={(symbol) => {
              setPair(symbol);
              setShowDetails(true);
            }} 
          />

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

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center glass-card p-3 rounded-xl border-white/5">
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest pl-2">Select Market Pair:</span>
                {DERIV_SYMBOLS.map(s => (
                  <button 
                    key={s.symbol} 
                    onClick={() => setPair(s.symbol)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pair === s.symbol ? 'bg-gold/10 border border-gold/40 text-gold' : 'bg-white/5 border border-white/10 hover:border-white/30 text-white/50 hover:text-white/80'}`}
                  >
                    {s.symbol.replace('frx', '').replace('cry', '').replace('_', ' ')}
                  </button>
                ))}
            </div>

            <div className="h-[400px] lg:h-[600px] glass-card overflow-hidden relative">
            {(() => {
              const currentSignal = activeSignals.find(s => s.pair === pair && s.status === 'active');
              const currentTrade = activeTrades.find(t => t.pair === pair && t.status === 'open');
              
              // Prioritize trade levels if they exist, otherwise show signal levels
              const entry = currentTrade?.entry_price || currentSignal?.entry;
              const sl = currentTrade?.stop_loss || currentSignal?.stop_loss;
              const tps = currentTrade ? [currentTrade.tp1, currentTrade.tp2, currentTrade.tp3, currentTrade.tp4].filter((v): v is number => !!v)
                                       : [currentSignal?.tp1, currentSignal?.tp2, currentSignal?.tp3, currentSignal?.tp4].filter((v): v is number => !!v);
              const signalType = currentTrade?.type || (currentSignal?.analysis.toLowerCase().includes('sell') ? 'sell' : 'buy');

              return (
                <LightweightChart 
                  symbol={pair} 
                  entry={entry}
                  sl={sl}
                  tps={tps}
                  signalType={signalType as 'buy' | 'sell'}
                  alerts={activeAlerts.filter(a => a.pair === pair && a.active).map(a => ({ price: a.price, id: a.id! }))}
                  height={typeof window !== 'undefined' && window.innerWidth < 1024 ? 400 : 600}
                />
              );
            })()}
          </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Sparkles className="text-gold" size={16} /> Submit Analysis for AI Peer Review
            </h3>
            <p className="text-xs text-white/40">Write down your technical or fundamental analysis for {pair}. Our AI will instantly dissect your logic and provide an Oracle assessment.</p>
            <div className="flex gap-2">
                <textarea 
                    id="userAnalysisInput"
                    placeholder={`My bias on ${pair} is...`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gold/50 transition-all min-h-[60px] resize-none"
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('userAnalysisInput') as HTMLTextAreaElement;
                    if(input.value.trim().length > 10) {
                      addToast("AI Oracle is reviewing your setup...", "info");
                      setTimeout(() => {
                        addToast(`Zion Review: Your logic on ${pair} shows strength, but watch out for hidden liquidity sweeps near your assumed entry point.`, "success");
                        input.value = '';
                      }, 2500);
                    } else {
                      addToast("Please provide a more detailed structural analysis before submitting.", "error");
                    }
                  }}
                  className="px-6 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-xl text-xs font-bold uppercase text-gold transition-all flex flex-col items-center justify-center gap-1 shrink-0"
                >
                  <Bot size={16} />
                  Submit
                </button>
            </div>
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
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-xs text-gold/70 shrink-0">{getBotCharacter(signal.ai_bot, userProfile.theme)} • {signal.strategy}</p>
                              {signal.market_structure && (
                                <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                                  {signal.market_structure}
                                </span>
                              )}
                              {signal.session_timing && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                                  {signal.session_timing}
                                </span>
                              )}
                              {signal.timeframe_alignment && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                                  {signal.timeframe_alignment}
                                </span>
                              )}
                              {signal.order_type && (
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-wider border border-white/20 whitespace-nowrap">
                                  {signal.order_type}
                                </span>
                              )}
                              {signal.execution && (
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-wider border border-white/20 whitespace-nowrap">
                                  {signal.execution}
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

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-3 lg:gap-4 mb-4">
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/40 uppercase truncate">Entry</p>
                          <p className="font-mono font-bold text-gold text-[9px] sm:text-sm truncate">{signal.entry}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/40 uppercase truncate">Stop Loss</p>
                          <p className="font-mono font-bold text-red-400 text-[9px] sm:text-sm truncate">{signal.stop_loss}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/40 uppercase truncate">TP1</p>
                          <p className="font-mono font-bold text-emerald-400 text-[9px] sm:text-sm truncate">{signal.tp1}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/40 uppercase truncate">TP2</p>
                          <p className="font-mono font-bold text-emerald-400 text-[9px] sm:text-sm truncate">{signal.tp2}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0">
                          <p className="text-[7px] sm:text-[10px] text-white/40 uppercase truncate">TP3</p>
                          <p className="font-mono font-bold text-emerald-400 text-[9px] sm:text-sm truncate">{signal.tp3}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 text-center min-w-0 border border-gold/20">
                          <p className="text-[7px] sm:text-gold uppercase font-bold truncate">TP4</p>
                          <p className="font-mono font-bold text-gold text-[9px] sm:text-sm truncate">{signal.tp4}</p>
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
                          {signal.risk_percent && (
                            <div className="flex items-center gap-2">
                              <Shield size={12} />
                              Risk: {signal.risk_percent}%
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Target size={12} />
                            Lot: {signal.recommended_lot_size || 'Auto'}
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
                  activeTrades.map((trade) => {
                    const currentPrice = marketPrices[trade.pair]?.price;
                    const diff = currentPrice 
                      ? (trade.type === 'buy' ? currentPrice - trade.entry_price : trade.entry_price - currentPrice)
                      : 0;
                    
                    // Simple lot multiplier calculation for display. 
                    // Real deriv logic requires point values per instrument. 
                    const lotMultiplier = trade.lot_size ? trade.lot_size * 10 : 0.1;
                    const pnl = currentPrice ? diff * lotMultiplier * 10 : (trade.pnl || 0);

                    const pnlPercentage = currentPrice 
                      ? (pnl / (trade.entry_price * 100)) * 100
                      : (trade.pnl_percentage || 0);

                    return (
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
                              <p className="text-[10px] text-white/40 font-mono">Entry: {trade.entry_price} | Lot: {trade.lot_size || '0.01'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                            </div>
                            <div className={`text-[10px] font-bold ${pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                              {pnlPercentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-4">
                        <div className={`bg-white/5 rounded p-1 sm:p-1.5 text-center min-w-0 transition-all ${trade.active_tp === 1 ? 'border border-gold' : ''}`}>
                          <p className="text-[7px] sm:text-[8px] text-white/40 uppercase truncate">TP1</p>
                          <p onClick={() => dbService.update('trades', trade.id, { active_tp: 1 })} className={`cursor-pointer text-[8px] sm:text-[10px] font-mono font-bold truncate ${trade.active_tp === 1 ? 'text-gold' : 'text-emerald-400'}`}>{trade.tp1}</p>
                        </div>
                        <div className={`bg-white/5 rounded p-1 sm:p-1.5 text-center min-w-0 transition-all ${trade.active_tp === 2 ? 'border border-gold' : ''}`}>
                          <p className="text-[7px] sm:text-[8px] text-white/40 uppercase truncate">TP2</p>
                          <p onClick={() => dbService.update('trades', trade.id, { active_tp: 2 })} className={`cursor-pointer text-[8px] sm:text-[10px] font-mono font-bold truncate ${trade.active_tp === 2 ? 'text-gold' : 'text-emerald-400'}`}>{trade.tp2}</p>
                        </div>
                        <div className={`bg-white/5 rounded p-1 sm:p-1.5 text-center min-w-0 transition-all ${trade.active_tp === 3 ? 'border border-gold' : ''}`}>
                          <p className="text-[7px] sm:text-[8px] text-white/40 uppercase truncate">TP3</p>
                          <p onClick={() => dbService.update('trades', trade.id, { active_tp: 3 })} className={`cursor-pointer text-[8px] sm:text-[10px] font-mono font-bold truncate ${trade.active_tp === 3 ? 'text-gold' : 'text-emerald-400'}`}>{trade.tp3}</p>
                        </div>
                        <div className={`bg-white/5 border border-gold/20 rounded p-1 sm:p-1.5 text-center min-w-0 transition-all ${trade.active_tp === 4 ? 'border border-gold bg-gold/10' : ''}`}>
                          <p className="text-[7px] sm:text-gold uppercase font-bold truncate">TP4</p>
                          <p onClick={() => dbService.update('trades', trade.id, { active_tp: 4 })}  className={`cursor-pointer text-[8px] sm:text-[10px] font-mono font-bold truncate ${trade.active_tp === 4 ? 'text-gold' : 'text-emerald-400'}`}>{trade.tp4}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-white/40 font-mono">
                          Current: {(trade.current_price || 0).toFixed(trade.pair.includes('JPY') || trade.pair.includes('BTC') || trade.pair.includes('OTC') || trade.pair.includes('ETH') ? 2 : 4)}
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
                  );
                })
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
          <EconomicCalendar compact={true} />
          
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {allAvailableBots.map((bot) => (
                    <button
                      key={bot.name}
                      onClick={() => setSelectedBot(bot)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedBot.name === bot.name 
                          ? 'bg-gold/10 border-gold/50 text-gold' 
                          : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedBot.name === bot.name ? 'bg-gold text-black' : 'bg-white/10'}`}>
                        <Bot size={16} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold truncate">{getBotCharacter(bot.name, userProfile.theme)}</p>
                          {bot.id && <span className="text-[8px] bg-gold/20 text-gold px-1 rounded uppercase">Custom</span>}
                        </div>
                        <p className="text-[10px] opacity-60 truncate">{bot.strategy}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 min-w-0">
                <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest mb-1 truncate">Daily P/L</p>
                <p className={`text-base sm:text-lg font-bold font-display truncate ${userProfile.daily_pnl && userProfile.daily_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {userProfile.daily_pnl && userProfile.daily_pnl >= 0 ? '+' : ''}${Math.abs(userProfile.daily_pnl || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 min-w-0">
                <p className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest mb-1 truncate">Open Trades</p>
                <p className="text-base sm:text-lg font-bold font-display text-white truncate">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest truncate block">Account Balance ($)</label>
                  <input type="number" defaultValue="1000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm focus:border-gold/50 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-widest truncate block">Risk Per Trade (%)</label>
                  <input type="number" defaultValue="1" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm focus:border-gold/50 outline-none transition-all" />
                </div>
              </div>
              
              <div className="p-3 sm:p-4 rounded-xl bg-gold/5 border border-gold/20 space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-bold truncate">Max Risk Amount</span>
                  <span className="text-xs sm:text-sm font-bold text-gold shrink-0">$10.00</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-bold truncate">Recommended Lot</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 shrink-0">0.05</span>
                </div>
                <div className="pt-2 border-t border-gold/10">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-bold truncate">Drawdown Limit</span>
                    <span className="text-[10px] sm:text-xs font-bold text-red-400 shrink-0">$50.00 (5%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Shield className="text-emerald-400" size={14} />
                <p className="text-[9px] text-emerald-400/80 font-medium">Risk Sentinel is actively monitoring your equity.</p>
              </div>
            </div>
          </div>

          <MarketPulse 
            sentiment={sentiment} 
            news={news} 
            loadingSentiment={loadingSentiment} 
            loadingNews={loadingNews} 
            pair={pair} 
          />
        </div>
      </div>
    )}
    {showThemeSelector && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowThemeSelector(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl glass-card p-6 lg:p-8 border-gold/20 bg-black/90 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold gold-gradient flex items-center gap-3">
                <Palette className="text-gold" /> Choose Your Aura
              </h2>
              <p className="text-white/40 text-sm">Select a theme to transform your interface and AI Bot characters.</p>
            </div>
            <button 
              onClick={() => setShowThemeSelector(false)}
              className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                  (userProfile.theme || 'cosmic') === theme.id 
                    ? 'bg-gold/10 border-gold/50' 
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold ${ (userProfile.theme || 'cosmic') === theme.id ? 'text-gold' : 'text-white' }`}>
                      {theme.name}
                    </h3>
                    { (userProfile.theme || 'cosmic') === theme.id && (
                      <Sparkles size={14} className="text-gold animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{theme.description}</p>
                  
                  <div className="flex gap-1 pt-2">
                    {Object.values(theme.colors).map((color, i) => (
                      <div 
                        key={i} 
                        className="w-4 h-4 rounded-full border border-white/10" 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
                
                {/* Preview Characters */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/20 mb-2">Bot Avatars</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(theme.botCharacters).slice(0, 3).map(([bot, char]) => (
                      <span key={bot} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                        {char}
                      </span>
                    ))}
                    <span className="text-[8px] text-white/20">...and more</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-gold/5 border border-gold/20 text-center">
            <p className="text-[10px] text-gold font-bold uppercase tracking-widest">
              Heavenly Order Theme includes motivational scriptures after every trade.
            </p>
          </div>
        </motion.div>
      </div>
    )}
    {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
  </div>
);
}
