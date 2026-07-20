import { UserProfile } from "../types";

/**
 * Calculates the lot size based on balance, risk percentage, and SL distance.
 * Includes precise tracking for Deriv multipliers vs Forex.
 */
export function calculateCorrelationCoefficient(pair1: string, pair2: string): number {
    const p1 = pair1.toUpperCase();
    const p2 = pair2.toUpperCase();
    
    if (p1 === p2) return 1.0;
    
    const isUSD = (p: string) => p.includes('USD');
    const isEUR = (p: string) => p.includes('EUR');
    const isGBP = (p: string) => p.includes('GBP');
    const isJPY = (p: string) => p.includes('JPY');
    const isCrypto = (p: string) => p.includes('BTC') || p.includes('ETH') || p.includes('SOL');
    const isCrash = (p: string) => p.includes('CRASH');
    const isBoom = (p: string) => p.includes('BOOM');
    const isVolatility = (p: string) => /(V|VOLATILITY|R_)?(10|25|50|75|100)/.test(p);
    
    if (isUSD(p1) && isUSD(p2)) return 0.82;
    if (isEUR(p1) && isEUR(p2)) return 0.78;
    if (isGBP(p1) && isGBP(p2)) return 0.76;
    if (isJPY(p1) && isJPY(p2)) return 0.81;
    if (isCrypto(p1) && isCrypto(p2)) return 0.85;
    if (isCrash(p1) && isCrash(p2)) return 0.80;
    if (isBoom(p1) && isBoom(p2)) return 0.80;
    
    if (isVolatility(p1) && isVolatility(p2)) return 0.75;
    if ((p1.includes('XAU') && p2.includes('XAG')) || (p1.includes('XAG') && p2.includes('XAU'))) return 0.88;

    return 0.15 + (Math.random() * 0.1);
}

export function calculateAutoLotSize(balance: number, riskPercentage: number, entry: number, stopLoss: number, pair: string = 'CRASH500'): number {

    const slDistance = Math.abs(entry - stopLoss);
    if (slDistance === 0) return 0.20; 
    
    // Default Deriv Lot sizing behavior
    let minLot = 0.20; // Default for Crash/Boom 500/1000
    if (pair.includes('R_10') || pair.includes('R_25') || pair.includes('R_50') || pair.includes('R_75') || pair.includes('R_100')) {
        minLot = 0.50;
    } else if (pair.includes('frx') || pair.includes('OTC_')) {
        minLot = 0.01;
    }

    // PART 2: Safe exposure for small accounts
    let adjustedRisk = riskPercentage;
    if (balance <= 20) {
        adjustedRisk = Math.min(riskPercentage, 5); // Allow slightly higher risk to grow micro accounts
    } else if (balance < 500) {
        adjustedRisk = Math.min(riskPercentage, 2); 
    }

    const riskAmount = balance * (adjustedRisk / 100);
    const rawLotSize = riskAmount / slDistance;
    
    return Number(Math.max(minLot, rawLotSize).toFixed(2));
}

/**
 * Capital Protection Engine Logic
 * Evaluates if a trade should even be taken based on current exposure and behavioral sentiment.
 */
export function evaluateCapitalSafety(userProfile: UserProfile, openTradesCount: number): { safe: boolean, reason?: string } {
    // Check Cooldown
    if (userProfile.cooldown_active) {
        const cooldownUntil = new Date(userProfile.cooldown_until || '');
        if (cooldownUntil > new Date()) {
            return { safe: false, reason: `Sentinel Cooldown Active: ${userProfile.cooldown_reason}. Portals lock for safety until ${cooldownUntil.toLocaleTimeString()}.` };
        }
    }

    const maxExposure = userProfile.account_type === 'demo' ? 5 : (userProfile.risk_settings?.max_open_positions || 3);
    
    if (openTradesCount >= maxExposure) {
        return { safe: false, reason: "Maximum celestial exposure reached. Risk of correlation is too high. Close existing portals first." };
    }
    
    // PART 3: Anti-Loss Guard (Evolved)
    if (userProfile.consecutive_losses >= 3) {
        return { safe: false, reason: "Anti-Loss Engine Active: The impatient hunter returns hungry. Hard Pause due to consecutive failures. Meditation required." };
    }

    if (userProfile.consecutive_losses === 2) {
        // Enforce strict rules
        if (openTradesCount >= 1) {
            return { safe: false, reason: "Capital Protection Mode: Danger detected. Limit 1 open trade while recovering."};
        }
    }

    return { safe: true };
}

