import { UserProfile, Signal, Trade } from '../types';
import { dbService } from './dbService';

export const CoreEngines = {
  // 1. USER DNA ENGINE
  userDNA: {
    analyzeProfile: (user: UserProfile, recentTrades: Trade[]) => {
      const wins = recentTrades.filter(t => (t.pnl || 0) > 0).length;
      const losses = recentTrades.length - wins;
      const winRate = recentTrades.length > 0 ? (wins / recentTrades.length) * 100 : 0;
      
      const emoState = losses > 3 ? 'high_stress' : 'stable';
      
      return {
        riskProfile: user.risk_settings.risk_per_trade > 3 ? 'aggressive' : 'conservative',
        recentWinRate: winRate,
        emotionalState: emoState,
        recommendedAction: emoState === 'high_stress' ? 'Reduce lot size by 50% immediately and halt trading for 4 hours.' : 'Continue operating within standard risk parameters.'
      };
    },
    updateRiskAfterLosses: async (user: UserProfile, consecutiveLosses: number) => {
      if (consecutiveLosses >= 3) {
        // Enforce rule: never increase risk after losses.
        const newRisk = Math.max(0.5, user.risk_settings.risk_per_trade * 0.5);
        await dbService.update('users', user.uid, {
            'risk_settings.risk_per_trade': newRisk,
            cooldown_active: true,
            cooldown_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            cooldown_reason: 'User DNA Engine Intervention: Consecutive Loss Threshold Reached. Capital Protection active.'
        });
        return newRisk;
      }
      return user.risk_settings.risk_per_trade;
    }
  },

  // 2. MARKET MEMORY + REGIME ENGINE
  marketRegime: {
    detect: (currentVolatility: number, trendStrength: number) => {
      if (currentVolatility > 70 && trendStrength > 60) return 'High Volatility Trend';
      if (currentVolatility < 30 && trendStrength < 30) return 'Low Liquidity Range';
      if (trendStrength > 75) return 'Strong Trend';
      return 'Chop / Consolidation';
    },
    adaptStrategy: (regime: string, signal: Signal) => {
      if (regime === 'High Volatility Trend') {
        signal.stop_loss = signal.stop_loss * 1.5; // Widen SL
      }
      if (regime === 'Low Liquidity Range') {
        signal.confidence = Math.max(0, signal.confidence - 20); // Suppress chop trades
      }
      return signal;
    }
  },

  // 3. SIGNAL ENGINE (STRICT FILTER)
  signalFilter: {
    validate: (signalRaw: any): boolean => {
      // 1. Clear structure (BOS/CHOCH)
      const hasStructure = signalRaw.analysis?.includes('BOS') || signalRaw.analysis?.includes('CHOCH');
      // 2. Liquidity context
      const hasLiquidity = signalRaw.analysis?.toLowerCase()?.includes('liquidity');
      // 3. Valid entry (OB/FVG)
      const hasEntryValid = signalRaw.analysis?.includes('OB') || signalRaw.analysis?.includes('FVG');
      
      // Strict rejection if core confluence is missing
      if (!hasStructure || !hasLiquidity || !hasEntryValid) {
        return false;
      }
      return true;
    }
  },

  // 4. POSITION & RISK ENGINE
  positionRisk: {
    calculateLotSize: (capital: number, riskPercent: number, stopLossPips: number) => {
      if (stopLossPips > 50) {
        // Wide SL -> reduce size
        riskPercent = riskPercent * 0.5;
      }
      const riskAmount = capital * (riskPercent / 100);
      const pipValue = 10; // Standard lot approx
      const calculatedLot = riskAmount / (stopLossPips * pipValue);
      return Number(calculatedLot.toFixed(2));
    }
  },

  // 5. SMART CAPITAL ENGINE
  smartCapital: {
    guardDrawdown: async (user: UserProfile, maxDailyLoss: number) => {
      if (user.daily_pnl <= -maxDailyLoss) {
        await dbService.update('users', user.uid, {
            cooldown_active: true,
            cooldown_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            cooldown_reason: 'Hard Loss Limit Hit. Smart Capital Engine Engaged. Trading Locked for 24h.'
        });
      }
    }
  },

  // 6. AP SYSTEM ENGINE
  apSystem: {
    awardPoints: async (user: UserProfile, action: 'win' | 'journal' | 'lesson') => {
      const points = { win: 10, journal: 20, lesson: 50 };
      const newAp = user.ap + points[action];
      let newRank = user.student_rank;
      
      if (newAp > 500 && newRank === 'Initiate') newRank = 'Developing';
      if (newAp > 1500 && newRank === 'Developing') newRank = 'Disciplined';
      if (newAp > 3000 && newRank === 'Disciplined') newRank = 'Elite';
      
      await dbService.update('users', user.uid, {
         ap: newAp,
         student_rank: newRank
      });
      return { ap: newAp, rank: newRank };
    },
    penalize: async (user: UserProfile, reason: 'fomo' | 'sl_move' | 'overtrade') => {
      const damage = { fomo: -50, sl_move: -100, overtrade: -200 };
      const newAp = Math.max(0, user.ap + damage[reason]);
      await dbService.update('users', user.uid, { ap: newAp });
      return newAp;
    }
  }
};
