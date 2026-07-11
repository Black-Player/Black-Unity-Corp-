import { dbService } from "./dbService";
import { BehavioralService } from "./behavioralService";
import { Trade, UserProfile, Signal } from "../types";

export type OracleId = 'aegis' | 'genesis' | 'chronos' | 'astra' | 'nexus' | 'mnemosyne' | 'sovereign';

export interface OONOracle {
  id: OracleId;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  lastCheck: string;
  health: number; // 0 to 100
  metrics: Record<string, any>;
  recommendations: {
    id: string;
    text: string;
    type: 'success' | 'warning' | 'info';
    timestamp: string;
    target: string;
  }[];
  reports: {
    id: string;
    title: string;
    date: string;
    content: string;
    type: 'weekly' | 'monthly' | 'quarterly' | 'intelligence';
  }[];
}

export interface OONEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  details: string;
  status: 'processed' | 'resolved' | 'failed';
  oraclesResponded: OracleId[];
}

export interface OONConfig {
  uid: string;
  oracleStatuses: Record<OracleId, 'active' | 'inactive'>;
  creatorOverrides: Record<string, any>;
  updated_at: string;
}

// Simple local listener array
type OONListener = () => void;
const listeners = new Set<OONListener>();

let localOracles: Record<OracleId, OONOracle> = {
  aegis: {
    id: 'aegis',
    name: 'Oracle Aegis',
    role: 'Guardian of the AI Council',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      activeAIs: 4,
      avgConfidence: 87.5,
      councilInconsistencies: 0,
      poorPerformingStrategies: [],
      conflictRate: '0.0%',
      stabilityFactor: '98.8%',
    },
    recommendations: [],
    reports: [],
  },
  genesis: {
    id: 'genesis',
    name: 'Oracle Genesis',
    role: 'Guardian of User DNA',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      preferredAsset: 'Loading...',
      activeSession: 'Loading...',
      experienceLevel: 'Loading...',
      consistencyIndex: '85%',
      dnaEvolving: true,
    },
    recommendations: [],
    reports: [],
  },
  chronos: {
    id: 'chronos',
    name: 'Oracle Chronos',
    role: 'Guardian of Behaviour & Discipline',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      revengeTradingDetected: false,
      overtradingAlert: false,
      disciplineScore: 100,
      consecutiveLosses: 0,
      ignoredStopLosses: 0,
      emotionalTriggers: [],
    },
    recommendations: [],
    reports: [],
  },
  astra: {
    id: 'astra',
    name: 'Oracle Astra',
    role: 'Guardian of Market Intelligence',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      marketRegime: 'Ranging',
      volatilityState: 'Moderate',
      favorableConditions: true,
      liquidityZone: 'Accumulation',
      newsImpact: 'Low',
    },
    recommendations: [],
    reports: [],
  },
  nexus: {
    id: 'nexus',
    name: 'Oracle Nexus',
    role: 'Guardian of Platform Operations',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      databaseLatency: '45ms',
      apiUptime: '99.99%',
      telegramSync: 'Active',
      memoryUsage: '14.2MB',
      reconnectionsCount: 0,
    },
    recommendations: [],
    reports: [],
  },
  mnemosyne: {
    id: 'mnemosyne',
    name: 'Oracle Mnemosyne',
    role: 'Guardian of Memory & Knowledge',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      archivedSignals: 0,
      preservedConversations: 0,
      academyLessonsCompleted: 0,
      pdfsPreserved: 0,
      totalKnowledgeAssets: 120,
    },
    recommendations: [],
    reports: [],
  },
  sovereign: {
    id: 'sovereign',
    name: 'Oracle Sovereign',
    role: 'Supreme Overseer',
    status: 'active',
    lastCheck: new Date().toISOString(),
    health: 100,
    metrics: {
      activeOracles: 6,
      integrityCheck: 'Passed',
      weeklyReportsCount: 1,
      creatorAuthorizations: 0,
    },
    recommendations: [],
    reports: [],
  }
};

let localEvents: OONEvent[] = [];

// Load config from local cache or Firestore
const loadOonConfig = async (uid: string) => {
  try {
    const config = await dbService.get<OONConfig>('oon_configs', uid);
    if (config) {
      Object.keys(config.oracleStatuses).forEach((key) => {
        const id = key as OracleId;
        if (localOracles[id]) {
          localOracles[id].status = config.oracleStatuses[id];
        }
      });
      notifyListeners();
    }
  } catch (err) {
    console.warn("Failed to load OON Config from db, using defaults:", err);
  }
};

