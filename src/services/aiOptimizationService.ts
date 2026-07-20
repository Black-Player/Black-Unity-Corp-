import { dbService } from "./dbService";
import { UserProfile } from "../types";

// Shared Knowledge Base of Reusable Explanation Modules (Requirement 3)
export const SHARED_KNOWLEDGE_BASE = {
  smc: {
    order_block: "An Order Block (OB) represents a concentrated region of institutional buy/sell limit orders that remained unfilled. These zones are usually formed prior to a rapid impulsive price expansion.",
    fvg: "A Fair Value Gap (FVG) is a three-candle structural imbalance where buyers or sellers aggressively push prices, leaving a gap where only one side of market transaction was fully matched.",
    bos_choch: "A Break of Structure (BOS) indicates trend continuation on the prevailing path. A Change of Character (CHoCH) signifies structural shift, warning of a potential trend reversal.",
    premium_discount: "Premium and Discount levels split the current trading range at 50% equilibrium. Institutions aim to buy low (Discount: < 50%) and sell high (Premium: > 50%)."
  },
  ict: {
    kill_zones: "ICT Kill Zones (London, New York, Asia) denote specialized daily session times when high algorithmic market injection leads to optimal structural sweeps.",
    ote: "Optimal Trade Entry (OTE) matches the 62%, 70.5%, and 79% Fibonacci retracement coordinates of a key high timeframe expansion leg.",
    power_of_three: "The Power of Three (AMD) is a daily cycle where price undergoes Accumulation during the Asia range, Manipulation (Judas Swing) in London, and Distribution in New York."
  },
  price_action: {
    support_resistance: "Horizontal Support and Resistance mark psychological thresholds where retail traders repeatedly participate, creating liquidity targets.",
    candlesticks: "Engulfing, pinbar, and double-bar candlestick patterns visually denote rapid switches in buyer/seller momentum at key structural intersections.",
    market_phases: "Markets flow structurally through four stages: Accumulation (consolidation), Markup (expansion), Distribution (re-distribution), and Markdown (capitulation)."
  },
  mmm: {
    market_maker_cycle: "The Market Maker Cycle represents multi-day engineered stages of buying and selling to trap retail sentiment in incorrect trend biases."
  }
};

export interface Recommendation {
  botName: string;
  specialty: string;
  reason: string;
  confidence: number;
  suitableConditions: string;
}

export interface BudgetStats {
  dailyLimit: number;
  dailyUsed: number;
  weeklyLimit: number;
  weeklyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
  quickAnalysisCount: number;
  deepAnalysisCount: number;
}

// Memory-based Cache Storage (Requirement 4)
interface CachedResponse {
  data: any;
  timestamp: number;
  pair: string;
  timeframe: string;
  mode: "quick" | "deep";
}

