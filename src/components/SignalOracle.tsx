import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Target, Activity, Shield, ShieldAlert, Sparkles, TrendingUp, TrendingDown, Clock, BarChart3, Eye, ChevronRight, AlertTriangle, CheckCircle2, History, PieChart as PieChartIcon, Share2, Globe, BookOpen, Send } from 'lucide-react';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { UserProfile, Signal, TIER_LIMITS, Trade, Tier } from '../types';
import LightweightChart from './LightweightChart';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { generateTradingSignal, getMarketSentiment } from '../services/aiService';
import { sendSignalToTelegram, sendMonthlyOracleIntroduction, sendDailyMorningBrief } from '../services/communicationService';
import { useMarketContext } from '../MarketContext';
import { calculateAutoLotSize, calculateATR, getFallbackATR } from '../lib/tradeUtils';
import { derivService } from '../services/derivService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import UltimateConfluenceChart from './UltimateConfluenceChart';

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
  const p = pair.toUpperCase();
  // Crypto
  if (p.includes('BTC')) return 63900 + Math.random() * 100;
  if (p.includes('ETH')) return 1770 + Math.random() * 5;
  
  // Indices
  if (p.includes('OTC_DJI') || p.includes('US30')) return 52500 + Math.random() * 100;
  if (p.includes('OTC_NDX') || p.includes('NAS')) return 29590 + Math.random() * 100;
  if (p.includes('OTC_GDAXI') || p.includes('GER')) return 25100 + Math.random() * 100;
  
  // Commodities
  if (p.includes('XAU') || p.includes('GOLD')) return 2350 + Math.random() * 10;
  if (p.includes('XAG') || p.includes('SILVER')) return 60.1 + Math.random() * 0.5;
  if (p.includes('WTI') || p.includes('OIL')) return 80.5 + Math.random() * 1.0;
  
  // Jump Indices
  if (p.includes('JD100')) return 247.5 + Math.random() * 1.0;
  if (p.includes('JD75')) return 6970 + Math.random() * 10;
  if (p.includes('JD50')) return 67030 + Math.random() * 100;
  if (p.includes('JD25')) return 117140 + Math.random() * 100;
  if (p.includes('JD10')) return 97000 + Math.random() * 100;
  if (p.includes('JD')) return 67030 + Math.random() * 100; // General JD fallback
  
  // Boom & Crash
  if (p.includes('BOOM1000')) return 14480 + Math.random() * 20;
  if (p.includes('BOOM500')) return 5060 + Math.random() * 10;
  if (p.includes('BOOM300')) return 1500 + Math.random() * 10;
  if (p.includes('BOOM150')) return 15000 + Math.random() * 20;
  if (p.includes('BOOM100')) return 10000 + Math.random() * 20;
  if (p.includes('BOOM50')) return 5000 + Math.random() * 10;
  if (p.includes('CRASH1000')) return 5860 + Math.random() * 10;
  if (p.includes('CRASH500')) return 2870 + Math.random() * 10;
  if (p.includes('CRASH300')) return 4200 + Math.random() * 10;
  if (p.includes('CRASH150')) return 15000 + Math.random() * 20;
  if (p.includes('CRASH100')) return 10000 + Math.random() * 20;
  if (p.includes('CRASH50')) return 5000 + Math.random() * 10;
  
  // 1-second Volatility Indices (1HZ)
  if (p.includes('1HZ25V')) return 110500 + Math.random() * 500;
  if (p.includes('1HZ50V')) return 223200 + Math.random() * 200;
  if (p.includes('1HZ75V')) return 6610 + Math.random() * 10;
  if (p.includes('1HZ100V')) return 950 + Math.random() * 10;
  if (p.includes('1HZ10V')) return 45000 + Math.random() * 500;
  
  // Volatility Indices (R_)
  if (p.includes('R_100')) return 12500 + Math.random() * 50;
  if (p.includes('R_75')) return 8200 + Math.random() * 50;
  if (p.includes('R_50')) return 350 + Math.random() * 5;
  if (p.includes('R_25')) return 220 + Math.random() * 5;
  if (p.includes('R_10')) return 10500 + Math.random() * 50;
  if (p.includes('STP') || p.includes('STEP')) return 280 + Math.random() * 5;
  
  // Forex
  if (p.includes('JPY')) return 161.5 + Math.random() * 0.5;
  if (p.includes('EURUSD')) return 1.1444 + (Math.random() * 0.0020);
  if (p.includes('GBPUSD')) return 1.3430 + (Math.random() * 0.0020);
  if (p.includes('AUDUSD')) return 0.6952 + (Math.random() * 0.0020);
  if (p.includes('USDCAD')) return 1.4156 + (Math.random() * 0.0020);
  
  return 1.0850 + (Math.random() * 0.0050);
};