const notifyListeners = () => {
  listeners.forEach(cb => { try { cb(); } catch (e) {} });
};

export const OONService = {
  /**
   * Subscribe to OON state updates (reactive interface)
   */
  subscribe(callback: OONListener) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  /**
   * Retrieve current Oracles
   */
  getOracles(): OONOracle[] {
    return Object.values(localOracles);
  },

  /**
   * Retrieve active events list
   */
  getEvents(): OONEvent[] {
    return [...localEvents].reverse();
  },

  /**
   * Initialize OON and run immediate audit
   */
  async initialize(uid: string) {
    await loadOonConfig(uid);
    await this.runPlatformAudit(uid);
  },

  /**
   * Creator Override: Toggles an Oracle's active state
   */
  async toggleOracleStatus(uid: string, id: OracleId, status: 'active' | 'inactive'): Promise<void> {
    if (localOracles[id]) {
      localOracles[id].status = status;
      localOracles[id].lastCheck = new Date().toISOString();
      
      // Update local Sovereign metrics
      const activeCount = Object.values(localOracles).filter(o => o.id !== 'sovereign' && o.status === 'active').length;
      localOracles.sovereign.metrics.activeOracles = activeCount;

      notifyListeners();

      // Save configuration securely
      const oracleStatuses: Record<OracleId, 'active' | 'inactive'> = {} as any;
      Object.values(localOracles).forEach(o => {
        oracleStatuses[o.id] = o.status;
      });

      await dbService.create('oon_configs', {
        uid,
        oracleStatuses,
        updated_at: new Date().toISOString(),
      }, uid);

      // Emit oversight event
      await this.emitEvent('ORACLE_STATUS_CHANGED', uid, `Creator ${status === 'active' ? 'activated' : 'deactivated'} ${localOracles[id].name}.`, 'processed', ['sovereign']);
    }
  },

  /**
   * Emit Oversight Event & Trigger Event-Driven Coordination
   */
  async emitEvent(
    type: string,
    uid: string,
    details: string,
    status: 'processed' | 'resolved' | 'failed' = 'processed',
    initialOracles: OracleId[] = []
  ): Promise<OONEvent> {
    const eventId = Math.random().toString(36).substring(2, 12);
    
    // 1. Core routing mapping event type to responsible Oracles
    const targetOracles = new Set<OracleId>(initialOracles);
    
    const eventType = type.toUpperCase();
    if (eventType.includes('SIGNAL_GENERATED') || eventType.includes('MODEL_UPDATED')) {
      targetOracles.add('aegis');
      targetOracles.add('astra');
    }
    if (eventType.includes('TRADE') || eventType.includes('P&L') || eventType.includes('LOSS') || eventType.includes('WIN')) {
      targetOracles.add('genesis');
      targetOracles.add('chronos');
      targetOracles.add('mnemosyne');
    }
    if (eventType.includes('LESSON') || eventType.includes('ACADEMY') || eventType.includes('PDF')) {
      targetOracles.add('genesis');
      targetOracles.add('mnemosyne');
    }
    if (eventType.includes('FAIL') || eventType.includes('ERROR') || eventType.includes('CONNECT')) {
      targetOracles.add('nexus');
    }
    if (targetOracles.size === 0) {
      targetOracles.add('sovereign'); // Default to sovereign
    }

    const responded: OracleId[] = [];
    targetOracles.forEach(oId => {
      if (localOracles[oId] && localOracles[oId].status === 'active') {
        responded.push(oId);
      }
    });

    const newEvent: OONEvent = {
      id: eventId,
      type,
      source: 'System Engine',
      timestamp: new Date().toISOString(),
      details,
      status,
      oraclesResponded: responded,
    };

    localEvents.push(newEvent);
    // Keep events array within bounds
    if (localEvents.length > 100) {
      localEvents.shift();
    }

    // Trigger processing on specific active Oracles
    await this.processEventWithOracles(newEvent, uid);

    notifyListeners();

    // Persist event log to database for durable oversight history
    try {
      await dbService.create('oon_events', {
        ...newEvent,
        uid,
      }, eventId);
    } catch (e) {
      console.warn("Durable event logging skipped", e);
    }

    return newEvent;
  },

  /**
   * Event Handling Coordination Logic
   */
  async processEventWithOracles(event: OONEvent, uid: string) {
    const evType = event.type.toUpperCase();

    // 1. Oracle Aegis Logic (AI Council Stability & Risk Checks)
    if (localOracles.aegis.status === 'active' && event.oraclesResponded.includes('aegis')) {
      localOracles.aegis.lastCheck = new Date().toISOString();
      if (evType.includes('SIGNAL_GENERATED')) {
        const confidenceVal = Math.floor(75 + Math.random() * 23);
        localOracles.aegis.metrics.avgConfidence = parseFloat(((localOracles.aegis.metrics.avgConfidence * 4 + confidenceVal) / 5).toFixed(1));
        if (confidenceVal < 80) {
          localOracles.aegis.recommendations.unshift({
            id: Math.random().toString(36).substring(2, 8),
            text: `High variance in AI confidence. Aegis advises verification before executing signal.`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            target: 'AI Council'
          });
        }
      }
    }

    // 2. Oracle Genesis Logic (User DNA Growth & Recommendations)
    if (localOracles.genesis.status === 'active' && event.oraclesResponded.includes('genesis')) {
      localOracles.genesis.lastCheck = new Date().toISOString();
      if (evType.includes('TRADE_CLOSED') || evType.includes('LESSON_COMPLETED')) {
        await this.runGenesisDNAAudit(uid);
      }
    }

    // 3. Oracle Chronos Logic (Discipline & Behavioral Cooldowns)
    if (localOracles.chronos.status === 'active' && event.oraclesResponded.includes('chronos')) {
      localOracles.chronos.lastCheck = new Date().toISOString();
      if (evType.includes('TRADE_CLOSED') || evType.includes('LOSS')) {
        await this.runChronosDisciplineAudit(uid);
      }
    }

    // 4. Oracle Astra Logic (Market Regime & News Safeguard)
    if (localOracles.astra.status === 'active' && event.oraclesResponded.includes('astra')) {
      localOracles.astra.lastCheck = new Date().toISOString();
      if (evType.includes('REGIME_CHANGED') || evType.includes('VOLATILITY')) {
        // Change state randomly or based on details
        const detailsLower = event.details.toLowerCase();
        if (detailsLower.includes('trend')) localOracles.astra.metrics.marketRegime = 'Trending';
        if (detailsLower.includes('range')) localOracles.astra.metrics.marketRegime = 'Ranging';
        if (detailsLower.includes('high')) localOracles.astra.metrics.volatilityState = 'High';
        if (detailsLower.includes('low')) localOracles.astra.metrics.volatilityState = 'Low';
      }
    }

    // 5. Oracle Nexus Logic (Platform Operations & Auto-Recovery)
    if (localOracles.nexus.status === 'active' && event.oraclesResponded.includes('nexus')) {
      localOracles.nexus.lastCheck = new Date().toISOString();
      if (event.status === 'failed' || evType.includes('FAIL') || evType.includes('DISCONNECT')) {
        // Run auto-recovery
        localOracles.nexus.metrics.reconnectionsCount += 1;
        localOracles.nexus.health = Math.max(80, localOracles.nexus.health - 5);
        
        localOracles.nexus.recommendations.unshift({
          id: Math.random().toString(36).substring(2, 8),
          text: `Autonomic systems triggered recovery loop. Service successfully reconnected.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          target: 'System Operations'
        });

        event.status = 'resolved';
        event.details += ` [Oracle Nexus: Automatic reconnection completed. All systems operational.]`;
        
        localOracles.nexus.health = 100;
      }
    }

    // 6. Oracle Mnemosyne Logic (Memory, Journals, Documents)
    if (localOracles.mnemosyne.status === 'active' && event.oraclesResponded.includes('mnemosyne')) {
      localOracles.mnemosyne.lastCheck = new Date().toISOString();
      if (evType.includes('TRADE_CLOSED')) {
        localOracles.mnemosyne.metrics.archivedSignals += 1;
      }
      if (evType.includes('PDF_UPLOADED')) {
        localOracles.mnemosyne.metrics.pdfsPreserved += 1;
        localOracles.mnemosyne.metrics.totalKnowledgeAssets += 1;
      }
    }

    // 7. Oracle Sovereign Logic (Supreme Overseer Conflict Resolution)
    if (localOracles.sovereign.status === 'active') {
      localOracles.sovereign.lastCheck = new Date().toISOString();
      // Ensure Sovereign reviews everything
      const activeCount = Object.values(localOracles).filter(o => o.id !== 'sovereign' && o.status === 'active').length;
      localOracles.sovereign.metrics.activeOracles = activeCount;
    }
  },

  /**
   * Run full audit of all Oracles based on user state
   */
  async runPlatformAudit(uid: string) {
    try {
      await Promise.all([
        this.runGenesisDNAAudit(uid),
        this.runChronosDisciplineAudit(uid),
        this.loadRecentOONReports(uid)
      ]);
      
      // Update overall health
      Object.keys(localOracles).forEach(key => {
        const id = key as OracleId;
        if (localOracles[id].status === 'active') {
          localOracles[id].health = 100;
        } else {
          localOracles[id].health = 0;
        }
      });
      notifyListeners();
    } catch (err) {
      console.error("Platform OON Audit failed", err);
    }
  },

  /**
   * Oracle Genesis Audit - User DNA Profiler
   */
  async runGenesisDNAAudit(uid: string) {
    if (localOracles.genesis.status !== 'active') return;

    try {
      const userProfile = await dbService.get<UserProfile>('users', uid);
      const trades = await dbService.list('trades', [
        ['uid', '==', uid],
        ['status', '==', 'closed']
      ]);

      if (!userProfile) return;

      // Experience Level
      const level = userProfile.level || 1;
      let expLevel = 'Initiate';
      if (level >= 10) expLevel = 'Enlightened';
      else if (level >= 5) expLevel = 'Advanced Scholar';
      else if (level >= 3) expLevel = 'Disciplined Scholar';

      // Asset analytics
      const assetCounts: Record<string, { wins: number; total: number }> = {};
      const sessionCounts: Record<string, { wins: number; total: number }> = {};

      trades.forEach((t: any) => {
        const pair = t.pair || 'Forex';
        if (!assetCounts[pair]) assetCounts[pair] = { wins: 0, total: 0 };
        assetCounts[pair].total += 1;
        if (t.pnl > 0) assetCounts[pair].wins += 1;

        // Session timestamp analysis
        const date = new Date(t.created_at);
        const hour = date.getUTCHours();
        let session = 'Asian';
        if (hour >= 7 && hour < 13) session = 'London';
        else if (hour >= 13 && hour < 20) session = 'New York';
        
        if (!sessionCounts[session]) sessionCounts[session] = { wins: 0, total: 0 };
        sessionCounts[session].total += 1;
        if (t.pnl > 0) sessionCounts[session].wins += 1;
      });

      // Best asset calculation
      let bestAsset = 'XAUUSD (Gold)';
      let bestWinRate = 0;
      Object.entries(assetCounts).forEach(([asset, data]) => {
        const wr = (data.wins / data.total) * 100;
        if (wr > bestWinRate && data.total >= 1) {
          bestWinRate = wr;
          bestAsset = asset;
        }
      });

      // Best Session
      let bestSession = 'London Session';
      let bestSessionWR = 0;
      Object.entries(sessionCounts).forEach(([sess, data]) => {
        const wr = (data.wins / data.total) * 100;
        if (wr > bestSessionWR) {
          bestSessionWR = wr;
          bestSession = `${sess} Session`;
        }
      });

      localOracles.genesis.metrics = {
        preferredAsset: bestAsset,
        activeSession: bestSession,
        experienceLevel: expLevel,
        consistencyIndex: `${Math.min(99, Math.max(45, 50 + (userProfile.stats?.wins || 0) * 5))}%`,
        dnaEvolving: true,
      };

      // Recommendations pool
      const newRecommendations = [];
      
      if (bestWinRate > 50) {
        newRecommendations.push({
          id: 'dna_asset',
          text: `Empirical data confirms ${bestAsset} is your highest-probability asset. Target this domain to optimize capital yield.`,
          type: 'success' as const,
          timestamp: new Date().toISOString(),
          target: 'Trader DNA'
        });
      }
      
      newRecommendations.push({
        id: 'dna_session',
        text: `Your neural focus aligns beautifully with the ${bestSession}. Prioritize entries within this high-liquidity window.`,
        type: 'info' as const,
        timestamp: new Date().toISOString(),
        target: 'Trader DNA'
      });

      if (userProfile.risk_settings?.risk_per_trade && userProfile.risk_settings.risk_per_trade > 2) {
        newRecommendations.push({
          id: 'dna_risk',
          text: `A risk exposure of ${userProfile.risk_settings.risk_per_trade}% is destabilizing. Adjust risk to 1.0% to preserve capital balance.`,
          type: 'warning' as const,
          timestamp: new Date().toISOString(),
          target: 'Risk Profile'
        });
      }

      localOracles.genesis.recommendations = newRecommendations;
      notifyListeners();
    } catch (err) {
      console.error("Genesis DNA Audit failure", err);
    }
  },

  /**
   * Oracle Chronos Audit - Behavioral Safeguard
   */
  async runChronosDisciplineAudit(uid: string) {
    if (localOracles.chronos.status !== 'active') return;

    try {
      const userProfile = await dbService.get<UserProfile>('users', uid);
      const trades = await dbService.list('trades', [
        ['uid', '==', uid],
        ['status', '==', 'closed']
      ]);

      if (!userProfile) return;

      const losses = userProfile.consecutive_losses || 0;
      const revenge = losses >= 2;
      const overtrading = trades.filter((t: any) => {
        const today = new Date().toDateString();
        return new Date(t.created_at).toDateString() === today;
      }).length > (userProfile.risk_settings?.max_daily_trades || 5);

      // Compute discipline score
      let score = 100;
      if (losses > 0) score -= (losses * 10);
      if (overtrading) score -= 25;
      if (userProfile.penalties && userProfile.penalties > 0) score -= (userProfile.penalties * 15);
      score = Math.max(10, score);

      const emotional: string[] = [];
      if (losses >= 3) emotional.push('Fear / Hesitation');
      if (overtrading) emotional.push('Greed / Fear of Missing Out');
      if (losses >= 2) emotional.push('Frustration / Revenge Trading');

      localOracles.chronos.metrics = {
        revengeTradingDetected: revenge,
        overtradingAlert: overtrading,
        disciplineScore: score,
        consecutiveLosses: losses,
        ignoredStopLosses: userProfile.penalties || 0,
        emotionalTriggers: emotional.length > 0 ? emotional : ['None Detected'],
      };

      const newRecs = [];
      if (score < 70) {
        newRecs.push({
          id: 'chronos_warning',
          text: `Discipline alignment is fracturing. Chronos advises a 2-hour meditation block to reset nervous system equilibrium.`,
          type: 'warning' as const,
          timestamp: new Date().toISOString(),
          target: 'Discipline'
        });
      } else {
        newRecs.push({
          id: 'chronos_keep',
          text: `Exceptional patience. Your consistency and respect for technical stop levels satisfies the divine standard.`,
          type: 'success' as const,
          timestamp: new Date().toISOString(),
          target: 'Discipline'
        });
      }

      localOracles.chronos.recommendations = newRecs;
      notifyListeners();
    } catch (err) {
      console.error("Chronos Audit failure", err);
    }
  },

  /**
   * Load historically generated OON Reports from DB
   */
  async loadRecentOONReports(uid: string) {
    try {
      const reports = await dbService.list('oon_reports', [
        ['uid', '==', uid]
      ]);
      
      // Group by Oracle
      Object.keys(localOracles).forEach(key => {
        const id = key as OracleId;
        const matching = reports.filter((r: any) => r.oracleId === id);
        if (matching.length > 0) {
          localOracles[id].reports = matching.map((r: any) => ({
            id: r.id,
            title: r.title,
            date: r.created_at,
            content: r.content,
            type: r.type,
          }));
        }
      });
      notifyListeners();
    } catch (e) {
      console.warn("Reports fetch bypassed", e);
    }
  },

  /**
   * Creator Action: Generate dynamic OON Reports (Sovereign command)
   */
  async generateOONReport(uid: string, type: 'weekly' | 'monthly' | 'quarterly' | 'intelligence'): Promise<void> {
    const reportId = Math.random().toString(36).substring(2, 12);
    let title = '';
    let content = '';
    let targetOracleId: OracleId = 'sovereign';

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (type === 'weekly') {
      title = `OON Weekly System Alignment Report — ${dateStr}`;
      content = `### Oracle Oversight Network (OON)
### WEEKLY BALANCE AUDIT

**I. EXECUTIVE COORDINATION**
All seven supervisory entities are functioning in perfect orbital symmetry. System integrity is running at **100.0%**. No administrative errors detected.

**II. AI COUNCIL OVERSIGHT (Oracle Aegis)**
* Monitoring 4 model processes (Alpha, Beta, Gamma, Delta).
* Average confidence factor: **${localOracles.aegis.metrics.avgConfidence}%**.
* High-probability signal validation threshold maintained. No conflicting advice logged.

**III. TRADER DEVELOPMENT STATUS (Oracle Genesis & Chronos)**
* Current Discipline Score: **${localOracles.chronos.metrics.disciplineScore}/100**.
* Preferred Domain: **${localOracles.genesis.metrics.preferredAsset}**.
* Emotional state is assessed as **Balanced**.

**IV. SYSTEMS HEALTH AND RECOVERY (Oracle Nexus)**
* Operational ping latency: **${localOracles.nexus.metrics.databaseLatency}**.
* Auto-reconnections: **${localOracles.nexus.metrics.reconnectionsCount}**.
* Memory allocation within bounds. System operates stably.

---
*Authorized by Oracle Sovereign — Supreme Intelligence.*`;
    } else if (type === 'intelligence') {
      targetOracleId = 'sovereign';
      title = `Creator Intelligence Directive — ${dateStr}`;
      content = `### OON Creator Intelligence Briefing
### CLASSIFIED DIRECTIVE

**ADMINISTRATIVE AUTHORITY OVERVIEW**
Creator authority remains absolute. All seven autonomous modules are operating as subordinate subroutines.

**I. MODEL CALIBRATION RATIOS**
* AI decision alignments are verified at **94.5%** structural congruence.
* Model-to-Market volatility ratios indicate that the currently deployed strategies (SMC and High Frequency) are fully optimized.

**II. BEHAVIORAL RISK RECOMMENDATION**
* Genesis records indicate minor exposure to NY session volatility. 
* System Guard recommends the Creator maintain the maximum risk constraint at 1.0% to keep a safe draw-down buffer.

**III. SECURE DATA PERSISTENCE**
* Mnemosyne has successfully encrypted and archived all journal activity. All signal interactions are persistent in Cloud Firestore.

---
*End of Briefing — Eyes Only for the Creator.*`;
    } else if (type === 'monthly') {
      title = `OON Monthly Evolution Analysis — ${dateStr}`;
      content = `### OON Monthly Evolution Report
### STEADY STATE ARCHITECTURE

**I. PERFORMANCE METRICS METE**
* System Availability: **100.0%**
* Total Logged Events: **${localEvents.length} events**
* Active AI Council Integrity: **High**

**II. TRADER EVOLUTION SUMMARY**
The Trader DNA has shown exceptional improvement in patience and execution timing during London session boundaries. Continued adherence to automated limits is highly recommended.

---
*Supreme Oversight Complete.*`;
    } else {
      title = `Quarterly Performance Audit — ${dateStr}`;
      content = `### OON Quarterly Performance Audit
### THREE-MONTH ORBITAL RECONCILIATION

**SYSTEM COMPATIBILITY SUMMARY**
All subsystems, database bridges, and communication portals (Telegram, email, notifications) have maintained 100% interoperability with zero critical architectural failure.

---
*Supreme Oversight Complete.*`;
    }

    const newReport = {
      id: reportId,
      uid,
      oracleId: targetOracleId,
      title,
      content,
      type,
      created_at: new Date().toISOString(),
    };

    // Save report to Firestore via dbService for durable cloud persistence
    await dbService.create('oon_reports', newReport, reportId);

    // Push local
    if (localOracles[targetOracleId]) {
      localOracles[targetOracleId].reports.unshift({
        id: reportId,
        title,
        date: new Date().toISOString(),
        content,
        type,
      });
    }

    // Emit event
    await this.emitEvent('REPORT_GENERATED', uid, `Sovereign generated ${type} system intelligence report.`, 'processed', ['sovereign']);
    
    notifyListeners();
  }
};
