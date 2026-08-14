/**
 * BLĀCK-PLĀYER RSA
 * LAYER 5 — DETERMINISTIC TRADING ENGINE & TP PROGRESSION ENGINE
 * 
 * MASTER DIRECTIVE: AI MUST NOT INVENT NUMBERS.
 * All financial mathematics, risk levels, SL offsets, TP progressions, position sizing,
 * pip distances, and exact 1:3.00+ R:R calculations are calculated deterministically here.
 */

import { instrumentTruthEngine, InstrumentSpec } from './instrumentTruthEngine';

export interface TPLevelDetail {
  level: 1 | 2 | 3 | 4;
  price: number;
  monetaryReward: number; // e.g. $4.50 for TP1, $6.00 for TP2, etc.
  riskRewardRatio: number; // e.g. 3.0, 4.0, 5.0, 6.0
  distancePips: number;
  distancePoints: number;
  percentageMove: number;
  label: string;
}

export interface DeterministicTradePlan {
  symbol: string;
  instrumentName: string;
  direction: 'Buy' | 'Sell';
  currentPrice: number;
  entryPrice: number;
  stopLossPrice: number;
  slDistancePips: number;
  slDistancePoints: number;
  
  // Monetary parameters
  monetaryRisk: number; // e.g. $1.50 default
  monetaryRewardTP1: number; // e.g. $4.50 default (1:3.00)
  riskRewardTP1: number; // e.g. 3.00
  
  // TP1 to TP4 Progression Details
  tp1: TPLevelDetail;
  tp2: TPLevelDetail;
  tp3: TPLevelDetail;
  tp4: TPLevelDetail;
  
  // Position Sizing
  recommendedLotSize: number;
  minAllowedLot: number;
  maxAllowedLot: number;
  lotStep: number;
  
  // Verification flags
  isRROk: boolean; // Hard check >= 1:3.00
  auditNotes: string[];
  calculatedAt: string;
}

export interface EngineCalculationParams {
  symbol: string;
  direction: 'Buy' | 'Sell';
  basePrice?: number;
  accountBalance?: number;
  monetaryRisk?: number; // Default $1.50
  customSlOffsetPips?: number;
  overrideMultipliers?: {
    tp1?: number; // Default 3.0
    tp2?: number; // Default 4.0
    tp3?: number; // Default 5.0
    tp4?: number; // Default 6.0
  };
}

class DeterministicTradingEngine {
  public readonly DEFAULT_BASE_RISK = 1.50; // $1.50 Standard low-risk baseline
  public readonly DEFAULT_MIN_RR = 3.00; // Hard 1:3.00 R:R Minimum

  /**
   * Helper to get standard pip size for any instrument
   */
  public getPipSize(spec: InstrumentSpec): number {
    if (spec.category === 'forex') {
      return spec.decimalPrecision === 3 || spec.decimalPrecision === 5 ? spec.tickSize * 10 : 0.0001;
    }
    if (spec.category === 'commodity') {
      return 0.1; // Gold 1 pip = $0.10
    }
    if (spec.category === 'crypto') {
      return spec.currentPrice * 0.0001;
    }
    // Deriv Synthetics (Crash, Boom, Volatility, Step)
    if (spec.symbol.includes('BOOM') || spec.symbol.includes('CRASH')) {
      return 1.0; // 1 point = 1 pip on Boom/Crash
    }
    if (spec.symbol === 'STP') {
      return 0.1;
    }
    return Math.max(spec.tickSize * 10, spec.currentPrice * 0.0001);
  }

  /**
   * Calculates the deterministic invalidation distance (SL offset) based on instrument structure.
   */
  public getStandardSLPips(spec: InstrumentSpec): number {
    if (spec.category === 'forex') {
      return 20.0; // 20 pips strict institutional SL
    }
    if (spec.category === 'commodity') {
      return 25.0; // $2.50 offset on Gold
    }
    if (spec.category === 'crypto') {
      return 150.0; // Crypto standard SL offset
    }
    if (spec.symbol.includes('BOOM') || spec.symbol.includes('CRASH')) {
      return 15.0; // 15 point structure invalidation
    }
    if (spec.symbol === 'STP') {
      return 10.0;
    }
    if (spec.symbol.includes('1HZ100') || spec.symbol.includes('R_100')) {
      return 22.0;
    }
    return 20.0;
  }

