import { useState } from 'react';
import { UserProfile, Trade } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Shield, Sparkles, TrendingUp, TrendingDown, Zap, Users, Info, 
  Clock, Activity, ChevronDown, ChevronUp, AlertTriangle, BookOpen, 
  GraduationCap, HelpCircle, ArrowRight, CheckCircle2, Target
} from 'lucide-react';
import { generateCouncilDebate, CouncilDebateResult } from '../services/aiService';
import { useMarketContext } from '../MarketContext';
import { dbService } from '../services/dbService';

interface CouncilProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const pairs = [
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
  { symbol: 'R_75', name: 'Volatility 75 Index' },
  { symbol: 'R_10', name: 'Volatility 10 Index' },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index' },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index' },
  { symbol: 'STP', name: 'Step Index' },
  { symbol: 'JD100', name: 'Jump 100 Index' }
];

const timeframes = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function Council({ userProfile, addToast }: CouncilProps) {
  const { marketPrices } = useMarketContext();
  const [pair, setPair] = useState('1HZ100V');
  const [timeframe, setTimeframe] = useState('H1');
  const [educationLevel, setEducationLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  
  const [isDebating, setIsDebating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [debateResult, setDebateResult] = useState<CouncilDebateResult | null>(null);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);

  const selectedPairObj = pairs.find(p => p.symbol === pair) || pairs[0];
  const currentPrice = marketPrices[pair]?.price || 1000.0;

  const botsConfig = {
    Neo: {
      name: 'Neo',
      role: 'Smart Money Concepts Specialist',
      focus: 'Liquidity, Order Blocks, BOS, CHoCH, Fair Value Gaps, Premium/Discount, Inducement',
      responsibilities: 'Validate institutional entries, explain institutional logic, reject low-confluence setups.',
      icon: Brain,
      color: 'text-gold',
      borderColor: 'border-gold/30',
      glowColor: 'from-gold/10',
      bgGlow: 'bg-gold/5'
    },
    Trinity: {
      name: 'Trinity',
      role: 'ICT Specialist',
      focus: 'Kill Zones, Daily Bias, OTE, Session Models, Power of Three (AMD), Liquidity Timing',
      responsibilities: 'Refine timing, improve entry precision, identify institutional session behavior.',
      icon: Clock,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      glowColor: 'from-emerald-500/10',
      bgGlow: 'bg-emerald-500/5'
    },
    Morpheus: {
      name: 'Morpheus',
      role: 'Price Action Master',
      focus: 'Trend, Structure, Candlesticks, Chart Patterns, Breakouts, Pullbacks, Support/Resistance',
      responsibilities: 'Explain pure price action, confirm market direction, identify high-quality structural setups.',
      icon: Shield,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      glowColor: 'from-blue-500/10',
      bgGlow: 'bg-blue-500/5'
    },
    Architect: {
      name: 'Architect',
      role: 'Market Maker Method Specialist',
      focus: 'Accumulation, Manipulation, Distribution, Stop Hunts, Liquidity Traps, Engineered Liquidity',
      responsibilities: 'Detect market maker behavior, warn against false breakouts, identify engineered liquidity.',
      icon: Zap,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      glowColor: 'from-purple-500/10',
      bgGlow: 'bg-purple-500/5'
    },
    Persephone: {
      name: 'Persephone',
      role: 'Supply & Demand Specialist',
      focus: 'Institutional Supply, Demand, Zone Strength, Zone Freshness, Zone Mitigation',
      responsibilities: 'Validate reaction zones, identify high-probability reversal areas.',
      icon: Activity,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      glowColor: 'from-rose-500/10',
      bgGlow: 'bg-rose-500/5'
    }
  };

  const startDebate = async () => {
    setIsDebating(true);
    setDebateResult(null);
    setActiveBotId(null);

    addToast(`Convening the AI Council of Institutional Analysts for ${selectedPairObj.name}...`, 'info');

    try {
      const result = await generateCouncilDebate(
        pair,
        timeframe,
        educationLevel,
        currentPrice,
        { price: currentPrice, sentiment: 'confluent', timestamp: Date.now() }
      );
      
      setDebateResult(result);
      addToast('The Council has successfully synthesized their consensus.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Cosmic interference encountered. The Council debate was interrupted.', 'error');
    } finally {
      setIsDebating(false);
    }
  };

  const handleDeployPosition = async () => {
    if (!debateResult || !debateResult.creatorSynthesizer.hasTradeSetup) return;
    
    setIsDeploying(true);
    try {
      const plan = debateResult.creatorSynthesizer.educationalPlan;
      const currentAccountType = userProfile.account_type || 'demo';
      
      // Calculate automated lot size
      const balance = currentAccountType === 'live' ? userProfile.live_balance : userProfile.demo_balance;
      const riskPercent = userProfile.risk_settings?.risk_per_trade || 1;
      
      const entryPrice = parseFloat(plan.entry) || currentPrice;
      const stopLossPrice = parseFloat(plan.stop_loss) || (entryPrice * 0.995);
      
      let autoLotSize = 0.1;
      try {
        const diff = Math.abs(entryPrice - stopLossPrice);
        if (diff > 0) {
          autoLotSize = Math.max(0.01, parseFloat(((balance * (riskPercent / 100)) / (diff * 100)).toFixed(2)));
        }
      } catch (e) {
        autoLotSize = 0.1;
      }

      const tradeData: Omit<Trade, 'id'> = {
        uid: userProfile.uid,
        signal_id: 'council_' + Date.now(),
        pair: pair,
        entry_price: entryPrice,
        current_price: entryPrice,
        tp1: parseFloat(plan.tp1) || (entryPrice * 1.005),
        tp2: parseFloat(plan.tp2) || (entryPrice * 1.012),
        tp3: parseFloat(plan.tp3) || (entryPrice * 1.020),
        tp4: parseFloat(plan.tp4) || (entryPrice * 1.030),
        active_tp: 3,
        stop_loss: stopLossPrice,
        pnl: 0,
        pnl_percentage: 0,
        lot_size: autoLotSize,
        status: 'open',
        type: plan.type.toLowerCase() as 'buy' | 'sell',
        account_type: currentAccountType,
        created_at: new Date().toISOString()
      };

      await dbService.create('trades', tradeData);
      
      // Create notification
      await dbService.create('notifications', {
        uid: userProfile.uid,
        title: 'Council Position Triggered',
        message: `AI Council coordinated execution on ${selectedPairObj.name}. Position loaded in ${currentAccountType} mode.`,
        type: 'trade',
        read: false,
        created_at: new Date().toISOString()
      });

      addToast(`Council signal deployed: ${plan.type} ${selectedPairObj.name} (Lot: ${autoLotSize})`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Execution failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-2">
            <Users className="text-gold" size={32} />
            The AI Trading Council <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded bg-gold/10 text-gold font-bold">V2.0 PRO</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            7 collaborative institutional specialists executing multi-methodology alignment checks.
          </p>
        </div>

        {/* INPUT CONTROLS */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Asset Portal</span>
            <select 
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 text-white font-mono"
            >
              {pairs.map(p => <option key={p.symbol} value={p.symbol}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Timeframe</span>
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50 text-white font-mono"
            >
              {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Education Level</span>
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setEducationLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    educationLevel === level 
                      ? 'bg-gold/15 text-gold border border-gold/20' 
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={startDebate}
            disabled={isDebating}
            className="gold-button px-8 py-3.5 flex items-center gap-2 disabled:opacity-50 mt-5 cursor-pointer font-bold uppercase tracking-wider"
          >
            {isDebating ? <Zap className="animate-spin text-black" size={18} /> : <Users size={18} />}
            {isDebating ? 'Convening council...' : 'Convene Council'}
          </button>
        </div>
      </header>

      {/* BEFORE DEBATE AWAITING STATE */}
      {!isDebating && !debateResult && (
        <div className="glass-card p-12 text-center border-white/5 flex flex-col items-center justify-center space-y-6 max-w-4xl mx-auto my-12">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 text-white/20 animate-pulse">
            <Users size={64} strokeWidth={1} />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">The Council Chambers are Quiet</h2>
            <p className="text-white/40 text-sm mt-2 max-w-lg mx-auto">
              Select your market parameters above and click <span className="text-gold font-bold">Convene Council</span> to summon the elite algorithmic analysts. They will debate market structures using SMC, ICT, pure Price Action, Market Maker cycles, and Supply/Demand zones to refine cosmic edge.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-white/40">
            <span className="px-3 py-1 rounded-full bg-white/5">Neo (SMC)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">Trinity (ICT)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">Morpheus (PA)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">Architect (MMM)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">Persephone (S&D)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">Oracle (Confluence)</span>
            <span className="px-3 py-1 rounded-full bg-white/5">The Creator (Synthesis)</span>
          </div>
        </div>
      )}

      {/* DEBATING LOADER */}
      {isDebating && (
        <div className="space-y-8">
          <div className="glass-card p-12 text-center border-gold/20 bg-gold/5 flex flex-col items-center justify-center space-y-6 max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-ping" />
              <div className="p-6 rounded-full bg-gold/10 text-gold border border-gold/20 relative z-10">
                <Users size={48} className="animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold gold-gradient uppercase tracking-widest animate-pulse">Debate In Session</h2>
              <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
                All 7 specialized institutional bots are analyzing historical order books, mapping liquidity runs, calculating optimal trade coordinates, and measuring multi-methodology confluence.
              </p>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden max-w-md mx-auto">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full bg-gold"
              />
            </div>
          </div>
        </div>
      )}

      {/* DEBATE RESULTS PRESENTATION */}
      {debateResult && (
        <div className="space-y-10">
          
          {/* 1. ORACLE CONFLUENCE REPORT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-8 border border-white/5 relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                      Oracle Analysis: <span className="text-blue-400">Confluence Metric</span>
                    </h2>
                    <p className="text-xs text-white/40 uppercase font-mono tracking-wider">
                      Strategy Convergence Audit • Guarded Verdict
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-white/70 leading-relaxed italic bg-white/5 p-4 rounded-xl border border-white/5">
                  "{debateResult.oracleAnalysis.educationalVerdict}"
                </p>

                <div className="text-xs text-white/50 flex items-center gap-2">
                  <Info size={14} className="text-blue-400" />
                  <span>Oracle decisions are educational, transparent, evidence-based, and do not promise certainty.</span>
                </div>
              </div>

              {/* CONFLUENCE STATS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto min-w-[320px]">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Agreement</span>
                  <span className="text-2xl font-mono font-bold text-white mt-2">
                    {debateResult.oracleAnalysis.strategyAgreement.match(/\d+%/)?.[0] || "90%"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Confidence</span>
                  <span className="text-2xl font-mono font-bold text-gold mt-2">
                    {debateResult.oracleAnalysis.measuredConfidence}%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Risk Level</span>
                  <span className={`text-2xl font-mono font-bold mt-2 ${
                    debateResult.oracleAnalysis.riskLevel.toLowerCase() === 'low' ? 'text-emerald-400' :
                    debateResult.oracleAnalysis.riskLevel.toLowerCase() === 'medium' ? 'text-gold' :
                    'text-red-400'
                  }`}>
                    {debateResult.oracleAnalysis.riskLevel}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Probability</span>
                  <span className="text-2xl font-mono font-bold text-blue-400 mt-2">
                    {debateResult.oracleAnalysis.probability}%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between col-span-2">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Oracle Decision</span>
                  <span className={`text-xl font-bold uppercase tracking-wide mt-2 ${
                    debateResult.oracleAnalysis.decision === 'Approve' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {debateResult.oracleAnalysis.decision}
                  </span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* 2. THE CHAMELEON DEBATE BOT REVEAL GRID */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white/80 flex items-center gap-2">
              <Users size={18} className="text-gold" /> Institutional Specialization Council Reports
            </h3>
            
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {(Object.keys(botsConfig) as Array<keyof typeof botsConfig>).map((botId) => {
                const config = botsConfig[botId];
                const opinion = debateResult.opinions[botId];
                if (!opinion) return null;

                const isExpanded = activeBotId === botId;

                return (
                  <motion.div
                    key={botId}
                    layout="position"
                    onClick={() => setActiveBotId(isExpanded ? null : botId)}
                    className={`xl:col-span-1 glass-card border p-6 transition-all duration-300 cursor-pointer overflow-hidden relative ${
                      isExpanded 
                        ? 'xl:col-span-5 bg-white/5 border-white/15 shadow-xl shadow-black/40 ring-1 ring-white/10' 
                        : `${config.borderColor} hover:bg-white/5`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/5 ${config.color}`}>
                          <config.icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-white">{config.name}</h4>
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">
                              {botId === 'Neo' ? 'SMC' : botId === 'Trinity' ? 'ICT' : botId === 'Morpheus' ? 'PA' : botId === 'Architect' ? 'MMM' : 'S&D'}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 truncate max-w-[160px] xl:max-w-none">{config.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          opinion.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                          opinion.sentiment === 'bearish' ? 'bg-red-500/10 text-red-400' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {opinion.sentiment}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                      </div>
                    </div>

                    {/* CONFIDENCE BAR FOR BOT */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-white/30">CONFIDENCE</span>
                        <span className={`font-bold ${config.color}`}>{opinion.confidence}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-current ${config.color}`} style={{ width: `${opinion.confidence}%` }} />
                      </div>
                    </div>

                    {/* DETECTED OVERVIEW PREVIEW (VISIBLE WHEN COLLAPSED) */}
                    {!isExpanded && (
                      <p className="text-xs text-white/50 italic truncate mt-4">
                        "{opinion.detected}"
                      </p>
                    )}

                    {/* EXPANDED RICH DETAILS */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 pt-6 border-t border-white/5 space-y-6 text-sm"
                        >
                          {/* BOT INFO ROW */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/60 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div>
                              <span className="block text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Focus Areas</span>
                              <span className="text-white/80 font-mono">{config.focus}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Assigned Domain Responsibilities</span>
                              <span className="text-white/80">{config.responsibilities}</span>
                            </div>
                          </div>

                          {/* SYSTEM DETECTED & WHY IT MATTERS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Target size={14} className={config.color} /> Structure Detected
                              </span>
                              <p className="text-white/80 leading-relaxed font-mono text-xs bg-black/30 p-3 rounded-lg border border-white/5">
                                {opinion.detected}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                <BookOpen size={14} className="text-blue-400" /> Educational Significance
                              </span>
                              <p className="text-white/70 leading-relaxed">
                                {opinion.whyItMatters}
                              </p>
                            </div>
                          </div>

                          {/* REASONING & AFFECT ON BIAS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            <div className="space-y-2">
                              <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                <HelpCircle size={14} className="text-orange-400" /> Directional Bias Influence
                              </span>
                              <p className="text-white/70 leading-relaxed">
                                {opinion.howItAffects}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle size={14} className="text-red-400" /> Structural Invalidation Conditions
                              </span>
                              <p className="text-white/70 leading-relaxed font-mono text-xs text-red-300">
                                {opinion.invalidation}
                              </p>
                            </div>
                          </div>

                          {/* EDUCATION CORNER SECTION */}
                          <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 space-y-4">
                            <div className="flex items-center gap-2 text-gold">
                              <GraduationCap size={18} />
                              <h5 className="font-bold uppercase tracking-wider text-xs">Educational Corner — Level {educationLevel}</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-white/70">
                              <div className="space-y-1.5">
                                <span className="block font-bold text-red-400 uppercase tracking-widest">Common Beginner Pitfall</span>
                                <p className="leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                                  {opinion.beginnerMistake}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <span className="block font-bold text-emerald-400 uppercase tracking-widest">Institutional Best Practice</span>
                                <p className="leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                                  {opinion.bestPractice}
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-white/5 text-[11px] text-white/50">
                              <span className="font-bold uppercase tracking-wider text-white/40 mr-1">Risk Considerations:</span>
                              {opinion.riskConsideration}
                            </div>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            
            {!activeBotId && (
              <div className="text-center text-xs text-white/30 italic">
                💡 Tip: Click on any bot card above to expand and review their full, deep institutional analysis report.
              </div>
            )}
          </div>

          {/* 3. FINAL SYNTHESIZER: BLĀCK-PLĀYER (THE CREATOR) */}
          {debateResult.oracleAnalysis.decision === 'Reject' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center justify-center space-y-4"
            >
              <AlertTriangle className="text-red-400 animate-bounce" size={48} />
              <h3 className="text-xl font-display font-bold text-red-400">COUNCIL DIVERGENCE DETECTED</h3>
              <p className="text-white/60 max-w-xl text-sm leading-relaxed font-mono">
                "Market conditions currently lack sufficient institutional confluence. No trade will be generated at this time."
              </p>
            </motion.div>
          ) : (
            debateResult.creatorSynthesizer.hasTradeSetup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                
                {/* EDUCATIONAL DETAILED ANALYSIS */}
                <div className="lg:col-span-2 glass-card p-8 border border-gold/15 bg-white/5 space-y-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3.5 rounded-xl bg-gold/15 text-gold border border-gold/20">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-white">
                          Synthesized Educational Trade Plan
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest mt-0.5">
                          Formulated by Blāck-Plāyer (The Creator) • Lead Strategy Synthesizer
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="space-y-1.5">
                        <h5 className="font-bold text-xs uppercase tracking-widest text-gold/80 flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-gold" /> Why This Setup Exists
                        </h5>
                        <p className="text-white/70 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5 font-mono text-xs">
                          {debateResult.creatorSynthesizer.educationalPlan.whyExists}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-xs uppercase tracking-widest text-red-400 flex items-center gap-1">
                            <AlertTriangle size={14} /> Why Setup May Fail
                          </h5>
                          <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
                            {debateResult.creatorSynthesizer.educationalPlan.whyFail}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-xs uppercase tracking-widest text-orange-400 flex items-center gap-1">
                            <AlertTriangle size={14} /> Invalidation Points
                          </h5>
                          <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 text-xs font-mono">
                            {debateResult.creatorSynthesizer.educationalPlan.invalidationPoints}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-xs uppercase tracking-widest text-white/50">
                            Key Risk Factors
                          </h5>
                          <p className="text-white/60 leading-relaxed text-xs">
                            {debateResult.creatorSynthesizer.educationalPlan.riskFactors}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-xs uppercase tracking-widest text-white/50">
                            Alternative Market Scenarios
                          </h5>
                          <p className="text-white/60 leading-relaxed text-xs">
                            {debateResult.creatorSynthesizer.educationalPlan.alternativeScenarios}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 text-xs text-white/40 italic">
                    Note: The Creator acts as lead educator, combining all specialties to generate transparent trade theses. Decisions remain purely educational.
                  </div>
                </div>

                {/* SIGNAL ACTION TERMINAL CARD */}
                <div className="lg:col-span-1 glass-card p-8 border border-gold/30 bg-gold/5 flex flex-col justify-between space-y-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                  
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase font-mono tracking-widest">COSMIC TERMINAL</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest ${
                        debateResult.creatorSynthesizer.educationalPlan.type === 'BUY' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {debateResult.creatorSynthesizer.educationalPlan.type}
                      </span>
                    </div>

                    <div className="text-center space-y-1">
                      <p className="text-xs text-white/40 uppercase tracking-[0.2em]">CURRENT MARKET</p>
                      <h4 className="text-3xl font-display font-bold text-white tracking-tight">
                        {selectedPairObj.name}
                      </h4>
                      <p className="text-sm font-mono text-gold mt-1">
                        Live Price: ${currentPrice.toFixed(4)}
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-xs p-2.5 rounded bg-black/40 border border-white/5">
                        <span className="text-white/40 font-bold uppercase tracking-wider">ENTRY REGION</span>
                        <span className="font-mono text-white font-bold">{debateResult.creatorSynthesizer.educationalPlan.entry}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs p-2.5 rounded bg-black/40 border border-white/5">
                        <span className="text-red-400/80 font-bold uppercase tracking-wider">STOP LOSS</span>
                        <span className="font-mono text-red-400 font-bold">{debateResult.creatorSynthesizer.educationalPlan.stop_loss}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                          <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[10px] block">TARGET TP1</span>
                          <span className="font-mono text-emerald-400 font-bold block">{debateResult.creatorSynthesizer.educationalPlan.tp1}</span>
                        </div>
                        <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                          <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[10px] block">TARGET TP2</span>
                          <span className="font-mono text-emerald-400 font-bold block">{debateResult.creatorSynthesizer.educationalPlan.tp2}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                          <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[10px] block">TARGET TP3</span>
                          <span className="font-mono text-emerald-400 font-bold block">{debateResult.creatorSynthesizer.educationalPlan.tp3}</span>
                        </div>
                        <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                          <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[10px] block">TARGET TP4</span>
                          <span className="font-mono text-emerald-400 font-bold block">{debateResult.creatorSynthesizer.educationalPlan.tp4}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDeployPosition}
                    disabled={isDeploying}
                    className="gold-button w-full py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    {isDeploying ? (
                      <>
                        <Zap className="animate-spin text-black" size={16} />
                        DEPLOYING POSITION...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={16} className="text-black" />
                        DEPLOY AS {userProfile.account_type === 'live' ? 'LIVE' : 'PAPER'} POSITION
                      </>
                    )}
                  </button>

                </div>

              </motion.div>
            )
          )}

        </div>
      )}

    </div>
  );
}
