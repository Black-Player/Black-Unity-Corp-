/**
 * BLĀCK-PLĀYER RSA
 * LAYER 7 — MEMORY ENGINE
 * 
 * Persistent Signal Memory, User Memory, and System Knowledge Base.
 * Coordinates historical performance, user DNA adaptation, and persistent intelligence.
 */

import { Signal, UserProfile, Trade } from '../types';
import { dbService } from './dbService';

export interface SignalMemoryRecord {
  id: string;
  symbol: string;
  direction: 'Buy' | 'Sell';
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  riskReward: number;
  monetaryRisk: number;
  strategy: string;
  aiSpecialist: string;
  marketRegime: string;
  status: 'active' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'tp4_hit' | 'be_hit' | 'sl_hit' | 'closed' | 'rejected' | 'archived';
  outcome?: 'WIN' | 'LOSS' | 'BREAK_EVEN';
  pnlDollar?: number;
  confluenceScore: string;
  createdAt: string;
  closedAt?: string;
  historicalLessons?: string[];
}

export interface UserMemoryProfile {
  uid: string;
  preferredSpecialists: string[];
  preferredPairs: string[];
  preferredTimeframes: string[];
  tradingStyle: 'Scalp' | 'Intraday' | 'Swing';
  experienceLevel: 'Initiate' | 'Developing' | 'Disciplined' | 'Elite' | 'Ascended';
  disciplineScore: number;
  totalSignalsConsumed: number;
  winRate: number;
  totalPnl: number;
  commonMistakesLogged: string[];
  strengthsIdentified: string[];
  lastUpdated: string;
}

export interface SystemKnowledgeTopic {
  id: string;
  category: 'SMC' | 'ICT' | 'PRICE_ACTION' | 'MMM' | 'SUPPLY_DEMAND' | 'RISK_MANAGEMENT';
  title: string;
  coreConcept: string;
  whenAppropriate: string;
  whenAvoided: string;
  entryConditions: string[];
  confirmationConditions: string[];
  invalidationRules: string[];
  riskConsiderations: string;
  commonMistakes: string[];
}

export const MASTER_KNOWLEDGE_BASE: SystemKnowledgeTopic[] = [
  {
    id: 'kb-smc-01',
    category: 'SMC',
    title: 'Order Block & Liquidity Inducement Mitigation',
    coreConcept: 'An Order Block (OB) represents the footprint of institutional order flow where massive institutional liquidity was accumulated prior to an impulsive structural displacement.',
    whenAppropriate: 'When a clean Break of Structure (BOS) or Change of Character (CHoCH) occurs after a liquidity sweep, leaving unmitigated institutional imbalances.',
    whenAvoided: 'During low-volume consolidations, dead market hours, or when price has already tapped and fully mitigated the zone multiple times.',
    entryConditions: [
      'Identification of unmitigated high-timeframe order block in discount/premium zone',
      'Clear liquidity sweep of recent swing highs or lows',
      'Imbalance / Fair Value Gap created on displacement move'
    ],
    confirmationConditions: [
      'Lower-timeframe CHoCH confirming institutional intent',
      'Volume spike on rejection from the Order Block',
      'Clean wick rejection rejecting beyond the 50% equilibrium of the OB'
    ],
    invalidationRules: [
      'Candle body closes beyond the extreme wick of the Order Block',
      'Structural shift in opposite direction before reaching entry'
    ],
    riskConsiderations: 'Always cap maximum trade risk at $1.50 (or configured account rule) with strict 1:3.00+ R:R target at TP1.',
    commonMistakes: [
      'Entering blindly on the first touch without lower timeframe confirmation',
      'Trading internal structure order blocks rather than major swing highs/lows',
      'Moving stop loss wider when price begins testing the outer edge of the OB'
    ]
  },
  {
    id: 'kb-ict-02',
    category: 'ICT',
    title: 'Kill Zone Session Liquidity & Judas Swing',
    coreConcept: 'Algorithmic time-and-price models that exploit institutional volume injection during London (02:00-05:00 EST) and New York (07:00-10:00 EST) Kill Zones.',
    whenAppropriate: 'During the first 90 minutes of active London and New York sessions when the daily manipulation (Judas Swing) traps retail breakout traders.',
    whenAvoided: 'During Asian consolidation range or 10 minutes before and after high-impact red-folder CPI / NFP news releases.',
    entryConditions: [
      'Price sweeps Asian session high or low during London open',
      'Fast aggressive rejection displacing back into the daily range',
      'Formation of an ICT Fair Value Gap (FVG) on M5 / M15'
    ],
    confirmationConditions: [
      'M5 Market Structure Shift (MSS) with energetic displacement',
      'Price retraces into the 62% - 79% Optimal Trade Entry (OTE) Fibonacci zone'
    ],
    invalidationRules: [
      'Price breaks and closes beyond the manipulation swing high/low',
      'Session window expires without structural shift'
    ],
    riskConsiderations: 'Strict invalidation placed 22 pips behind the session extreme with automated break-even at TP1.',
    commonMistakes: [
      'Chasing the initial breakout before the liquidity sweep occurs',
      'Trading outside designated Kill Zone algorithmic hours',
      'Failing to trail to Break Even once TP1 (+1:3 R:R) is banked'
    ]
  },
  {
    id: 'kb-pa-03',
    category: 'PRICE_ACTION',
    title: 'Multi-Timeframe Structure & Key Support/Resistance Flips',
    coreConcept: 'Reading raw price delivery through higher timeframe market structure, support/resistance flips, and high-probability candlestick exhaustion triggers.',
    whenAppropriate: 'When price cleanly trends in higher timeframe channels and retests previous major support turned resistance or resistance turned support.',
    whenAvoided: 'In low-liquidity chopped ranges where wicks frequently expand in both directions without follow-through.',
    entryConditions: [
      'Clear identification of Higher Highs / Higher Lows (Uptrend) or Lower Highs / Lower Lows (Downtrend)',
      'Retest of broken key level (Support turned Resistance or vice versa)',
      'Candlestick trigger: Pinbar, Engulfing, or Morning/Evening Star'
    ],
    confirmationConditions: [
      'Candle close confirming momentum rejection at key level',
      'Confluence with psychological whole number levels'
    ],
    invalidationRules: [
      'Candle closes fully inside the invalidation zone beyond the swing point'
    ],
    riskConsiderations: 'Standard low-risk $1.50 model with TP1 set at 1:3.00 R:R minimum.',
    commonMistakes: [
      'Entering before the trigger candle closes',
      'Ignoring higher timeframe prevailing trend bias'
    ]
  }
];