const responseCache: Record<string, CachedResponse> = {};
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export const aiOptimizationService = {
  /**
   * STAGE ONE: Rule-Based Market Filter (Requirement 2)
   * Lightweight analysis that intercepts requests before invoking Gemini API.
   */
  checkMarketFilter(params: {
    pair: string;
    timeframe: string;
    currentPrice: number;
    spread?: number;
    volatilityATR?: number;
    hasActiveNews?: boolean;
    userPreferences?: UserProfile["risk_settings"];
  }): { pass: boolean; reason?: string; detailCode?: string } {
    const { pair, currentPrice, spread = 0.0002, volatilityATR = 0.1, hasActiveNews = false, userPreferences } = params;

    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

    // 1. Check Market Open/Closed
    if (isWeekend && (pair.startsWith("frx") || pair.startsWith("OTC_"))) {
      return {
        pass: false,
        reason: "Market Closed. Forex & Stocks are frozen over weekends. Rest to protect your capital.",
        detailCode: "MARKET_CLOSED"
      };
    }

    // 2. High Spread Protection
    if (spread > 0.02) {
      return {
        pass: false,
        reason: "Excessive spread detected. Market liquidity is currently fragmented, which would degrade execution accuracy.",
        detailCode: "HIGH_SPREAD"
      };
    }

    // 3. News Window Filter
    if (hasActiveNews) {
      return {
        pass: false,
        reason: "High-impact economic news alert within active window. Institutional volatility spikes are imminent.",
        detailCode: "NEWS_WINDOW_LOCK"
      };
    }

    // 4. Low Volatility (Dead Market Protection)
    if (volatilityATR < 0.0005 && !pair.includes("R_") && !pair.includes("BOOM") && !pair.includes("CRASH")) {
      return {
        pass: false,
        reason: "Market is dead with extremely compressed low volatility. Wait for expansion and volume.",
        detailCode: "DEAD_MARKET_COMPRESSION"
      };
    }

    // 5. User-set active hours check
    if (userPreferences?.trading_hours?.enabled) {
      const currentHour = new Date().toTimeString().substring(0, 5); // "HH:MM"
      const { start, end } = userPreferences.trading_hours;
      if (start && end) {
        if (start < end) {
          if (currentHour < start || currentHour > end) {
            return {
              pass: false,
              reason: `Request blocked by your Personal Trade Lock. Current time is outside your active trading window (${start} - ${end}).`,
              detailCode: "USER_HOURS_LOCK"
            };
          }
        } else {
          // Over midnight
          if (currentHour < start && currentHour > end) {
            return {
              pass: false,
              reason: `Request blocked by your Personal Trade Lock. Current time is outside your active trading window (${start} - ${end}).`,
              detailCode: "USER_HOURS_LOCK"
            };
          }
        }
      }
    }

    return { pass: true };
  },

  /**
   * STAGE TWO & PERSONALIZED AI RECOMMENDATIONS (Requirement 7 & 10)
   * Recommends the perfect bot specialist based on current market conditions.
   */
  recommendSpecialist(marketConditions: {
    trend: "bullish" | "bearish" | "ranging";
    volatility: "high" | "low" | "medium";
    session: string;
    hasImbalance: boolean;
    hasTestedOB: boolean;
    userDNA?: {
      tradingStyle?: string;
      riskAversion?: string;
    };
  }): Recommendation {
    const { trend, volatility, session, hasImbalance, hasTestedOB, userDNA } = marketConditions;

    // Default recommendation
    let botName = "Trinity";
    let specialty = "ICT Session Patterns";
    let reason = "Rhythmic, session-based patterns perfectly align with your core configuration.";
    let confidence = 85;
    let suitableConditions = "London & New York Kill Zones, OTE retracements.";

    if (hasImbalance && !hasTestedOB && trend !== "ranging") {
      botName = "Neo";
      specialty = "Smart Money Concepts (SMC)";
      reason = "Key Fair Value Gaps (FVG) and premium/discount imbalances are present. Ideal for SMC structural mitigation.";
      confidence = 92;
      suitableConditions = "Strong expansion legs, structural breakouts, mitigations.";
    } else if (hasTestedOB && trend !== "ranging") {
      botName = "Persephone";
      specialty = "Supply & Demand Zones";
      reason = "Price is currently mitigating a fresh high-timeframe supply/demand zone. High probability reversal indicators detected.";
      confidence = 89;
      suitableConditions = "Key reversal turning points, freshly tested support/resistance.";
    } else if (volatility === "high" && session !== "Asia") {
      botName = "Morpheus";
      specialty = "Inner Circle Trader (ICT) / Liquidity sweeps";
      reason = "High-impact liquidity pools are exposed. Perfect for anticipating manipulation runs (Judas Swing) and daily session cycles.";
      confidence = 88;
      suitableConditions = "High volatility sessions, major swing highs/lows sweep.";
    } else if (trend === "ranging") {
      botName = "Architect";
      specialty = "Market Maker Method (MMM) Accumulation";
      reason = "Market is building engineered liquidity boundaries. Excellent for detecting retail traps, accumulation clusters, and manipulation low setups.";
      confidence = 82;
      suitableConditions = "Extended market range phases, false breakouts trapping retail.";
    }

    // Override or refine based on user DNA (Trading Style preference)
    if (userDNA?.tradingStyle === "Scalp" && botName === "Architect") {
      botName = "Neo";
      specialty = "SMC Scalp Execution";
      reason = "You prefer lightning-fast Scalp execution. Neo's micro-SMC order blocks offer extreme structural precision on low-timeframes.";
      confidence = 90;
    }

    return { botName, specialty, reason, confidence, suitableConditions };
  },

  /**
   * RESPONSE CACHING (Requirement 4)
   * Get cached AI responses to prevent redundant API calls.
   */
  getCachedAnalysis(pair: string, timeframe: string, mode: "quick" | "deep"): any | null {
    const key = `${pair}_${timeframe}_${mode}`;
    const cached = responseCache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
      console.log(`[AI Cache Hit] Reusing cached analysis for ${key}`);
      return cached.data;
    }
    return null;
  },

  /**
   * RESPONSE CACHING (Requirement 4)
   * Save an AI response to cache.
   */
  setCachedAnalysis(pair: string, timeframe: string, mode: "quick" | "deep", data: any) {
    const key = `${pair}_${timeframe}_${mode}`;
    responseCache[key] = {
      data,
      timestamp: Date.now(),
      pair,
      timeframe,
      mode
    };
  },

  /**
   * Clear entire AI cache or a single pair's cache (Requirement 13)
   */
  clearCache(pair?: string) {
    if (pair) {
      for (const key in responseCache) {
        if (responseCache[key].pair === pair) {
          delete responseCache[key];
        }
      }
    } else {
      for (const key in responseCache) {
        delete responseCache[key];
      }
    }
  },

  /**
   * TOKEN BUDGET MANAGER (Requirement 6)
   * Calculates simulated token usage, logs statistics, and enforces system thresholds.
   */
  getBudgetStats(uid: string): BudgetStats {
    const stored = localStorage.getItem(`ai_budget_${uid}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // use default fallback below
      }
    }

    // Default budget values
    const defaultStats: BudgetStats = {
      dailyLimit: 100000,
      dailyUsed: 12450,
      weeklyLimit: 500000,
      weeklyUsed: 89400,
      monthlyLimit: 2000000,
      monthlyUsed: 310500,
      quickAnalysisCount: 42,
      deepAnalysisCount: 15
    };
    localStorage.setItem(`ai_budget_${uid}`, JSON.stringify(defaultStats));
    return defaultStats;
  },

  /**
   * Log token expenditure
   */
  logTokenUsage(uid: string, mode: "quick" | "deep", approximateTokens: number) {
    const stats = this.getBudgetStats(uid);
    stats.dailyUsed += approximateTokens;
    stats.weeklyUsed += approximateTokens;
    stats.monthlyUsed += approximateTokens;

    if (mode === "quick") {
      stats.quickAnalysisCount += 1;
    } else {
      stats.deepAnalysisCount += 1;
    }

    localStorage.setItem(`ai_budget_${uid}`, JSON.stringify(stats));

    // Also background-persist to Firestore/dbService
    dbService.create("ai_token_logs", {
      uid,
      mode,
      tokens: approximateTokens,
      timestamp: new Date().toISOString()
    }).catch(err => console.warn("Failed background token save", err));
  },

  /**
   * Checks if user is nearing limits and returns optimization flag
   */
  isLimitApproaching(uid: string): { limitReached: boolean; enforceOptimization: boolean } {
    const stats = this.getBudgetStats(uid);
    const dailyRatio = stats.dailyUsed / stats.dailyLimit;
    const monthlyRatio = stats.monthlyUsed / stats.monthlyLimit;

    return {
      limitReached: stats.dailyUsed >= stats.dailyLimit || stats.monthlyUsed >= stats.monthlyLimit,
      enforceOptimization: dailyRatio > 0.85 || monthlyRatio > 0.85
    };
  },

  /**
   * Continuous Learning Tracker (Requirement 11)
   * Logs which bots are selected and their helpfulness rating.
   */
  async logSelectionAndHelpfulness(uid: string, botName: string, pair: string, rating: number, feedback?: string) {
    const logObj = {
      uid,
      botName,
      pair,
      rating, // 1-5 stars
      feedback: feedback || "",
      timestamp: new Date().toISOString()
    };
    await dbService.create("ai_learning_logs", logObj);
  }
};