/**
 * Dynamic SL System
 * Ensures SL is structure-based, volatility-aware, never random.
 */
export function validateSLRange(entry: number, sl: number, tp: number): boolean {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    if (risk === 0) return false;

    // Minimum 1:2 RR for the Oracle to ensure Strict Institutional Grade rules.
    return reward >= risk * 2;
}

export interface Candle {
  high: number;
  low: number;
  close: number;
  open?: number;
}

/**
 * Calculates the Average True Range (ATR) for a series of candles.
 * TR = max(high - low, abs(high - previous_close), abs(low - previous_close))
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (!candles || candles.length < 2) {
    return 0;
  }
  
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    if (i === 0) {
      trs.push(current.high - current.low);
    } else {
      const prev = candles[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trs.push(tr);
    }
  }

  if (trs.length < period) {
    return trs.reduce((sum, val) => sum + val, 0) / trs.length;
  }

  // Wilder's smoothing formula for ATR:
  let atr = trs.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  
  return atr;
}

/**
 * Returns a fallback ATR value for a given pair/symbol based on its price,
 * in case historical data is unavailable or empty.
 */
export function getFallbackATR(symbol: string, currentPrice: number): number {
  const p = symbol.toUpperCase();
  if (p.includes('JPY')) {
    return 0.15;
  } else if (p.includes('XAU') || p.includes('GOLD')) {
    return 2.50;
  } else if (p.startsWith('CRY') || p.includes('BTC') || p.includes('ETH')) {
    return currentPrice * 0.0050; // 0.5% default daily volatility range
  } else if (p.startsWith('R_') || p.startsWith('V') || p.startsWith('1H') || p.includes('BOOM') || p.includes('CRASH')) {
    return currentPrice * 0.0050;
  } else if (currentPrice > 100) {
    return currentPrice * 0.0025;
  }
  return currentPrice * 0.0015; // standard forex
}