class MemoryEngine {
  private localSignalMemory: Map<string, SignalMemoryRecord> = new Map();

  /**
   * Records a signal into persistent Signal Memory.
   */
  public async recordSignal(signal: Signal, monetaryRisk = 1.50): Promise<void> {
    const memoryRecord: SignalMemoryRecord = {
      id: signal.id,
      symbol: signal.pair,
      direction: signal.decision === 'Sell' ? 'Sell' : 'Buy',
      entry: signal.entry,
      stopLoss: signal.stop_loss,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      riskReward: signal.risk_reward || 3.0,
      monetaryRisk,
      strategy: signal.strategy,
      aiSpecialist: signal.ai_bot,
      marketRegime: signal.market_regime || 'Trending',
      status: signal.status || 'active',
      confluenceScore: signal.confluence_score || '7/7',
      createdAt: signal.created_at || new Date().toISOString()
    };

    this.localSignalMemory.set(signal.id, memoryRecord);

    try {
      await dbService.create('signal_memory', memoryRecord as any);
    } catch (e) {
      console.warn('[MemoryEngine] Offline signal memory cache active:', e);
    }
  }

  /**
   * Updates signal outcome and stores historical trading lessons.
   */
  public async updateSignalOutcome(signalId: string, status: SignalMemoryRecord['status'], outcome: 'WIN' | 'LOSS' | 'BREAK_EVEN', pnlDollar: number): Promise<void> {
    const existing = this.localSignalMemory.get(signalId);
    if (existing) {
      existing.status = status;
      existing.outcome = outcome;
      existing.pnlDollar = pnlDollar;
      existing.closedAt = new Date().toISOString();
      
      if (outcome === 'WIN') {
        existing.historicalLessons = [`Signal reached ${status.toUpperCase()} with pristine execution and discipline.`];
      } else if (outcome === 'BREAK_EVEN') {
        existing.historicalLessons = [`Protected capital at Break Even following TP1 expansion.`];
      } else {
        existing.historicalLessons = [`Controlled invalidation at -$${existing.monetaryRisk.toFixed(2)}. Risk strictly managed.`];
      }
    }

    try {
      await dbService.update('signal_memory', signalId, {
        status,
        outcome,
        pnlDollar,
        closedAt: new Date().toISOString()
      } as any);
    } catch (e) {
      // Offline fallback
    }
  }

  /**
   * Retrieves knowledge topic by category or keyword.
   */
  public getKnowledge(keyword: string): SystemKnowledgeTopic[] {
    const term = keyword.toLowerCase();
    return MASTER_KNOWLEDGE_BASE.filter(k => 
      k.title.toLowerCase().includes(term) ||
      k.coreConcept.toLowerCase().includes(term) ||
      k.category.toLowerCase().includes(term)
    );
  }

  /**
   * Returns all knowledge topics.
   */
  public getAllKnowledge(): SystemKnowledgeTopic[] {
    return MASTER_KNOWLEDGE_BASE;
  }
}

export const memoryEngine = new MemoryEngine();