  /**
   * Generates a fully mathematically verified deterministic trade plan.
   */
  public calculateTradePlan(params: EngineCalculationParams): DeterministicTradePlan {
    const spec = instrumentTruthEngine.getSpec(params.symbol);
    const direction = params.direction;
    const isBuy = direction === 'Buy';
    const entryPrice = params.basePrice && params.basePrice > 0 ? params.basePrice : spec.currentPrice;
    
    const monetaryRisk = params.monetaryRisk && params.monetaryRisk > 0 ? params.monetaryRisk : this.DEFAULT_BASE_RISK;
    const pipSize = this.getPipSize(spec);
    const slPips = params.customSlOffsetPips && params.customSlOffsetPips > 0 ? params.customSlOffsetPips : this.getStandardSLPips(spec);
    
    const slDistancePoints = slPips * pipSize;
    const stopLossPrice = isBuy ? entryPrice - slDistancePoints : entryPrice + slDistancePoints;

    // Multipliers for Hard TP Progression
    const mTP1 = params.overrideMultipliers?.tp1 || 3.00; // 1:3.00 exact minimum
    const mTP2 = params.overrideMultipliers?.tp2 || 4.00; // 1:4.00
    const mTP3 = params.overrideMultipliers?.tp3 || 5.00; // 1:5.00
    const mTP4 = params.overrideMultipliers?.tp4 || 6.00; // 1:6.00

    // Calculate TP price levels
    const tp1DistPoints = slDistancePoints * mTP1;
    const tp2DistPoints = slDistancePoints * mTP2;
    const tp3DistPoints = slDistancePoints * mTP3;
    const tp4DistPoints = slDistancePoints * mTP4;

    const tp1Price = isBuy ? entryPrice + tp1DistPoints : entryPrice - tp1DistPoints;
    const tp2Price = isBuy ? entryPrice + tp2DistPoints : entryPrice - tp2DistPoints;
    const tp3Price = isBuy ? entryPrice + tp3DistPoints : entryPrice - tp3DistPoints;
    const tp4Price = isBuy ? entryPrice + tp4DistPoints : entryPrice - tp4DistPoints;

    // Monetary Rewards
    const monetaryRewardTP1 = Number((monetaryRisk * mTP1).toFixed(2));
    const monetaryRewardTP2 = Number((monetaryRisk * mTP2).toFixed(2));
    const monetaryRewardTP3 = Number((monetaryRisk * mTP3).toFixed(2));
    const monetaryRewardTP4 = Number((monetaryRisk * mTP4).toFixed(2));

    // Position Size Calculation
    // Risk = lotSize * slDistancePoints * (tickValue / tickSize) OR contractSize
    const pointValue = spec.pointValue > 0 ? spec.pointValue : 1.0;
    let rawLot = monetaryRisk / (slDistancePoints * pointValue);
    if (isNaN(rawLot) || rawLot <= 0) rawLot = spec.minLot;

    // Align with lot increments and clamp within bounds
    const step = spec.lotIncrement || 0.01;
    let cleanLot = Math.round(rawLot / step) * step;
    cleanLot = Math.max(spec.minLot, Math.min(spec.maxLot, cleanLot));
    const recommendedLotSize = Number(cleanLot.toFixed(step < 0.01 ? 3 : 2));

    const tp1: TPLevelDetail = {
      level: 1,
      price: Number(tp1Price.toFixed(spec.decimalPrecision)),
      monetaryReward: monetaryRewardTP1,
      riskRewardRatio: mTP1,
      distancePips: Number((slPips * mTP1).toFixed(1)),
      distancePoints: Number(tp1DistPoints.toFixed(spec.decimalPrecision)),
      percentageMove: Number(((tp1DistPoints / entryPrice) * 100).toFixed(2)),
      label: `TP1 (1:${mTP1.toFixed(1)}) — +$${monetaryRewardTP1.toFixed(2)}`
    };

    const tp2: TPLevelDetail = {
      level: 2,
      price: Number(tp2Price.toFixed(spec.decimalPrecision)),
      monetaryReward: monetaryRewardTP2,
      riskRewardRatio: mTP2,
      distancePips: Number((slPips * mTP2).toFixed(1)),
      distancePoints: Number(tp2DistPoints.toFixed(spec.decimalPrecision)),
      percentageMove: Number(((tp2DistPoints / entryPrice) * 100).toFixed(2)),
      label: `TP2 (1:${mTP2.toFixed(1)}) — +$${monetaryRewardTP2.toFixed(2)}`
    };

    const tp3: TPLevelDetail = {
      level: 3,
      price: Number(tp3Price.toFixed(spec.decimalPrecision)),
      monetaryReward: monetaryRewardTP3,
      riskRewardRatio: mTP3,
      distancePips: Number((slPips * mTP3).toFixed(1)),
      distancePoints: Number(tp3DistPoints.toFixed(spec.decimalPrecision)),
      percentageMove: Number(((tp3DistPoints / entryPrice) * 100).toFixed(2)),
      label: `TP3 (1:${mTP3.toFixed(1)}) — +$${monetaryRewardTP3.toFixed(2)}`
    };

    const tp4: TPLevelDetail = {
      level: 4,
      price: Number(tp4Price.toFixed(spec.decimalPrecision)),
      monetaryReward: monetaryRewardTP4,
      riskRewardRatio: mTP4,
      distancePips: Number((slPips * mTP4).toFixed(1)),
      distancePoints: Number(tp4DistPoints.toFixed(spec.decimalPrecision)),
      percentageMove: Number(((tp4DistPoints / entryPrice) * 100).toFixed(2)),
      label: `TP4 (1:${mTP4.toFixed(1)}) — +$${monetaryRewardTP4.toFixed(2)}`
    };

    const isRROk = mTP1 >= this.DEFAULT_MIN_RR;

    const auditNotes = [
      `Deterministic Math: Base Risk = $${monetaryRisk.toFixed(2)} | Min TP1 Reward = $${monetaryRewardTP1.toFixed(2)}`,
      `R:R Check: 1:${mTP1.toFixed(2)} ${isRROk ? '✅ PASS (>= 1:3.00 Rule)' : '❌ FAIL (< 1:3.00 Violates Policy)'}`,
      `Position Size: ${recommendedLotSize} lots (Min: ${spec.minLot}, Max: ${spec.maxLot})`,
      `Instrument Precision: ${spec.decimalPrecision} decimals | Tick: ${spec.tickSize}`
    ];

    return {
      symbol: spec.symbol,
      instrumentName: spec.name,
      direction,
      currentPrice: spec.currentPrice,
      entryPrice: Number(entryPrice.toFixed(spec.decimalPrecision)),
      stopLossPrice: Number(stopLossPrice.toFixed(spec.decimalPrecision)),
      slDistancePips: Number(slPips.toFixed(1)),
      slDistancePoints: Number(slDistancePoints.toFixed(spec.decimalPrecision)),
      monetaryRisk,
      monetaryRewardTP1,
      riskRewardTP1: mTP1,
      tp1,
      tp2,
      tp3,
      tp4,
      recommendedLotSize,
      minAllowedLot: spec.minLot,
      maxAllowedLot: spec.maxLot,
      lotStep: spec.lotIncrement,
      isRROk,
      auditNotes,
      calculatedAt: new Date().toISOString()
    };
  }
}

export const deterministicTradingEngine = new DeterministicTradingEngine();