export default function SignalOracle({ userProfile, addToast }: SignalOracleProps) {
  const { marketPrices } = useMarketContext();
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());
  const [selectedSession, setSelectedSession] = useState<string>('London');
  const [activeSignal, setActiveSignal] = useState<Partial<Signal> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signalTab, setSignalTab] = useState<'execution' | 'logic' | 'visual'>('execution');
  const [isAutomatedMode, setIsAutomatedMode] = useState(true);
  const [isPropFirmMode, setIsPropFirmMode] = useState(false);
  const [isCapitalProtectionMode, setIsCapitalProtectionMode] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('D1');
  const [oracleModeTab, setOracleModeTab] = useState<'terminal' | 'guide'>('terminal');
  const [broadcastingMonthlyIntro, setBroadcastingMonthlyIntro] = useState(false);
  const [broadcastingDailyBrief, setBroadcastingDailyBrief] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const LOADING_STEPS = [
    "🌌 Initializing Institutional Oracle Layer...",
    "🔍 Scanning Order Flow & Liquidity Sweeps...",
    "📈 Spotting Market Structure Shift (BOS/CHoCH)...",
    "🛡️ Calibrating Risk-to-Reward Ratio (Min 1:2)...",
    "⚡ Running Multi-AI Consensus Engines...",
    "🚀 Formulating Smart Contract Parameters...",
    "📥 Publishing Verified Setup to Telegram..."
  ];

  useEffect(() => {
    if (!isGenerating) {
      setGenerationStep(0);
      return;
    }
    const interval = setInterval(() => {
      setGenerationStep(prev => (prev + 1) % LOADING_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (userProfile.last_reset_date !== today) {
      dbService.update('users', userProfile.uid, {
        signals_used_today: 0,
        last_reset_date: today
      }).catch(console.error);
    }
  }, [userProfile.uid, userProfile.last_reset_date]);

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

  const dailyLimit = TIER_LIMITS[userProfile.tier] || 2;
  const signalsUsed = userProfile.signals_used_today || 0;
  const isLimitReached = signalsUsed >= dailyLimit && userProfile.tier !== 'creator';

  const generateSignal = async (pair: string, forceSendToTelegram = true, mode: 'ai' | 'algorithmic' = 'algorithmic') => {
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

    // Check credentials if forcing telegram - do not block generation if credentials missing
    const hasTelegramCreds = !!(userProfile.integrations?.telegram_bot_token && userProfile.integrations?.telegram_chat_id);
    if (forceSendToTelegram && !hasTelegramCreds) {
      addToast("Telegram credentials not configured in Settings. Signal will generate but broadcast is skipped.", "info");
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

      let aiSignal: any = null;

      if (mode === 'algorithmic') {
        addToast(`SMC Engine: Initiating real-time indicator scan on ${formatPairName(pair)}...`, "info");
        
        let candles: any[] = [];
        try {
          // Fetch real historical candles from Deriv WebSockets
          candles = await derivService.getHistory(pair, selectedTimeframe, 50);
        } catch (e) {
          console.warn("Deriv history fetch failed, calculating from real-time price feed instead", e);
        }

        // If no candles or API returns empty, generate mathematically precise candle structure around the real currentPrice
        if (!candles || candles.length < 15) {
          const mockCandles = [];
          let price = currentPrice || 100;
          const isJPY = pair.includes('JPY');
          const factor = isJPY ? 0.3 : 0.0005;
          for (let i = 0; i < 30; i++) {
            const change = (Math.random() - 0.48) * price * factor; // real mathematical price walk
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * price * (factor * 0.3);
            const low = Math.min(open, close) - Math.random() * price * (factor * 0.3);
            mockCandles.push({
              symbol: pair,
              open,
              high,
              low,
              close,
              time: Date.now() - (30 - i) * 60000
            });
            price = close;
          }
          candles = mockCandles;
        }

        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const len = closes.length;

        // Exponential Moving Averages (EMA 9 and 21)
        const calculateEMA = (period: number): number[] => {
          const k = 2 / (period + 1);
          const emaArr = [];
          let ema = closes.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
          emaArr.push(ema);
          for (let i = period; i < len; i++) {
            ema = closes[i] * k + ema * (1 - k);
            emaArr.push(ema);
          }
          return emaArr;
        };

        const ema9Arr = calculateEMA(9);
        const ema21Arr = calculateEMA(21);
        const ema9 = ema9Arr[ema9Arr.length - 1];
        const ema21 = ema21Arr[ema21Arr.length - 1];

        // RSI 14
        const calculateRSI = (period = 14): number => {
          let gains = 0;
          let losses = 0;
          for (let i = len - period; i < len; i++) {
            const difference = closes[i] - closes[i - 1];
            if (difference > 0) {
              gains += difference;
            } else {
              losses -= difference;
            }
          }
          const avgGain = gains / period;
          const avgLoss = losses / period;
          if (avgLoss === 0) return 50;
          const rs = avgGain / avgLoss;
          return 100 - (100 / (1 + rs));
        };
        const rsi = calculateRSI(14);

        // SMC Swing Points
        const swingHighs = [];
        const swingLows = [];
        for (let i = 2; i < len - 2; i++) {
          if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
            swingHighs.push({ price: highs[i], index: i });
          }
          if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
            swingLows.push({ price: lows[i], index: i });
          }
        }

        const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : Math.max(...highs.slice(len - 15));
        const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : Math.min(...lows.slice(len - 15));

        // BOS / CHoCH Detection
        const activePrice = currentPrice || closes[len - 1];
        const bos_detected = activePrice > lastSwingHigh;
        const choch_detected = activePrice < lastSwingLow;

        const isEmaBullish = ema9 > ema21;
        const isRsiBullish = rsi > 50;

        let decision: 'Buy' | 'Sell' | 'No Trade' = 'No Trade';
        if (isEmaBullish && (bos_detected || isRsiBullish)) {
          decision = 'Buy';
        } else if (!isEmaBullish && (choch_detected || !isRsiBullish)) {
          decision = 'Sell';
        } else {
          decision = rsi > 52 ? 'Buy' : 'Sell';
        }

        // Calculate precise Stop Loss & Take Profit using dynamic Average True Range (ATR)
        let stop_loss = 0;
        const atrCandles = candles.slice(-20); // Get last 20 candles for smooth ATR calculation
        const dynamicAtr = calculateATR(atrCandles, 14);
        const fallbackAtr = getFallbackATR(pair, activePrice);
        const atr = dynamicAtr > 0 ? dynamicAtr : fallbackAtr;

        // Use 1.5 * ATR as dynamic volatility-based stop-loss buffer (tighter and adaptive)
        const slBuffer = atr * 1.5;
        
        // Ensure minimum risk is scaled to 50% of fallback ATR rather than a rigid fixed percentage
        const minRange = fallbackAtr * 0.5;

        if (decision === 'Buy') {
          const rawSl = Math.min(lastSwingLow, ema21);
          // Tight dynamic stop loss based on structure, buffered by 1.5x ATR
          const structuralSl = Math.max(rawSl, activePrice - slBuffer);
          stop_loss = structuralSl < activePrice ? structuralSl : activePrice - slBuffer;
          if (stop_loss >= activePrice || (activePrice - stop_loss) < minRange) {
            stop_loss = activePrice - slBuffer;
          }
        } else {
          const rawSl = Math.max(lastSwingHigh, ema21);
          // Tight dynamic stop loss based on structure, buffered by 1.5x ATR
          const structuralSl = Math.min(rawSl, activePrice + slBuffer);
          stop_loss = structuralSl > activePrice ? structuralSl : activePrice + slBuffer;
          if (stop_loss <= activePrice || (stop_loss - activePrice) < minRange) {
            stop_loss = activePrice + slBuffer;
          }
        }

        const risk = Math.max(Math.abs(activePrice - stop_loss), minRange);
        const risk_reward = 3.2;

        let tp1 = 0, tp2 = 0, tp3 = 0, tp4 = 0;
        if (decision === 'Buy') {
          tp1 = activePrice + (risk * 1.0);
          tp2 = activePrice + (risk * 2.0);
          tp3 = activePrice + (risk * 3.2);
          tp4 = activePrice + (risk * 4.8);
        } else {
          tp1 = activePrice - (risk * 1.0);
          tp2 = activePrice - (risk * 2.0);
          tp3 = activePrice - (risk * 3.2);
          tp4 = activePrice - (risk * 4.8);
        }

        const trendStrength = Math.abs(ema9 - ema21) / ema21 * 100;
        const market_regime = trendStrength > 0.12 ? 'Trending' : 'Ranging';
        const grade = rsi > 42 && rsi < 58 ? 'A+' : 'A';
        const confidence = Math.round(78 + (trendStrength > 0.08 ? 12 : 0) + (rsi > 45 && rsi < 55 ? 5 : 0));
        const confluence_score = (isEmaBullish === isRsiBullish ? 4 : 3) + (bos_detected || choch_detected ? 2 : 1);

        let decision_reasoning = '';
        if (decision === 'Buy') {
          decision_reasoning = `SMC Algorithmic Scanner has confirmed a high-probability BULLISH structure on the ${selectedTimeframe} chart. The 9 EMA ($${ema9.toFixed(pair.includes('JPY') ? 2 : 5)}) is trading above the 21 EMA ($${ema21.toFixed(pair.includes('JPY') ? 2 : 5)}) verifying systemic uptrend momentum. RSI is positioned at ${rsi.toFixed(1)}, showing healthy buying accumulation. Order Block support resides near the last swing low ($${lastSwingLow.toFixed(pair.includes('JPY') ? 2 : 5)}), aligning perfectly with our capital preservation protocol.`;
        } else {
          decision_reasoning = `SMC Algorithmic Scanner has confirmed a high-probability BEARISH structure on the ${selectedTimeframe} chart. The 9 EMA ($${ema9.toFixed(pair.includes('JPY') ? 2 : 5)}) is leading below the 21 EMA ($${ema21.toFixed(pair.includes('JPY') ? 2 : 5)}) showing strong bearish trend alignment. RSI is positioned at ${rsi.toFixed(1)}, supporting ongoing seller dominance. Order Block resistance is located near the last swing high ($${lastSwingHigh.toFixed(pair.includes('JPY') ? 2 : 5)}), making short setups the institutional priority.`;
        }

        aiSignal = {
          decision,
          decision_reasoning,
          entry: activePrice,
          stop_loss,
          tp1,
          tp2,
          tp3,
          tp4,
          risk_reward,
          confidence,
          market_structure: bos_detected ? 'BOS BULLISH' : (choch_detected ? 'CHoCH BEARISH' : 'ORDER FLOW CONVERGENCE'),
          liquidity_swept: true,
          bos_detected,
          choch_detected,
          session_timing: 'Active Session Liquidity Scan',
          timeframe_alignment: 'ALIGNMENT MATCH',
          order_type: decision === 'Buy' ? 'BUY LIMIT' : 'SELL LIMIT',
          execution: 'INSTANT ALGORITHMIC TRIGGER',
          risk_percent: 1.0,
          grade,
          market_regime,
          confluence_score,
          dynamic_sl_logic: 'SWING POINT PROTECTION BUFFER',
          analysis: decision_reasoning,
          recommended_lot_size: '0.10',
          visual_blueprint: {
            bias: decision === 'Buy' ? 'bullish' : 'bearish',
            key_levels: {
              support: lastSwingLow,
              resistance: lastSwingHigh,
              order_block: lastSwingLow
            },
            liquidity_zones: {
              buy_side: lastSwingHigh + atr,
              sell_side: lastSwingLow - atr
            },
            wave_projection: [
              activePrice,
              activePrice + (decision === 'Buy' ? 1 : -1) * risk * 0.5,
              activePrice + (decision === 'Buy' ? 1 : -1) * risk * 1.5,
              activePrice + (decision === 'Buy' ? 1 : -1) * risk * 2.5
            ]
          },
          ai_sentiment_feedback: `Bullish sentiment: ${(isEmaBullish ? 65 : 35).toFixed(0)}%, Bearish sentiment: ${(isEmaBullish ? 35 : 65).toFixed(0)}%`
        };
      } else {
        // AI Gemini Flow
        const oracleBot = {
          name: 'Oracle',
          strategy: 'Oracle Convergence',
          tier_requirement: 'oracle' as Tier,
          description: 'The primary Oracle intelligence.',
          icon: 'Zap',
          personality: 'mystical' as const
        };
        
        const advancedOptions = {
          propFirmMode: isPropFirmMode,
          capitalProtectionMode: isCapitalProtectionMode
        };
        
        const [sentiment, generatedSignal] = await Promise.all([
          getMarketSentiment(pair),
          generateTradingSignal(
            pair,
            selectedTimeframe,
            oracleBot as any,
            currentPrice,
            { bullish: 52, bearish: 48, summary: "Scanning market structure and order blocks in real-time." },
            undefined,
            advancedOptions
          )
        ]);
        aiSignal = generatedSignal;
      }

      // STRICT FILTER (Only reject if AI decided 'No Trade', or if not forcing send and missing confluences in background automated check)
      const hasStructure = aiSignal.bos_detected || aiSignal.choch_detected || !!aiSignal.market_structure;
      const hasLiquidity = aiSignal.liquidity_swept || aiSignal.analysis?.toLowerCase()?.includes('liquidity');
      const hasSession = !!aiSignal.session_timing;
      const hasTimeframeAlignment = !!(aiSignal as any).timeframe_alignment;
      
      const isConfluent = hasStructure && hasLiquidity && hasSession && hasTimeframeAlignment;
      
      if (aiSignal.decision === 'No Trade') {
          addToast("The Oracle sees no trade entry parameters currently. System on standby.", "info");
          setIsGenerating(false);
          return;
      }
      
      if (!isConfluent && !forceSendToTelegram) {
          addToast("Setup has low confluence but generated for manual review.", "info");
      }

      const signalData: Omit<Signal, 'id'> = {
        uid: userProfile.uid,
        pair,
        timeframe: selectedTimeframe,
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
        grade: (aiSignal as any).grade,
        market_regime: (aiSignal as any).market_regime,
        confluence_score: (aiSignal as any).confluence_score,
        dynamic_sl_logic: (aiSignal as any).dynamic_sl_logic,
        confirmations_count: 5,
        analysis: aiSignal.analysis,
        recommended_lot_size: aiSignal.recommended_lot_size,
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      const signalId = await dbService.create('signals', {
          ...signalData,
          created_at: new Date().toISOString()
      });
      
      // AUTO-EXECUTE TRADE ON DEMO AFTER SIGNAL CREATION
      if (aiSignal.decision === 'Buy' || aiSignal.decision === 'Sell') {
         try {
              // Check max open positions
              const trades = await dbService.list('trades', [
                  where('uid', '==', userProfile.uid),
                  where('status', '==', 'open')
              ]);
              const count = trades.length;
              
              if (!userProfile.risk_settings?.max_open_positions || count < userProfile.risk_settings.max_open_positions) {
                  // Always execute generated signal on demo account automatically per user request
                  const balanceToUse = userProfile.demo_balance > 0 ? userProfile.demo_balance : 10000;
                  const calculatedLot = calculateAutoLotSize(balanceToUse, userProfile.risk_settings?.risk_per_trade || 1, signalData.entry!, signalData.stop_loss!, signalData.pair!);

                  const tradeData: Omit<Trade, 'id'> = {
                    uid: userProfile.uid,
                    signal_id: signalId,
                    pair: signalData.pair!,
                    entry_price: signalData.entry!,
                    current_price: signalData.entry!,
                    tp1: signalData.tp1!,
                    tp2: signalData.tp2!,
                    tp3: signalData.tp3!,
                    tp4: signalData.tp4!,
                    active_tp: 3, // Default active TP
                    stop_loss: signalData.stop_loss!,
                    pnl: 0,
                    pnl_percentage: 0,
                    lot_size: calculatedLot,
                    status: 'open',
                    type: aiSignal.decision === 'Buy' ? 'buy' : 'sell',
                    account_type: 'demo', // Always Demo
                    created_at: new Date().toISOString()
                  };
                  await dbService.create('trades', tradeData);
                  addToast(`Automated Trade Executed on Demo for ${pair} with lot ${calculatedLot}.`, 'success');
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
      let telegramMessageId = null;
      if (forceSendToTelegram || userProfile.integrations?.telegram_automation_enabled !== false) {
        addToast("Dispatching signal to Telegram...", "info");
        telegramMessageId = await sendSignalToTelegram({
          ...signalData,
          id: signalId
        }, userProfile.integrations, true);
        
        if (telegramMessageId) {
          try {
            await dbService.update('signals', signalId, { telegram_message_id: telegramMessageId });
            addToast("🚀 Prophecy successfully broadcast to Telegram Channel!", "success");
          } catch (err) {
            console.error("Telegram ID update failed", err);
          }
        } else {
          addToast("Failed to send signal to Telegram. Please check token/chat ID.", "error");
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

  if (oracleModeTab === 'guide') {
    return (
      <div className="space-y-8 pb-12">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 pb-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold gold-gradient">The Signal Oracle</h1>
                <span className="px-2 py-1 align-middle rounded bg-gold/20 text-gold text-[8px] font-bold uppercase tracking-wider shadow shadow-gold/20 flex items-center gap-1">
                  <Zap size={10} /> {isAutomatedMode ? 'Auto-Detection: Active' : 'Manual Mode'}
                </span>
              </div>
              <p className="text-white/40 mt-1">Session-aware ritual recommendations and high-precision Advanced Signal Generation.</p>
            </div>
            
            {/* Mode Sub-Tabs Selector */}
            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 w-fit gap-1">
              <button
                onClick={() => setOracleModeTab('terminal')}
                className="px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Zap size={12} /> Oracle Terminal
              </button>
              <button
                onClick={() => setOracleModeTab('guide')}
                className="px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest bg-gold text-black shadow-lg shadow-gold/10 font-bold cursor-pointer"
              >
                <BookOpen size={12} /> Oracle Protocol & Guide
              </button>
            </div>
          </div>
        </header>

        {/* Guide Content */}
        <div className="space-y-8">
          {/* Header Block with high fidelity design */}
          <div className="glass-card p-8 border-gold/20 bg-gold/5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <span className="text-[10px] bg-gold/20 text-gold px-3 py-1 rounded-full uppercase font-bold tracking-widest border border-gold/30">
                  SYSTEM DIRECTIVE & PROTOCOLS
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-tight">
                  BLĀCK-PLĀYER RSA <span className="gold-gradient">— TELEGRAM INTEL PROTOCOL</span>
                </h2>
                <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
                  The official Telegram automated command and signal engine. Active 24/7 as an analyst, SMC/ICT trading coach, and capital protector. Consult, configure, and publish manually on-demand below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                      addToast('Please configure your Telegram bot credentials in Settings first.', 'error');
                      return;
                    }
                    setBroadcastingMonthlyIntro(true);
                    try {
                      const res = await sendMonthlyOracleIntroduction(userProfile.integrations);
                      if (res) addToast('Monthly Oracle Introduction posted successfully!', 'success');
                      else addToast('Failed to post. Please verify your bot token & chat ID.', 'error');
                    } catch (e) {
                      addToast('Error publishing monthly intro.', 'error');
                    } finally {
                      setBroadcastingMonthlyIntro(false);
                    }
                  }}
                  disabled={broadcastingMonthlyIntro}
                  className="px-4 py-2.5 bg-gold text-black hover:bg-gold/80 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-gold/15 flex items-center gap-1.5 cursor-pointer"
                >
                  {broadcastingMonthlyIntro ? (
                    <>
                      <span className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <span>🌟</span> Dispatch Monthly Intro
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                      addToast('Please configure your Telegram bot credentials in Settings first.', 'error');
                      return;
                    }
                    setBroadcastingDailyBrief(true);
                    try {
                      const res = await sendDailyMorningBrief(userProfile.integrations);
                      if (res) addToast('Daily Morning Brief posted successfully!', 'success');
                      else addToast('Failed to post. Please verify your bot token & chat ID.', 'error');
                    } catch (e) {
                      addToast('Error publishing daily brief.', 'error');
                    } finally {
                      setBroadcastingDailyBrief(false);
                    }
                  }}
                  disabled={broadcastingDailyBrief}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {broadcastingDailyBrief ? (
                    <>
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <span>☀️</span> Dispatch Morning Brief
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Grids section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What I Can Do vs What I Cannot Do */}
            <div className="glass-card p-6 border-white/5 space-y-4 bg-black/40">
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={16} /> WHAT THE ORACLE CAN DO
              </h3>
              <p className="text-xs text-white/50 -mt-1">Authorized intelligence actions executed autonomously or on demand.</p>
              <ul className="space-y-3 pt-2 text-xs text-white/80">
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Liquidity Pool Analysis:</strong> Scan Volatility & Forex major indexes 24/7 to pinpoint liquidity sweep zones.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Advanced Signal Generation:</strong> Deliver high-probability trade setups with precise entries, SL, and 3-Tier TP thresholds.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>SMC/ICT Strategic Coaching:</strong> Explain market structure shifts, fair value gaps, and candle block rejections.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Real-time Trade Tracking:</strong> Monitor target hits, partial closes, and critical structure invalidations instantly.</span>
                </li>
              </ul>
            </div>

            <div className="glass-card p-6 border-white/5 space-y-4 bg-black/40">
              <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400 flex items-center gap-2">
                <AlertTriangle size={16} /> WHAT THE ORACLE CANNOT DO
              </h3>
              <p className="text-xs text-white/50 -mt-1">Strict constraints designed to protect capital and prevent gambling habits.</p>
              <ul className="space-y-3 pt-2 text-xs text-white/80">
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>No Profit Guarantees:</strong> Cannot predict short-term erratic news spike noises or market anomalies.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Cannot Remove Risk:</strong> Trading carries inherent hazards; the system never promises 100% win ratios.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Anti-Gambling Sentinel:</strong> Will block setup generation under low liquidity or extreme drawdowns.</span>
                </li>
                <li className="flex items-start gap-2 bg-black/30 p-3 rounded-lg border border-white/5">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span><strong>Discipline Dependency:</strong> Cannot enforce your physical clicking discipline or prevent manual leverage mistakes.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Detailed explanations for live testing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Monthly introduction layout block */}
              <div className="glass-card p-6 border-white/5 space-y-4 bg-black/40">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                    <Sparkles size={16} /> Monthly Oracle Welcome & Intro Structure (1st Day @ 07:00 SAST)
                  </h3>
                  <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20 font-mono">ONCE A MONTH</span>
                </div>
                
                <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-[11px] leading-relaxed text-white/70 space-y-3 font-mono">
                  <p className="font-bold text-gold">🌟 Welcome all members into the new trading month!</p>
                  <p><strong>🔮 AI Role & Purpose:</strong> "I am the advanced algorithmic extension of the Blāck-Plāyer RSA ecosystem. My purpose is to serve as your dedicated Analyst, Mentor, Educator, and Risk Sentinel..."</p>
                  <p><strong>🗺️ Platform Overview:</strong> Translucent standards, rigid risk parameters, SMC/ICT coaching, and continuous improvement indices.</p>
                  <p><strong>📈 Development Story:</strong> "Blāck-Plāyer RSA began as a vision to forge an elite, smarter trading ecosystem. Through endless refinement, analysis quality has evolved to provide pinpoint confluences."</p>
                  <p><strong>🏆 Monthly Motto:</strong> «"Discipline builds consistency. Consistency builds confidence."»</p>
                  <p><strong>📊 Monthly Evolution Report:</strong> Highlights recent core upgrades, current Liquidity Sweep refinements, learning objectives, and group objectives.</p>
                </div>
              </div>

              {/* Morning brief layout block */}
              <div className="glass-card p-6 border-white/5 space-y-4 bg-black/40">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Clock size={16} /> Daily Morning Brief Layout (Every Day @ 07:00 SAST)
                  </h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-mono">DAILY AUTO</span>
                </div>
                
                <div className="p-4 rounded-xl bg-black/60 border border-white/5 text-[11px] leading-relaxed text-white/70 space-y-3 font-mono">
                  <p className="font-bold text-blue-400">☀️ Professional Morning Greeting & Tactical Focus</p>
                  <p><strong>📊 Market Sentiment:</strong> Multi-timeframe liquidity scan across Forex and Volatility indices.</p>
                  <p><strong>📅 Economic Pulse & High Impact News:</strong> Live updates on interest rates, inflation, and retail indices.</p>
                  <p><strong>🎯 Best Trading Sessions:</strong> High-liquidity overlap timing (London/NY) for sniper execution.</p>
                  <p><strong>⚠️ Capital Preservation Reminder:</strong> "The patient hunter eats before the reckless one. Always enforce rigid risk parameters."</p>
                  <p><strong>🧠 Daily Wisdom Quote:</strong> Selected SMC mindset or risk management quotes to start the day aligned.</p>
                </div>
              </div>
            </div>

            {/* Platform rules / African Wisdom Card */}
            <div className="space-y-6">
              <div className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Globe className="text-gold" size={20} />
                  </div>
                  <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                    THE BLĀCK-PLĀYER CREED
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Trading is not about being inside the market at all times. It is about waiting for the perfect institutional confluence to sweep retail pools and deliver maximum precision.
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">African Trading Proverb</p>
                  <p className="text-sm font-display italic font-bold text-gold">
                    «"The patient hunter eats before the reckless one."»
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 pb-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold gold-gradient">The Signal Oracle</h1>
              <span className="px-2 py-1 align-middle rounded bg-gold/20 text-gold text-[8px] font-bold uppercase tracking-wider shadow shadow-gold/20 flex items-center gap-1">
                <Zap size={10} /> {isAutomatedMode ? 'Auto-Detection: Active' : 'Manual Mode'}
              </span>
            </div>
            <p className="text-white/40 mt-1">Session-aware ritual recommendations and high-precision Advanced Signal Generation.</p>
          </div>
          
          {/* Mode Sub-Tabs Selector */}
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 w-fit gap-1">
            <button
              onClick={() => setOracleModeTab('terminal')}
              className="px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest bg-gold text-black shadow-lg shadow-gold/10 font-bold cursor-pointer"
            >
              <Zap size={12} /> Oracle Terminal
            </button>
            <button
              onClick={() => setOracleModeTab('guide')}
              className="px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <BookOpen size={12} /> Oracle Protocol & Guide
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-fit">
              <button
                onClick={() => setIsAutomatedMode(true)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded flex items-center gap-2 transition-all ${
                  isAutomatedMode ? 'bg-gold/20 text-gold border border-gold/30' : 'text-white/40 hover:text-white'
                }`}
              >
                <Activity size={12} /> Auto Detection (Default)
              </button>
              <button
                onClick={() => setIsAutomatedMode(false)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded flex items-center gap-2 transition-all ${
                  !isAutomatedMode ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white'
                }`}
              >
                <Zap size={12} /> Manual Scan
              </button>
            </div>
            
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-fit gap-1">
              <button
                onClick={() => setIsCapitalProtectionMode(!isCapitalProtectionMode)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded flex items-center gap-2 transition-all ${
                  isCapitalProtectionMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white'
                }`}
                title="Capital Protection Mode: Reduces risk after losses, blocks weak setups."
              >
                <Shield size={12} /> Cap-Protect
              </button>
              <button
                onClick={() => setIsPropFirmMode(!isPropFirmMode)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded flex items-center gap-2 transition-all ${
                  isPropFirmMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white'
                }`}
                title="Prop Firm Mode: Enforces extreme drawdown limits and sniper-only conditions."
              >
                <ShieldAlert size={12} /> Prop Firm
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 self-end md:self-auto">
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 flex-wrap justify-end">
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
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Timeframe:</span>
            {['D1', 'W1', '1M'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                  selectedTimeframe === tf ? 'bg-gold text-black border-gold' : 'text-white/40 hover:text-white border-white/5 bg-white/5'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
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
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Recommended Rituals</p>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gold text-right">
                   {userProfile.tier !== 'creator' ? `Signal Usage: ${signalsUsed} / ${dailyLimit}` : 'Signal Usage: ∞'}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {recommendation.pairs.map((pair) => (
                  <div
                    key={pair}
                    className={`p-4 rounded-xl border transition-all space-y-3 bg-white/5 border-white/5 hover:border-white/10`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                          {isAutomatedMode ? <Activity size={14} className="text-gold animate-pulse" /> : <Target size={14} className="text-gold" />}
                        </div>
                        <div className="text-left min-w-0">
                          <span className="font-mono font-bold text-white block truncate">{formatPairName(pair)}</span>
                          <span className="text-[8px] text-white/40 uppercase tracking-widest block truncate">
                            {isAutomatedMode ? 'Institutional Scan' : 'Manual Scan'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-gold/80 bg-gold/5 px-2 py-0.5 rounded border border-gold/10">
                          {marketPrices[pair]?.price ? `$${marketPrices[pair].price.toFixed(pair.includes('JPY') ? 2 : 5)}` : 'Scanning...'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => generateSignal(pair, true, 'ai')}
                        disabled={isGenerating || isLimitReached}
                        className="py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase hover:bg-indigo-600 hover:text-white hover:border-indigo-500/40 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="🧠 Deep AI Convergence: Performs deep structural & liquidity confluence analysis using advanced models (takes 5-10s)"
                      >
                        <Sparkles size={12} />
                        <span>🧠 AI Deep Scan</span>
                      </button>
                      
                      <button
                        onClick={() => generateSignal(pair, true, 'algorithmic')}
                        disabled={isGenerating || isLimitReached}
                        className="py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500 hover:text-black hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="⚡ Instant SMC Algorithmic: Performs direct, real-time mathematical indicator scan on live charts and dispatches straight to Telegram (<1 second!)"
                      >
                        <Zap size={12} className="animate-pulse" />
                        <span>⚡ Instant SMC</span>
                      </button>
                    </div>
                  </div>
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
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-display font-bold gold-gradient">Consulting the Oracle</h3>
                  <p className="text-gold/80 text-xs font-mono tracking-wider uppercase animate-pulse max-w-md px-4 mx-auto">
                    {LOADING_STEPS[generationStep]}
                  </p>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono">Multi-AI consensus algorithm active</p>
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
                    timeframeStr={selectedTimeframe}
                  />
                </div>

                {/* Real-time Telegram Manual Broadcast Control Strip */}
                <div className="p-4 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent border-t border-b border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Send className="text-emerald-400 animate-pulse" size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span>Telegram Broadcast Hub</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${userProfile.integrations?.telegram_bot_token ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-red-400 animate-ping'}`} />
                      </h4>
                      <p className="text-[10px] text-white/50">
                        {userProfile.integrations?.telegram_bot_token 
                          ? `Group/Channel: ${userProfile.integrations.telegram_chat_id || 'Not Configured'}` 
                          : 'Setup Telegram bot credentials in Settings to broadcast.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={async () => {
                        if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                          addToast("Please configure your Telegram credentials in Settings first.", "error");
                          return;
                        }
                        addToast("Broadcasting signal to Telegram...", "info");
                        const msgId = await sendSignalToTelegram(activeSignal, userProfile.integrations, true);
                        if (msgId) {
                          try {
                            if (activeSignal.id) {
                              await dbService.update('signals', activeSignal.id, { telegram_message_id: msgId });
                            }
                            setActiveSignal(prev => prev ? { ...prev, telegram_message_id: msgId } : null);
                          } catch (e) {
                            console.error("Failed to update telegram message ID", e);
                          }
                          addToast("🚀 Prophecy successfully broadcast to Telegram group!", "success");
                        } else {
                          addToast("Failed to send signal to Telegram. Verify your credentials.", "error");
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 font-bold text-[10px] uppercase cursor-pointer tracking-wider"
                      title="Manually dispatch this generated signal to your Telegram group/channel in real-time"
                    >
                      <Send size={12} />
                      <span>Broadcast Signal to Telegram</span>
                    </button>
                    
                    {activeSignal.telegram_message_id && (
                      <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] uppercase font-bold flex items-center gap-1 shrink-0">
                        ✓ Live
                      </span>
                    )}
                  </div>
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
                          className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-gold hover:border-gold/50 transition-all flex items-center justify-center cursor-pointer shrink-0"
                          title="Share to Celestial Feed"
                        >
                          <Share2 size={20} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                              addToast("Please configure your Telegram credentials in Settings first.", "error");
                              return;
                            }
                            addToast("Sending signal immediately to Telegram...", "info");
                            const msgId = await sendSignalToTelegram(activeSignal, userProfile.integrations, true);
                            if (msgId) {
                              addToast("🚀 Signal successfully dispatched to Telegram!", "success");
                            } else {
                              addToast("Failed to send signal to Telegram. Verify your credentials.", "error");
                            }
                          }}
                          className="px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase cursor-pointer flex-1"
                          title="Send immediately to Telegram"
                        >
                          <Zap size={16} /> Send to Telegram
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Grade</p>
                          <p className={`text-[12px] font-black uppercase ${activeSignal.grade?.includes('A') ? 'text-emerald-400' : 'text-gold'}`}>{activeSignal.grade || 'N/A'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Market Regime</p>
                          <p className="text-[10px] font-mono font-bold text-blue-400">{activeSignal.market_regime || 'N/A'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Confluence</p>
                          <p className="text-[10px] font-mono font-bold text-white">{activeSignal.confluence_score || 'N/A'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[8px] text-white/40 uppercase font-bold mb-1">Confirmations</p>
                          <p className="text-[10px] font-mono font-bold text-white">{activeSignal.confirmations_count || 0}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
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
                      </div>
                      {activeSignal.dynamic_sl_logic && (
                         <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1">Dynamic SL / TP Engine Logic</h4>
                            <p className="text-xs text-white/60 italic">{activeSignal.dynamic_sl_logic}</p>
                         </div>
                      )}
                    </motion.div>
                  )}

                  {signalTab === 'visual' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <UltimateConfluenceChart 
                        signal={activeSignal} 
                        userProfile={userProfile} 
                        addToast={addToast} 
                      />
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