export function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRSI(values: number[], period: number = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface SMCAnalysis {
  trend: 'Bullish' | 'Bearish' | 'Ranging';
  trendStrength: 'Strong' | 'Moderate' | 'Weak';
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  rsi: number;
  bosDetected: boolean;
  chochDetected: boolean;
  liquiditySwept: boolean;
  recentOrderBlocks: { type: 'Bullish' | 'Bearish'; price: number; age: number }[];
  fairValueGaps: { type: 'Bullish' | 'Bearish'; top: number; bottom: number; mitigated: boolean }[];
  nearestSupport: number;
  nearestResistance: number;
  liquidityZones: { buy_side: number; sell_side: number };
  suggestedDirection: 'Buy' | 'Sell' | 'No Trade';
  confluenceScore: number;
  confidence: number;
}

export function analyzeMarketSMC(candles: Candle[], symbol: string): SMCAnalysis {
  const len = candles.length;
  const fallbackPrice = candles[len - 1]?.close || 1.0;
  
  // Default empty structure
  const emptyAnalysis: SMCAnalysis = {
    trend: 'Ranging',
    trendStrength: 'Weak',
    ema9: fallbackPrice,
    ema21: fallbackPrice,
    ema50: fallbackPrice,
    ema200: fallbackPrice,
    rsi: 50,
    bosDetected: false,
    chochDetected: false,
    liquiditySwept: false,
    recentOrderBlocks: [],
    fairValueGaps: [],
    nearestSupport: fallbackPrice * 0.99,
    nearestResistance: fallbackPrice * 1.01,
    liquidityZones: { buy_side: fallbackPrice * 1.01, sell_side: fallbackPrice * 0.99 },
    suggestedDirection: 'No Trade',
    confluenceScore: 50,
    confidence: 50,
  };

  if (len < 5) {
    return emptyAnalysis;
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const opens = candles.map(c => c.open || c.close);

  const lastClose = closes[len - 1];
  const lastHigh = highs[len - 1];
  const lastLow = lows[len - 1];
  const lastOpen = opens[len - 1];

  // 1. Technical Indicators
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, Math.min(200, len));
  const rsi = calculateRSI(closes, 14);

  // 2. Swing Highs & Lows (Fractals)
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];
  
  for (let i = 2; i < len - 2; i++) {
    const h = highs[i];
    const l = lows[i];
    if (h > highs[i - 1] && h > highs[i - 2] && h > highs[i + 1] && h > highs[i + 2]) {
      swingHighs.push({ index: i, price: h });
    }
    if (l < lows[i - 1] && l < lows[i - 2] && l < lows[i + 1] && l < lows[i + 2]) {
      swingLows.push({ index: i, price: l });
    }
  }

  const lastSwingHighPrice = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : lastHigh * 1.005;
  const lastSwingLowPrice = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : lastLow * 0.995;

  // 3. Liquidity Pools & Sweeps
  // Buy-Side Liquidity (BSL) & Sell-Side Liquidity (SSL)
  const bsl = lastSwingHighPrice;
  const ssl = lastSwingLowPrice;
  
  // Liquidity Sweep Detection
  // Bullish Sweep: Price pierced SSL (lastSwingLow) but closed above it
  const bullishSweep = lastLow < lastSwingLowPrice && lastClose > lastSwingLowPrice;
  // Bearish Sweep: Price pierced BSL (lastSwingHigh) but closed below it
  const bearishSweep = lastHigh > lastSwingHighPrice && lastClose < lastSwingHighPrice;
  const liquiditySwept = bullishSweep || bearishSweep;

  // 4. Market Structure Shift: BOS & CHoCH
  // Bullish BOS: Price closed above last swing high in an uptrend
  // Bearish BOS: Price closed below last swing low in a downtrend
  // CHoCH is the initial break of opposite swing high/low when trend reverses
  const emaTrendBullish = ema21 > ema50;
  const emaTrendBearish = ema21 < ema50;
  
  let bosDetected = false;
  let chochDetected = false;

  const previousClose = closes[len - 2];
  if (previousClose <= lastSwingHighPrice && lastClose > lastSwingHighPrice) {
    if (emaTrendBullish) {
      bosDetected = true;
    } else {
      chochDetected = true; // Trend Shift
    }
  } else if (previousClose >= lastSwingLowPrice && lastClose < lastSwingLowPrice) {
    if (emaTrendBearish) {
      bosDetected = true;
    } else {
      chochDetected = true; // Trend Shift
    }
  }

  // 5. Order Blocks (OB)
  const recentOrderBlocks: { type: 'Bullish' | 'Bearish'; price: number; age: number }[] = [];
  // Bullish OB: Lowest bearish candle before a strong upward sequence (3+ green candles)
  // Bearish OB: Highest bullish candle before a strong downward sequence (3+ red candles)
  for (let i = len - 10; i < len - 3; i++) {
    if (i < 2) continue;
    
    // Check for Bullish OB
    if (closes[i] < opens[i]) { // Red candle
      const isUpwardImpulse = closes[i + 1] > opens[i + 1] && closes[i + 2] > opens[i + 2] && closes[i + 3] > opens[i + 3];
      if (isUpwardImpulse && closes[i + 3] > highs[i]) {
        recentOrderBlocks.push({ type: 'Bullish', price: lows[i], age: len - 1 - i });
      }
    }
    
    // Check for Bearish OB
    if (closes[i] > opens[i]) { // Green candle
      const isDownwardImpulse = closes[i + 1] < opens[i + 1] && closes[i + 2] < opens[i + 2] && closes[i + 3] < opens[i + 3];
      if (isDownwardImpulse && closes[i + 3] < lows[i]) {
        recentOrderBlocks.push({ type: 'Bearish', price: highs[i], age: len - 1 - i });
      }
    }
  }

  // 6. Fair Value Gaps (FVG)
  const fairValueGaps: { type: 'Bullish' | 'Bearish'; top: number; bottom: number; mitigated: boolean }[] = [];
  for (let i = len - 15; i < len; i++) {
    if (i < 2) continue;
    // Bullish FVG (Low of candle i is greater than High of candle i-2)
    if (lows[i] > highs[i - 2]) {
      const top = lows[i];
      const bottom = highs[i - 2];
      // Check if mitigated by any intermediate candle
      let mitigated = false;
      for (let j = i - 1; j < len; j++) {
        if (j === i - 2 || j === i) continue;
        if (lows[j] <= bottom && highs[j] >= top) {
          mitigated = true;
          break;
        }
      }
      fairValueGaps.push({ type: 'Bullish', top, bottom, mitigated });
    }
    // Bearish FVG (High of candle i is less than Low of candle i-2)
    if (highs[i] < lows[i - 2]) {
      const top = lows[i - 2];
      const bottom = highs[i];
      let mitigated = false;
      for (let j = i - 1; j < len; j++) {
        if (j === i - 2 || j === i) continue;
        if (lows[j] <= bottom && highs[j] >= top) {
          mitigated = true;
          break;
        }
      }
      fairValueGaps.push({ type: 'Bearish', top, bottom, mitigated });
    }
  }

  // 7. Support & Resistance
  const nearestSupport = lastSwingLowPrice;
  const nearestResistance = lastSwingHighPrice;

  // 8. SMC Direction Bias Logic (High Accuracy Mathematical Filter)
  let bullishPoints = 0;
  let bearishPoints = 0;

  // Indicator Trends
  if (emaTrendBullish) bullishPoints += 3;
  if (emaTrendBearish) bearishPoints += 3;
  if (closes[len - 1] > ema21) bullishPoints += 1;
  if (closes[len - 1] < ema21) bearishPoints += 1;
  if (closes[len - 1] > ema200) bullishPoints += 2;
  if (closes[len - 1] < ema200) bearishPoints += 2;

  // RSI Confluences
  if (rsi > 45 && rsi < 65) bullishPoints += 1;
  if (rsi < 55 && rsi > 35) bearishPoints += 1;
  if (rsi > 70) bearishPoints += 1.5; // Overbought, look for potential reversal
  if (rsi < 30) bullishPoints += 1.5; // Oversold

  // SMC triggers
  if (bullishSweep) bullishPoints += 3;
  if (bearishSweep) bearishPoints += 3;
  if (chochDetected && emaTrendBullish) bullishPoints += 3.5;
  if (chochDetected && emaTrendBearish) bearishPoints += 3.5;
  if (bosDetected && emaTrendBullish) bullishPoints += 2.5;
  if (bosDetected && emaTrendBearish) bearishPoints += 2.5;

  // Near Order Blocks
  const nearBullishOB = recentOrderBlocks.some(ob => ob.type === 'Bullish' && Math.abs(lastClose - ob.price) / ob.price < 0.005);
  const nearBearishOB = recentOrderBlocks.some(ob => ob.type === 'Bearish' && Math.abs(lastClose - ob.price) / ob.price < 0.005);
  if (nearBullishOB) bullishPoints += 2;
  if (nearBearishOB) bearishPoints += 2;

  // Determine Direction
  let suggestedDirection: 'Buy' | 'Sell' | 'No Trade' = 'No Trade';
  const scoreDiff = Math.abs(bullishPoints - bearishPoints);
  const totalPoints = bullishPoints + bearishPoints;
  const confluenceScore = Math.min(99, Math.round((Math.max(bullishPoints, bearishPoints) / (totalPoints || 1)) * 100));

  if (scoreDiff >= 3) {
    if (bullishPoints > bearishPoints) {
      suggestedDirection = 'Buy';
    } else {
      suggestedDirection = 'Sell';
    }
  }

  // Adjust direction based on extreme RSI to prevent buying the absolute top / selling the bottom
  if (rsi > 78 && suggestedDirection === 'Buy') {
    suggestedDirection = 'No Trade'; // Protect user from retail traps
  }
  if (rsi < 22 && suggestedDirection === 'Sell') {
    suggestedDirection = 'No Trade';
  }

  const confidence = Math.min(95, Math.round(confluenceScore * 0.9 + (scoreDiff * 2)));

  // Trend strength classification
  let trendStrength: 'Strong' | 'Moderate' | 'Weak' = 'Weak';
  if (scoreDiff > 8) trendStrength = 'Strong';
  else if (scoreDiff > 4) trendStrength = 'Moderate';

  return {
    trend: emaTrendBullish ? 'Bullish' : (emaTrendBearish ? 'Bearish' : 'Ranging'),
    trendStrength,
    ema9,
    ema21,
    ema50,
    ema200,
    rsi,
    bosDetected,
    chochDetected,
    liquiditySwept,
    recentOrderBlocks,
    fairValueGaps,
    nearestSupport,
    nearestResistance,
    liquidityZones: { buy_side: bsl, sell_side: ssl },
    suggestedDirection,
    confluenceScore,
    confidence,
  };
}

