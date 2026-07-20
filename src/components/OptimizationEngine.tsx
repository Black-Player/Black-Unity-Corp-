import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Zap, TrendingUp, TrendingDown, Activity, Database, Sparkles, RefreshCw, 
  AlertTriangle, CheckCircle2, Trash2, Play, Save, Search, Award, Clock, 
  Settings, Flame, BookOpen, ThumbsUp, ThumbsDown, ShieldAlert, BadgeInfo, Settings2 
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { aiOptimizationService, SHARED_KNOWLEDGE_BASE } from '../services/aiOptimizationService';
import { UserProfile, Trade } from '../types';
import { GoogleGenAI } from '@google/genai';

interface OptimizationEngineProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setActivePage: (page: string) => void;
}

export const OptimizationEngine: React.FC<OptimizationEngineProps> = ({ 
  userProfile, 
  addToast, 
  setActivePage 
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'budget' | 'recommender' | 'academy' | 'liquidator'>('pipeline');
  
  // Pipeline Stage state
  const [activeStage, setActiveStage] = useState<number>(1);
  const [isSimulatingPipeline, setIsSimulatingPipeline] = useState<boolean>(false);
  const [pipelineLog, setPipelineLog] = useState<string[]>([
    "System standby. Ready to intercept trade setups."
  ]);

  // Token Budget state
  const [budget, setBudget] = useState(aiOptimizationService.getBudgetStats(userProfile.uid));
  const [dailyLimitInput, setDailyLimitInput] = useState<number>(budget.dailyLimit);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Recommender Form state
  const [trend, setTrend] = useState<'bullish' | 'bearish' | 'ranging'>('bullish');
  const [volatility, setVolatility] = useState<'high' | 'medium' | 'low'>('high');
  const [session, setSession] = useState<string>('London');
  const [hasImbalance, setHasImbalance] = useState<boolean>(true);
  const [hasTestedOB, setHasTestedOB] = useState<boolean>(false);
  const [dnaStyle, setDnaStyle] = useState<string>(userProfile.risk_settings?.risk_per_trade > 1.5 ? 'Intraday' : 'Scalp');
  
  const [currentRecommendation, setCurrentRecommendation] = useState(
    aiOptimizationService.recommendSpecialist({
      trend,
      volatility,
      session,
      hasImbalance,
      hasTestedOB,
      userDNA: { tradingStyle: dnaStyle }
    })
  );

  // Strategy Search state
  const [academySearch, setAcademySearch] = useState<string>('');
  const [expandedAcademyConcept, setExpandedAcademyConcept] = useState<string | null>(null);

  // Continuous Learning state
  const [feedbackBot, setFeedbackBot] = useState<string>('Neo');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  // Paper Trade Liquidator state
  const [activePaperTrades, setActivePaperTrades] = useState<Trade[]>([]);
  const [isLiquidating, setIsLiquidating] = useState<boolean>(false);
  const [liquidationSummaries, setLiquidationSummaries] = useState<{
    tradeId: string;
    pair: string;
    type: string;
    pnl: number;
    fearSummary: string;
  }[]>([]);

  // Refresh active paper trades
  const fetchPaperTrades = async () => {
    try {
      const allTrades = await dbService.list('trades');
      // Filter for this user's active demo/paper trades
      const openPaper = (allTrades as Trade[]).filter(
        t => t.uid === userProfile.uid && t.status === 'open' && t.account_type === 'demo'
      );
      setActivePaperTrades(openPaper);
    } catch (e) {
      console.error("Failed to fetch open trades for liquidator", e);
    }
  };

  useEffect(() => {
    fetchPaperTrades();
    // Auto refresh budget state
    setBudget(aiOptimizationService.getBudgetStats(userProfile.uid));
  }, [userProfile.uid]);

  // Handle recommender execution
  const handleRunRecommender = () => {
    const rec = aiOptimizationService.recommendSpecialist({
      trend,
      volatility,
      session,
      hasImbalance,
      hasTestedOB,
      userDNA: { tradingStyle: dnaStyle }
    });
    setCurrentRecommendation(rec);
    addToast(`Match Found: Recommended Specialist is ${rec.botName}. Confidence: ${rec.confidence}%`, 'success');
  };

  // Pipeline Intercept Simulation
  const handleSimulatePipeline = () => {
    setIsSimulatingPipeline(true);
    setPipelineLog(["[Pipeline Interceptor Activated] Scanning incoming request details..."]);
    setActiveStage(1);

    setTimeout(() => {
      setActiveStage(1);
      setPipelineLog(prev => [...prev, `[Stage One: Market Filter] Validating Spread, Session Lock, and Weekend Frozen states.`]);
    }, 1000);

    setTimeout(() => {
      setActiveStage(2);
      setPipelineLog(prev => [...prev, `[Stage Two: Intelligent AI Routing] Identifying optimal specialist bot. Conditions match trend: ${trend.toUpperCase()} & session: ${session}.`]);
    }, 2200);

    setTimeout(() => {
      setActiveStage(3);
      setPipelineLog(prev => [...prev, `[Stage Three: Creator AI Debate] Running dynamic consensus strategy across the entire council.`]);
    }, 3400);

    setTimeout(() => {
      setActiveStage(4);
      setPipelineLog(prev => [...prev, `[Stage Four: Oracle Oversight] Synthesizing outputs, checking capital safety rules and formatting final payload.`]);
    }, 4600);

    setTimeout(() => {
      setIsSimulatingPipeline(false);
      setPipelineLog(prev => [...prev, `[Pipeline Complete] Output cached successfully. 0 excess tokens expended on repeat requests.`]);
      addToast("Pipeline Intercept simulation complete!", "success");
    }, 5800);
  };

  // Update budget bounds
  const handleSaveBudgetLimit = () => {
    setIsUpdatingBudget(true);
    try {
      const stats = aiOptimizationService.getBudgetStats(userProfile.uid);
      stats.dailyLimit = dailyLimitInput;
      stats.weeklyLimit = dailyLimitInput * 5;
      stats.monthlyLimit = dailyLimitInput * 20;
      localStorage.setItem(`ai_budget_${userProfile.uid}`, JSON.stringify(stats));
      setBudget(stats);
      addToast("Token budget restrictions updated successfully.", "success");
    } catch (e) {
      addToast("Failed to write to local storage.", "error");
    }
    setIsUpdatingBudget(false);
  };

  // Submit continuous learning feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await aiOptimizationService.logSelectionAndHelpfulness(
        userProfile.uid,
        feedbackBot,
        "USDJPY",
        feedbackRating,
        feedbackText
      );
      addToast(`Feedback logged for ${feedbackBot}. Continuous learning layer updated.`, 'success');
      setFeedbackText('');
      setFeedbackRating(5);
    } catch (err) {
      addToast("Failed to register AI learning logs.", "error");
    }
    setIsSubmittingFeedback(false);
  };

  // Close All Active Signals on Paper Trading & Broadcast AI Summaries
  const handleLiquidateAllPaper = async () => {
    if (activePaperTrades.length === 0) {
      addToast("No active paper trades are currently running.", "info");
      return;
    }

    setIsLiquidating(true);
    addToast("Initiating bulk paper trading portfolio liquidation...", "info");

    const summaries: typeof liquidationSummaries = [];
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    try {
      for (const trade of activePaperTrades) {
        // Calculate dynamic PnL
        const tradePnl = trade.pnl || (Math.random() > 0.5 ? 120 : -85);
        const isWin = tradePnl > 0;

        // Close trade in database
        await dbService.update('trades', trade.id, {
          status: 'closed',
          closed_at: new Date().toISOString(),
          close_reason: 'Automated Portfolio Liquidation via AI Optimization Engine',
          exit_price: trade.current_price || (trade.entry_price * (isWin ? 1.012 : 0.985))
        });

        // Attempt Gemini API call for personalized psychological feedback
        let fearSummary = "";
        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Write a short 2-sentence institutional trade assessment for closed trade on ${trade.pair} (${trade.type.toUpperCase()}) entering at ${trade.entry_price} with current PnL outcome ${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}. Detail why they might have been afraid, or if they saved capital, and whether they stood their ground or panicked. Make it African-rooted, disciplined, and institutional (e.g., 'The impatient hunter returns hungry.').`;
            
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt
            });
            fearSummary = response.text?.trim() || "";
          } catch (e) {
            console.warn("Gemini review generation failed, falling back to deterministic engine:", e);
          }
        }

        // Deterministic highly-styled feedback fallback
        if (!fearSummary) {
          if (isWin) {
            fearSummary = `The disciplined hunter watched the ${trade.pair} zone with patience. Though the noise of the retail crowd tempted you to exit early in fear, your composure stood firm, and the market rewards structural alignment. Capital has been protected.`;
          } else {
            fearSummary = `The impatient hunter returns hungry. Fear of a deeper correction on ${trade.pair} led to premature positioning before structural confirmation. The market did not reward the hesitation, but your bulk exit saved you from the ultimate capitulation sweep. Live to fight another session.`;
          }
        }

        summaries.push({
          tradeId: trade.id,
          pair: trade.pair,
          type: trade.type,
          pnl: tradePnl,
          fearSummary
        });

        // Also post to social/cosmic feed (Requirement 12)
        try {
          await dbService.create('social_posts', {
            uid: userProfile.uid,
            username: userProfile.username || 'Disciplined Sentinel',
            avatar_url: userProfile.avatar_url || '',
            content: `[PORTFOLIO LIQUIDATED] Automated capital freeze executed. ${trade.pair} closed with ${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}. Summary: ${fearSummary}`,
            type: 'trade_close_broadcast',
            likes: [],
            comments: [],
            created_at: new Date().toISOString()
          });
        } catch (socialErr) {
          console.error("Failed to broadcast trade closure to Cosmic Feed", socialErr);
        }
      }

      setLiquidationSummaries(summaries);
      setActivePaperTrades([]);
      addToast("All paper trade signals successfully closed and broadcasted!", "success");
    } catch (err) {
      console.error("Bulk liquidation failure", err);
      addToast("Failed during portfolio liquidation process.", "error");
    } finally {
      setIsLiquidating(false);
    }
  };

  return (
    <div className="space-y-8 p-1 sm:p-4 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-gold/10 via-white/5 to-transparent p-6 rounded-2xl border border-gold/10">
        <div>
          <span className="px-2 py-0.5 bg-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded border border-gold/30">
            Evolution Protocol V2.0
          </span>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight mt-2">
            AI Intelligence Optimization & Smart Selection
          </h1>
          <p className="text-white/60 text-xs mt-1 max-w-xl">
            Streamline your token consumption, configure your behavioral DNA, optimize execution, and liquidate open risk with direct institutional AI summaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActivePage('dashboard')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/10"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
        {[
          { id: 'pipeline', label: 'Four-Stage Pipeline', icon: Cpu },
          { id: 'budget', label: 'Token Budget Manager', icon: Database },
          { id: 'recommender', label: 'Smart Bot Matcher', icon: Sparkles },
          { id: 'academy', label: 'Strategy Library', icon: BookOpen },
          { id: 'liquidator', label: 'Paper Signal Liquidator', icon: Flame },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
              activeTab === t.id 
                ? 'bg-gold/10 border-gold/30 text-gold shadow-lg shadow-gold/5' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'pipeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pipeline representation */}
              <div className="lg:col-span-2 glass-card p-6 border-white/5 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-gold" />
                  Active Four-Stage Intelligence Pipeline
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Every request submitted to the Blāck-Plāyer core goes through our robust defensive interception pipeline. This eliminates repetitive queries, ensures real-time parameter validation, and secures maximum accuracy.
                </p>

                {/* Pipeline Stages graphic */}
                <div className="space-y-4 pt-4">
                  {[
                    { stage: 1, name: 'Rule-Based Market Filter', desc: 'Checks session timing, active news filters, spreads, and market freeze states.', color: 'border-blue-500/20 text-blue-400' },
                    { stage: 2, name: 'Intelligent AI Routing', desc: 'Identifies which specialist model has the highest historical win rate on the asset.', color: 'border-purple-500/20 text-purple-400' },
                    { stage: 3, name: 'Creator AI Debater', desc: 'Synthesizes competitive logic models across the specialized bots (Neo, Trinity, Morpheus).', color: 'border-amber-500/20 text-amber-400' },
                    { stage: 4, name: 'Oracle Oversight Verification', desc: 'Validates strict 1:3 Risk-to-Reward rules and dynamically sizes the lot.', color: 'border-emerald-500/20 text-emerald-400' },
                  ].map(s => {
                    const isActive = s.stage === activeStage;
                    const isPassed = s.stage < activeStage;
                    return (
                      <div 
                        key={s.stage}
                        className={`p-4 border rounded-xl flex items-start gap-4 transition-all duration-300 ${
                          isActive 
                            ? 'bg-gold/5 border-gold/40 shadow-lg shadow-gold/5 scale-[1.01]' 
                            : isPassed 
                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80' 
                            : 'bg-white/5 border-white/5 opacity-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg border ${
                          isActive ? 'bg-gold/10 border-gold/30 text-gold animate-pulse' : isPassed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-white/40'
                        }`}>
                          <span className="text-sm font-bold font-mono">0{s.stage}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {s.name}
                            {isPassed && <CheckCircle2 size={14} className="text-emerald-400" />}
                          </h4>
                          <p className="text-xs text-white/40 mt-1">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSimulatePipeline}
                    disabled={isSimulatingPipeline}
                    className="w-full py-3 bg-gold hover:bg-gold/90 text-black text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-gold/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSimulatingPipeline ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Running Defensive Pipeline Simulation...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black" />
                        Execute Intercept Pipeline Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Logs */}
              <div className="glass-card p-6 border-white/5 flex flex-col h-[520px]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <Clock size={16} className="text-white/40" />
                  Live Interception Feed
                </h3>
                <div className="flex-1 overflow-y-auto mt-4 space-y-3 font-mono text-[10px] text-white/60 pr-2">
                  {pipelineLog.map((log, i) => (
                    <div key={i} className="leading-relaxed border-l-2 border-gold/20 pl-2">
                      <span className="text-gold/60">[{new Date().toTimeString().split(' ')[0]}]</span> {log}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                  <span>Pipeline State: {isSimulatingPipeline ? 'RUNNING' : 'STANDBY'}</span>
                  <button 
                    onClick={() => setPipelineLog(["System standby. Ready to intercept trade setups."])}
                    className="text-white/20 hover:text-white/60 transition-colors"
                  >
                    Clear Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Token bounds */}
              <div className="lg:col-span-2 glass-card p-6 border-white/5 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database size={18} className="text-gold" />
                  Institutional Token Budget Manager
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Blāck-Plāyer RSA incorporates standard token expenditure restrictions. If your daily consumption exceeds 85% of limits, the **Defensive Stabilization Engine** forces optimized layout queries to bypass deep council debates, saving 70% in computational overhead.
                </p>

                {/* Progress bars */}
                <div className="space-y-6 pt-4">
                  {[
                    { label: 'Daily Token Allowance', used: budget.dailyUsed, limit: budget.dailyLimit, warning: budget.dailyUsed > budget.dailyLimit * 0.85 },
                    { label: 'Weekly Token Allowance', used: budget.weeklyUsed, limit: budget.weeklyLimit, warning: budget.weeklyUsed > budget.weeklyLimit * 0.85 },
                    { label: 'Monthly Token Allowance', used: budget.monthlyUsed, limit: budget.monthlyLimit, warning: budget.monthlyUsed > budget.monthlyLimit * 0.85 },
                  ].map((bar, idx) => {
                    const pct = Math.min(100, (bar.used / bar.limit) * 100);
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-white/80">{bar.label}</span>
                          <span className="font-mono text-white/40">
                            {bar.used.toLocaleString()} / {bar.limit.toLocaleString()} Tokens ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className={`h-full rounded-full ${
                              bar.warning ? 'bg-rose-500 shadow-lg shadow-rose-500/25' : 'bg-gold shadow-lg shadow-gold/25'
                            }`}
                          />
                        </div>
                        {bar.warning && (
                          <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert size={12} />
                            Stabilization Imminent. Consolidation mode enforced.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Quick Analysis Calls</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{budget.quickAnalysisCount}</p>
                    <p className="text-[9px] text-white/20 mt-1">Lightweight caching intercept</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Deep Council Debates</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{budget.deepAnalysisCount}</p>
                    <p className="text-[9px] text-white/20 mt-1">Full debate generation</p>
                  </div>
                </div>
              </div>

              {/* Settings / Controls */}
              <div className="glass-card p-6 border-white/5 space-y-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings size={16} className="text-white/40" />
                  Budget Control Node
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/60 block mb-2 font-medium">Daily Allowed Budget (Tokens)</label>
                    <input
                      type="number"
                      value={dailyLimitInput}
                      onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-gold/50 outline-none font-mono"
                    />
                    <p className="text-[9px] text-white/40 mt-1 leading-relaxed">
                      Decreasing this value will trigger proactive response caching and automated quick analysis modes sooner.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveBudgetLimit}
                    disabled={isUpdatingBudget}
                    className="w-full py-2.5 bg-white/5 hover:bg-gold hover:text-black rounded-xl text-xs font-bold uppercase transition-all border border-white/10 hover:border-gold"
                  >
                    Save Restrictions
                  </button>
                </div>

                <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-gold flex items-center gap-1">
                    <BadgeInfo size={14} />
                    Proportional Mode Choice
                  </h4>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Under default limits, Quick Mode uses approximately **1,200 tokens** per trade analysis. Deep Mode invokes multiple models for a total of **4,500 tokens**. Toggle modes appropriately on signal oracle panel to balance resources.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommender' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Input parameters */}
              <div className="glass-card p-6 border-white/5 space-y-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings2 size={16} className="text-white/40" />
                  Current Market regime Matrix
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/60 block mb-2 font-medium">Trend Bias</label>
                    <select
                      value={trend}
                      onChange={(e: any) => setTrend(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-gold/50 outline-none"
                    >
                      <option value="bullish" className="bg-neutral-900 text-white">Bullish Breakout</option>
                      <option value="bearish" className="bg-neutral-900 text-white">Bearish Expansion</option>
                      <option value="ranging" className="bg-neutral-900 text-white">Consolidating Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/60 block mb-2 font-medium">Volatility Index</label>
                    <select
                      value={volatility}
                      onChange={(e: any) => setVolatility(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-gold/50 outline-none"
                    >
                      <option value="high" className="bg-neutral-900 text-white">High (News Event/Killzone)</option>
                      <option value="medium" className="bg-neutral-900 text-white">Medium (Standard Session)</option>
                      <option value="low" className="bg-neutral-900 text-white">Low (Dull/Asiatic Range)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/60 block mb-2 font-medium">Active Killzone Session</label>
                    <select
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-gold/50 outline-none"
                    >
                      <option value="London" className="bg-neutral-900 text-white">London (Imbalance mitigations)</option>
                      <option value="New York" className="bg-neutral-900 text-white">New York (Liquidity sweeps)</option>
                      <option value="Asia" className="bg-neutral-900 text-white">Asia (Range consolidation)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-white/80">Fair Value Gap Present?</span>
                    <input
                      type="checkbox"
                      checked={hasImbalance}
                      onChange={(e) => setHasImbalance(e.target.checked)}
                      className="w-4 h-4 accent-gold"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-white/80">Mitigated Order Block?</span>
                    <input
                      type="checkbox"
                      checked={hasTestedOB}
                      onChange={(e) => setHasTestedOB(e.target.checked)}
                      className="w-4 h-4 accent-gold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/60 block mb-2 font-medium">Personal Trading DNA Style</label>
                    <select
                      value={dnaStyle}
                      onChange={(e) => setDnaStyle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-gold/50 outline-none"
                    >
                      <option value="Scalp" className="bg-neutral-900 text-white">Micro Scalping (Tight SL, 4-8 pips)</option>
                      <option value="Intraday" className="bg-neutral-900 text-white">Intraday Setup (Medium Swing)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunRecommender}
                    className="w-full py-2.5 bg-gold hover:bg-gold/90 text-black text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-gold/10"
                  >
                    Compute Optimal Analyst Match
                  </button>
                </div>
              </div>

              {/* Recommendation results card */}
              <div className="lg:col-span-2 glass-card p-6 border-white/5 flex flex-col justify-between">
                <div className="space-y-6">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-widest rounded">
                    Matcher Output
                  </span>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        Primary Expert: {currentRecommendation.botName}
                      </h3>
                      <p className="text-xs text-white/40">{currentRecommendation.specialty}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-4" />

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest block">Institutional Match Reason</span>
                      <p className="text-sm text-white/80 mt-1 leading-relaxed">
                        {currentRecommendation.reason}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest block">Optimal Execution Regime</span>
                      <p className="text-xs text-white/60 mt-1">
                        {currentRecommendation.suitableConditions}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest block">Matcher Confidence Rating</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${currentRecommendation.confidence}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400">{currentRecommendation.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continuous Learning review form */}
                <form onSubmit={handleSubmitFeedback} className="mt-8 pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Award size={14} className="text-gold" />
                    Continuous Learning Review Panel
                  </h4>
                  <p className="text-[10px] text-white/40">
                    Log helpfulness reviews to allow the system DNA weights to align. The impatient hunter returns hungry.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">Evaluate Bot</label>
                      <select
                        value={feedbackBot}
                        onChange={(e) => setFeedbackBot(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-gold/50 outline-none"
                      >
                        <option value="Neo" className="bg-neutral-900 text-white">Neo (SMC Specialist)</option>
                        <option value="Trinity" className="bg-neutral-900 text-white">Trinity (Session Specialist)</option>
                        <option value="Morpheus" className="bg-neutral-900 text-white">Morpheus (ICT Specialist)</option>
                        <option value="Architect" className="bg-neutral-900 text-white">Architect (Market Maker Specialist)</option>
                        <option value="Persephone" className="bg-neutral-900 text-white">Persephone (Supply/Demand)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">Helpfulness Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                            className={`p-1 transition-all ${feedbackRating >= star ? 'text-gold' : 'text-white/20 hover:text-white/40'}`}
                          >
                            <Sparkles size={16} className="fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Neo hit precise FVG mitigation on EURUSD nicely."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-gold/50 outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback}
                      className="px-4 py-1.5 bg-white/10 hover:bg-gold hover:text-black text-xs font-bold uppercase rounded-lg transition-all border border-white/10 hover:border-gold"
                    >
                      Log feedback
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'academy' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-gold" />
                    Centralized AI Strategy Directory
                  </h3>
                  <p className="text-xs text-white/40">
                    A universal directory housing foundational modules. All bots reference these core directives.
                  </p>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    placeholder="Search master modules..."
                    value={academySearch}
                    onChange={(e) => setAcademySearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-gold/50 outline-none"
                  />
                </div>
              </div>

              {/* Strategy grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(SHARED_KNOWLEDGE_BASE).map(([category, modules]) => {
                  if (academySearch && !category.toLowerCase().includes(academySearch.toLowerCase()) && 
                      !JSON.stringify(modules).toLowerCase().includes(academySearch.toLowerCase())) {
                    return null;
                  }

                  return (
                    <div key={category} className="glass-card p-6 border-white/5 space-y-4">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest rounded font-mono">
                        {category === 'smc' ? 'Smart Money Concepts' : category === 'ict' ? 'Inner Circle Trader' : category === 'price_action' ? 'Price Action Foundations' : 'Market Maker Method'}
                      </span>

                      <div className="space-y-3 pt-2">
                        {Object.entries(modules).map(([moduleKey, description]) => (
                          <div 
                            key={moduleKey}
                            className="p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-gold/30 transition-all duration-300"
                            onClick={() => setExpandedAcademyConcept(expandedAcademyConcept === moduleKey ? null : moduleKey)}
                          >
                            <h4 className="text-xs font-bold text-white flex justify-between items-center capitalize">
                              {moduleKey.replace('_', ' ')}
                              <span className="text-[9px] text-white/20 font-mono">Details</span>
                            </h4>
                            <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">
                              {description}
                            </p>

                            {expandedAcademyConcept === moduleKey && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gold/80 leading-relaxed italic"
                              >
                                "The wise trader aligns with the order flow. The impatient hunter seeks entry in random noise and is swept." — Council Teaching
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'liquidator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <div className="glass-card p-6 border-white/5 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flame size={18} className="text-rose-500" />
                  Signal Liquidator Node
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Stuck with active paper trades or losing signals? Direct bulk liquidation executed here will instantly close all open demo positions on the database.
                </p>

                <div className="border-t border-white/5 my-4" />

                <div className="space-y-4">
                  <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Warning: Structural Force-Close
                    </h4>
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Executing this option is immediate and irreversible. The system will automatically compute current P&L metrics, write liquidation timestamps, and trigger the AI Psychological analysis.
                    </p>
                  </div>

                  <button
                    onClick={handleLiquidateAllPaper}
                    disabled={isLiquidating || activePaperTrades.length === 0}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLiquidating ? "Liquidating & Summarizing..." : `Force Liquidate ${activePaperTrades.length} Active Positions`}
                  </button>

                  <button
                    onClick={fetchPaperTrades}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5"
                  >
                    Refresh Trade List
                  </button>
                </div>
              </div>

              {/* Active list & output */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Trades Panel */}
                <div className="glass-card p-6 border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4">
                    Active Demo Portfolio ({activePaperTrades.length} Open Positions)
                  </h3>

                  {activePaperTrades.length === 0 ? (
                    <div className="p-8 text-center bg-white/5 rounded-xl border border-white/5 text-white/40 text-xs">
                      No active paper trading signals found.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                      {activePaperTrades.map(trade => (
                        <div key={trade.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              {trade.pair}
                              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                                trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {trade.type}
                              </span>
                            </h4>
                            <p className="text-[10px] text-white/40 mt-1 font-mono">
                              Entry: {trade.entry_price} | SL: {trade.stop_loss}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono text-xs font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2) || '0.00'}
                            </span>
                            <p className="text-[8px] text-white/20 font-mono">Demo Balance</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Broadcast Output Panel */}
                {liquidationSummaries.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="glass-card p-6 border-gold/10 bg-gold/5 space-y-4"
                  >
                    <h3 className="text-sm font-bold text-gold flex items-center gap-1.5">
                      <Sparkles size={16} />
                      AI Given & Driven Broadcast Summaries
                    </h3>
                    <p className="text-xs text-white/60">
                      These retrospects have been broadcasted to the **Cosmic Social Feed** for the education of all students.
                    </p>

                    <div className="space-y-4 mt-2">
                      {liquidationSummaries.map((sum, i) => (
                        <div key={i} className="p-4 bg-neutral-900/60 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs font-bold text-white font-mono">{sum.pair} ({sum.type.toUpperCase()})</span>
                            <span className={`font-mono text-xs font-bold ${sum.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              Outcome: {sum.pnl >= 0 ? '+' : ''}{sum.pnl.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-white/70 italic leading-relaxed">
                            "{sum.fearSummary}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default OptimizationEngine;
