import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Brain, Clock, Globe, Zap, Database, Search, 
  Settings, Lock, HelpCircle, CheckCircle, AlertTriangle, 
  XCircle, ChevronRight, Play, RefreshCw, BarChart2, 
  FileText, ArrowRight, Eye, Sparkles, MessageSquare, HeartPulse
} from 'lucide-react';
import { UserProfile, Trade } from '../types';
import { OONService, OONOracle, OONEvent, OracleId } from '../services/oonService';
import { dbService } from '../services/dbService';

interface OONProps {
  userProfile: UserProfile;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function OracleOversightNetwork({ userProfile, addToast }: OONProps) {
  const isCreator = userProfile?.role === 'creator' || userProfile?.email === 'kanitezu@gmail.com';
  
  const [oracles, setOracles] = useState<OONOracle[]>([]);
  const [events, setEvents] = useState<OONEvent[]>([]);
  const [selectedOracleId, setSelectedOracleId] = useState<OracleId>('sovereign');
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'reports' | 'history'>('status');
  
  // Knowledge search state for Oracle Mnemosyne
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  // Diagnostics simulation state for Oracle Nexus
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticsLog, setDiagnosticsLog] = useState<string[]>([]);

  // Trigger event simulator options
  const [simulatedEventType, setSimulatedEventType] = useState('SIGNAL_GENERATED');

  // Load and subscribe to OON Service updates
  useEffect(() => {
    // Initial fetch
    setOracles(OONService.getOracles());
    setEvents(OONService.getEvents());

    // Subscribe to updates
    const unsubscribe = OONService.subscribe(() => {
      setOracles(OONService.getOracles());
      setEvents(OONService.getEvents());
    });

    // Run platform audit immediately
    OONService.initialize(userProfile.uid);

    return () => {
      unsubscribe();
    };
  }, [userProfile.uid]);

  // Load real trades for Mnemosyne Search
  const loadTrades = useCallback(async () => {
    setIsLoadingTrades(true);
    try {
      const list = await dbService.list<Trade>('trades', [
        ['uid', '==', userProfile.uid]
      ]);
      setTradeHistory(list);
    } catch (e) {
      console.warn("Failed to load historical trades for Mnemosyne", e);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [userProfile.uid]);

  useEffect(() => {
    if (selectedOracleId === 'mnemosyne') {
      loadTrades();
    }
  }, [selectedOracleId, loadTrades]);

  // Toggle Oracle state (Creator only)
  const handleToggleOracle = async (id: OracleId, currentStatus: 'active' | 'inactive') => {
    if (!isCreator) {
      addToast("Creator Override Required: Only the primary Creator can alter Oracle structures.", "error");
      return;
    }

    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await OONService.toggleOracleStatus(userProfile.uid, id, nextStatus);
      addToast(`${id.toUpperCase()} has been ${nextStatus === 'active' ? 'enabled' : 'disabled'} under Creator authority.`, 'info');
    } catch (err) {
      addToast(`Failed to toggle Oracle state: ${err}`, 'error');
    }
  };

  // Generate Report (Creator only)
  const handleGenerateReport = async (type: 'weekly' | 'monthly' | 'quarterly' | 'intelligence') => {
    if (!isCreator) {
      addToast("Creator Override Required: Only the primary Creator may generate intelligence reports.", "error");
      return;
    }

    try {
      await OONService.generateOONReport(userProfile.uid, type);
      addToast(`Intelligence compiled successfully. Sovereign report added to registry.`, 'success');
    } catch (err) {
      addToast(`Failed to generate report: ${err}`, 'error');
    }
  };

  // Run Operations Diagnostics (Oracle Nexus)
  const handleRunDiagnostics = () => {
    setIsDiagnosing(true);
    setDiagnosticsLog([]);
    
    const logs = [
      "Establishing link with Cloud Firestore...",
      "Analyzing latency buffers... Latency: 42ms [OPTIMAL]",
      "Auditing Telegram Webhook connections... Status: SECURE",
      "Performing API handshake with Deriv servers... Echo: SUCCESS",
      "Scrutinizing memory heaps... Leakages: 0.0%",
      "System fully optimized. Auto-reconnection systems primed."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setDiagnosticsLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
        if (index === logs.length - 1) {
          setIsDiagnosing(false);
          addToast("Nexus Diagnostics completed successfully.", "success");
          OONService.emitEvent('DIAGNOSTICS_COMPLETED', userProfile.uid, "Operations diagnostics executed. System optimized.", 'resolved', ['nexus']);
        }
      }, (index + 1) * 800);
    });
  };

  // Fire simulated event for interaction
  const triggerSimulationEvent = async () => {
    let details = "";
    switch (simulatedEventType) {
      case 'SIGNAL_GENERATED':
        details = `Alpha Bot generated XAUUSD Buy signal. Confidence: ${Math.floor(82 + Math.random() * 15)}%.`;
        break;
      case 'STOP_LOSS_HIT':
        details = `Crash 500 Sell trade Hit Stop Loss. Capital protection threshold triggered.`;
        break;
      case 'TP1_HIT':
        details = `Boom 1000 Buy trade Hit Take Profit 1 (TP1). Locked +$45.00 yield.`;
        break;
      case 'LESSON_COMPLETED':
        details = `User successfully completed Lesson 3: 'Advanced Smart Money Concepts'.`;
        break;
      case 'NOTIFICATION_FAILED':
        details = `Telegram communication failed to deliver on channel 5013. Sync lost temporarily.`;
        break;
      default:
        details = `System state trigger event activated.`;
    }

    addToast(`Triggering simulated event: ${simulatedEventType}`, 'info');
    await OONService.emitEvent(simulatedEventType, userProfile.uid, details, simulatedEventType.includes('FAILED') ? 'failed' : 'processed');
  };

  const getOracleIcon = (id: OracleId, size = 20) => {
    switch (id) {
      case 'aegis': return <Shield size={size} className="text-blue-400" />;
      case 'genesis': return <Brain size={size} className="text-emerald-400" />;
      case 'chronos': return <Clock size={size} className="text-amber-400" />;
      case 'astra': return <Globe size={size} className="text-purple-400" />;
      case 'nexus': return <Database size={size} className="text-cyan-400" />;
      case 'mnemosyne': return <FileText size={size} className="text-indigo-400" />;
      case 'sovereign': return <Sparkles size={size} className="text-gold" />;
    }
  };

  // Active Selected Oracle data
  const activeOracle = oracles.find(o => o.id === selectedOracleId);

  // Filter trade history for Mnemosyne Knowledge Database
  const filteredTrades = tradeHistory.filter(t => {
    const term = searchQuery.toLowerCase();
    return (
      t.pair?.toLowerCase().includes(term) ||
      (t as any).strategy?.toLowerCase().includes(term) ||
      t.status?.toLowerCase().includes(term) ||
      t.pnl?.toString().includes(term)
    );
  });

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles size={14} className="animate-pulse" /> Oversight Architecture
          </div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            Oracle Oversight Network <span className="text-xs bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded font-mono uppercase tracking-widest font-normal">OON v1.0</span>
          </h1>
          <p className="text-white/40 mt-1 max-w-2xl leading-relaxed">
            Permanent, autonomous background supervision coordinating, protecting, and optimizing the Blāck-Plāyer RSA ecosystem under strict Creator authority.
          </p>
        </div>

        {/* Global OON Status Widget */}
        <div className="glass-card flex items-center gap-4 p-4 border-gold/10 bg-gold/5 max-w-sm">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center bg-black/40">
              <HeartPulse className="text-gold animate-pulse" size={24} />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-cosmic-black rounded-full" />
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">OON Health Grid</p>
            <p className="text-lg font-display font-bold text-emerald-400">99.8% Online</p>
            <p className="text-[10px] text-white/50">7 Autonomous Protocols Active</p>
          </div>
        </div>
      </header>

      {/* THREE BENTO PANELS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDE BAR: Oracle Navigation Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-4 bg-white/5 border-white/5">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold px-3 mb-3">Supervisory Entities</p>
            <div className="space-y-1.5">
              {oracles.map((oracle) => {
                const isSelected = selectedOracleId === oracle.id;
                const isActive = oracle.status === 'active';
                return (
                  <button
                    key={oracle.id}
                    onClick={() => setSelectedOracleId(oracle.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-gold/15 text-gold border border-gold/30 shadow-lg shadow-gold/5' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getOracleIcon(oracle.id, 18)}
                      <div className="text-left truncate">
                        <p className="text-sm font-bold truncate leading-snug">{oracle.name}</p>
                        <p className="text-[9px] text-white/40 truncate font-mono">{oracle.role}</p>
                      </div>
                    </div>
                    
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Event Simulator panel */}
          <div className="glass-card p-4 border-gold/10 bg-gold/5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-gold" />
              <p className="text-[10px] text-gold uppercase tracking-widest font-bold">OON Event simulator</p>
            </div>
            <p className="text-[11px] text-white/60">
              Fire test occurrences to observe the event-driven coordination and response loop of the active Oracles.
            </p>
            
            <div className="space-y-2">
              <select
                value={simulatedEventType}
                onChange={(e) => setSimulatedEventType(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold"
              >
                <option value="SIGNAL_GENERATED">Signal Generated</option>
                <option value="TP1_HIT">Take Profit 1 Hit (TP1)</option>
                <option value="STOP_LOSS_HIT">Stop Loss Hit (SL)</option>
                <option value="LESSON_COMPLETED">Academy Lesson Completed</option>
                <option value="NOTIFICATION_FAILED">Notification Delivery Failed</option>
              </select>

              <button
                onClick={triggerSimulationEvent}
                className="w-full py-2 bg-gold/20 hover:bg-gold hover:text-black border border-gold/30 text-gold transition-all rounded-lg font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-2"
              >
                <Play size={10} /> Emit Test Event
              </button>
            </div>
          </div>
        </div>

        {/* CENTER STAGE: Active Oracle View Details */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {activeOracle && (
              <motion.div
                key={activeOracle.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="glass-card p-6 md:p-8 space-y-8 border-white/5 relative overflow-hidden"
              >
                {/* Visual Glow Backdrop */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-gold/5 via-transparent to-transparent pointer-events-none -mr-20 -mt-20" />

                {/* Subheader */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {getOracleIcon(activeOracle.id, 28)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-white">{activeOracle.name}</h2>
                      <p className="text-xs text-gold/80 font-mono tracking-widest uppercase">{activeOracle.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Toggle */}
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-white/40 uppercase font-bold">Status:</span>
                      <span className={`text-xs font-bold uppercase ${activeOracle.status === 'active' ? 'text-emerald-400' : 'text-white/30'}`}>
                        {activeOracle.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Enable/Disable Button (Creator only visually indicated) */}
                    {activeOracle.id !== 'sovereign' && (
                      <button
                        onClick={() => handleToggleOracle(activeOracle.id, activeOracle.status)}
                        className={`px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase border transition-all ${
                          activeOracle.status === 'active'
                            ? 'border-red-500/20 text-red-400 bg-red-400/5 hover:bg-red-400 hover:text-white'
                            : 'border-emerald-500/20 text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400 hover:text-black'
                        }`}
                      >
                        {activeOracle.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>

                {/* CONTENT AREA FOR EACH INDIVIDUAL ORACLE */}
                <div className="space-y-8 relative z-10">
                  
                  {/* ORACLE I — ORACLE AEGIS (Guardian of the AI Council) */}
                  {activeOracle.id === 'aegis' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Models Monitored</p>
                          <p className="text-3xl font-display font-bold text-white">{activeOracle.metrics.activeAIs}</p>
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">All engines active</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Average confidence</p>
                          <p className="text-3xl font-display font-bold text-white">{activeOracle.metrics.avgConfidence}%</p>
                          <p className="text-[10px] text-white/40">Target threshold &gt; 80%</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Council conflicts</p>
                          <p className="text-3xl font-display font-bold text-emerald-400">{activeOracle.metrics.councilInconsistencies}</p>
                          <p className="text-[10px] text-white/40">Zero divergence logged</p>
                        </div>
                      </div>

                      {/* Recalibration recommendations block */}
                      <div className="glass-card p-5 bg-blue-500/5 border-blue-500/10 space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                          <Shield size={16} /> Counsel Recalibration Directives
                        </h4>
                        
                        {activeOracle.recommendations.length > 0 ? (
                          <div className="space-y-3">
                            {activeOracle.recommendations.map((rec) => (
                              <div key={rec.id} className="flex gap-3 text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-white font-medium">{rec.text}</p>
                                  <p className="text-[9px] text-white/40 mt-1 font-mono">{rec.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/60 italic">
                            Aegis reports AI Council alignment is pristine. No recalibrations recommended at this moment.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ORACLE II — ORACLE GENESIS (Guardian of User DNA) */}
                  {activeOracle.id === 'genesis' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Trader Profile card */}
                        <div className="glass-card p-6 bg-white/5 space-y-4">
                          <h4 className="text-xs text-white/40 uppercase tracking-widest font-bold">Trader DNA metrics</h4>
                          
                          <div className="space-y-3 font-mono">
                            <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                              <span className="text-white/60">Preferred Asset:</span>
                              <span className="text-gold font-bold">{activeOracle.metrics.preferredAsset}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                              <span className="text-white/60">Best Trading Session:</span>
                              <span className="text-emerald-400 font-bold">{activeOracle.metrics.activeSession}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                              <span className="text-white/60">Discipline Rank:</span>
                              <span className="text-blue-400 font-bold uppercase">{activeOracle.metrics.experienceLevel}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60">Consistency Index:</span>
                              <span className="text-white font-bold">{activeOracle.metrics.consistencyIndex}</span>
                            </div>
                          </div>
                        </div>

                        {/* Automated Coaching advice (from event logging) */}
                        <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/10 space-y-4">
                          <h4 className="text-xs text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-2">
                            <Brain size={14} /> Personalized DNA Recommendations
                          </h4>
                          
                          {activeOracle.recommendations.length > 0 ? (
                            <div className="space-y-3">
                              {activeOracle.recommendations.map(rec => (
                                <div key={rec.id} className="flex gap-3 text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-white/80 leading-relaxed">{rec.text}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-white/60 italic">
                              Genesis is studying your trading journey. Recommendations will emerge as more trades register on your DNA profile.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORACLE III — ORACLE CHRONOS (Guardian of Behaviour & Discipline) */}
                  {activeOracle.id === 'chronos' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Circular Score Gauge */}
                        <div className="glass-card p-6 bg-white/5 flex flex-col items-center justify-center text-center space-y-3">
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Discipline Score</p>
                          
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                stroke={activeOracle.metrics.disciplineScore >= 70 ? "#34d399" : "#fbbf24"} 
                                strokeWidth="8" 
                                fill="transparent" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * activeOracle.metrics.disciplineScore) / 100}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-2xl font-mono font-bold text-white">{activeOracle.metrics.disciplineScore}</span>
                          </div>
                          
                          <p className="text-xs font-bold text-white/60">Discipline Standing</p>
                        </div>

                        {/* Behavior Monitoring fields */}
                        <div className="md:col-span-2 glass-card p-6 bg-white/5 space-y-4">
                          <h4 className="text-xs text-white/40 uppercase tracking-widest font-bold">Behavioral Violations Audited</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-1">
                              <p className="text-[10px] text-white/40 font-mono">Revenge Trading</p>
                              <p className={`text-sm font-bold ${activeOracle.metrics.revengeTradingDetected ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {activeOracle.metrics.revengeTradingDetected ? 'DETECTED' : 'SAFE'}
                              </p>
                            </div>
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-1">
                              <p className="text-[10px] text-white/40 font-mono">Overtrading Risk</p>
                              <p className={`text-sm font-bold ${activeOracle.metrics.overtradingAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                                {activeOracle.metrics.overtradingAlert ? 'WARNING' : 'SAFE'}
                              </p>
                            </div>
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-1">
                              <p className="text-[10px] text-white/40 font-mono">Consecutive Losses</p>
                              <p className="text-sm font-bold text-white">{activeOracle.metrics.consecutiveLosses} / 3</p>
                            </div>
                            <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-1">
                              <p className="text-[10px] text-white/40 font-mono">Ignored Stop Losses</p>
                              <p className="text-sm font-bold text-white">{activeOracle.metrics.ignoredStopLosses} counts</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Growth Plan and recommendations */}
                      <div className="glass-card p-5 bg-amber-500/5 border-amber-500/10 space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                          <Clock size={16} /> Weekly Discipline Growth Report
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                          <div className="space-y-2">
                            <p className="font-bold text-white">✔ Strengths</p>
                            <ul className="list-disc pl-4 space-y-1 text-white/70">
                              <li>Consistent patient waits for high-probability setups</li>
                              <li>Respect for take profit levels</li>
                              <li>Stable execution with structural stop losses</li>
                            </ul>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="font-bold text-white">✘ Overcoming Weaknesses</p>
                            <ul className="list-disc pl-4 space-y-1 text-white/70">
                              <li>Maintain discipline rules during high volatility sessions</li>
                              <li>Prevent quick immediate re-entries after minor losses</li>
                              <li>Maintain 1:2 risk ratio consistency</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORACLE IV — ORACLE ASTRA (Guardian of Market Intelligence) */}
                  {activeOracle.id === 'astra' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-5 bg-white/5 space-y-4">
                          <h4 className="text-xs text-white/40 uppercase font-bold tracking-widest">Market Environment</h4>
                          
                          <div className="space-y-3 font-mono text-xs">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-white/60">Market Regime:</span>
                              <span className="text-purple-400 font-bold">{activeOracle.metrics.marketRegime}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-white/60">Volatility State:</span>
                              <span className="text-white font-bold">{activeOracle.metrics.volatilityState}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-white/60">Trading Conditions:</span>
                              <span className="text-emerald-400 font-bold">Favorable</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Current Liquidity Zone:</span>
                              <span className="text-white font-bold">{activeOracle.metrics.liquidityZone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="glass-card p-5 bg-purple-500/5 border-purple-500/10 space-y-4">
                          <h4 className="text-xs text-purple-400 uppercase font-bold tracking-widest">Strategy Match recommendations</h4>
                          <p className="text-xs text-white/70 leading-relaxed">
                            Astra identifies ranging conditions. Recommend Smart Money Concepts (SMC) order block entries on short timeframes, or standard Volatility scalp strategies.
                          </p>
                          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1">Recommended Bots</p>
                            <p className="text-xs font-bold text-white">Ascended Scalper Bot • SMC Order Block Tracker</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORACLE V — ORACLE NEXUS (Guardian of Platform Operations) */}
                  {activeOracle.id === 'nexus' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Database Latency</p>
                          <p className="text-3xl font-display font-bold text-white">{activeOracle.metrics.databaseLatency}</p>
                          <p className="text-[10px] text-emerald-400">Stable ping to Firestore</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">API Gateway Status</p>
                          <p className="text-3xl font-display font-bold text-white">{activeOracle.metrics.apiUptime}</p>
                          <p className="text-[10px] text-emerald-400">99.99% uptime checked</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Autonomic Reconnections</p>
                          <p className="text-3xl font-display font-bold text-cyan-400">{activeOracle.metrics.reconnectionsCount}</p>
                          <p className="text-[10px] text-white/40">Healthy recovery loops</p>
                        </div>
                      </div>

                      {/* Operations Diagnostics Panel */}
                      <div className="glass-card p-5 bg-cyan-500/5 border-cyan-500/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold flex items-center gap-2 text-cyan-400">
                            <Database size={16} /> Operations diagnostics Console
                          </h4>
                          <button
                            onClick={handleRunDiagnostics}
                            disabled={isDiagnosing}
                            className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black font-mono font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded transition-all flex items-center gap-1"
                          >
                            <RefreshCw size={10} className={isDiagnosing ? "animate-spin" : ""} />
                            {isDiagnosing ? "Diagnosing..." : "Run Diagnostics"}
                          </button>
                        </div>

                        {diagnosticsLog.length > 0 ? (
                          <div className="bg-black/60 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-emerald-400 space-y-1.5 h-36 overflow-y-auto">
                            {diagnosticsLog.map((log, i) => (
                              <p key={i}>{log}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/60 italic">
                            Run diagnostics above to inspect connection pools, webhook latency, SMS/Email bridges, and memory storage leaks.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ORACLE VI — ORACLE MNEMOSYNE (Guardian of Memory & Knowledge) */}
                  {activeOracle.id === 'mnemosyne' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-card p-4 bg-white/5 text-center">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Archived trades</p>
                          <p className="text-2xl font-bold text-white">{activeOracle.metrics.archivedSignals || tradeHistory.length}</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 text-center">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Preserved Chats</p>
                          <p className="text-2xl font-bold text-white">48</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 text-center">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Lesson Progress</p>
                          <p className="text-2xl font-bold text-white">{userProfile.completed_lessons?.length || 0}</p>
                        </div>
                        <div className="glass-card p-4 bg-white/5 text-center">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Knowledge base</p>
                          <p className="text-2xl font-bold text-white">{activeOracle.metrics.totalKnowledgeAssets}</p>
                        </div>
                      </div>

                      {/* Intelligent Knowledge Search database */}
                      <div className="glass-card p-6 bg-white/5 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-white">Mnemosyne Knowledge Library</h4>
                            <p className="text-xs text-white/40">Intelligent search of your transaction memories, lessons, and configurations.</p>
                          </div>
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search setup e.g. Gold, Buy..."
                              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                            />
                          </div>
                        </div>

                        {isLoadingTrades ? (
                          <div className="py-12 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                            <RefreshCw className="animate-spin" size={14} /> Fetching historical knowledge archives...
                          </div>
                        ) : filteredTrades.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredTrades.map((trade) => (
                              <div key={trade.id} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="text-xs font-bold text-white">{trade.pair}</span>
                                    <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded font-mono font-bold ${
                                      trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                      {trade.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] text-white/40">
                                  <span>Strategy: {(trade as any).strategy || 'SMC Liquidity'}</span>
                                  <span>Closed: {new Date(trade.closed_at || '').toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs text-white/40">
                            No matching files, setups, or journals located in Mnemosyne's permanent archive.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ORACLE VII — ORACLE SOVEREIGN (Supreme Overseer) */}
                  {activeOracle.id === 'sovereign' && (
                    <div className="space-y-8">
                      {/* Sub Tabs Selection */}
                      <div className="flex border-b border-white/5 pb-2 gap-6">
                        <button
                          onClick={() => setActiveSubTab('status')}
                          className={`pb-2 text-xs font-bold uppercase transition-all ${activeSubTab === 'status' ? 'text-gold border-b-2 border-gold font-bold' : 'text-white/40 hover:text-white'}`}
                        >
                          Supervision Deck
                        </button>
                        <button
                          onClick={() => setActiveSubTab('reports')}
                          className={`pb-2 text-xs font-bold uppercase transition-all ${activeSubTab === 'reports' ? 'text-gold border-b-2 border-gold font-bold' : 'text-white/40 hover:text-white'}`}
                        >
                          Intelligence Reports ({activeOracle.reports.length})
                        </button>
                      </div>

                      {/* SUB TAB: Supervision Deck */}
                      {activeSubTab === 'status' && (
                        <div className="space-y-6">
                          {/* System health map */}
                          <div className="glass-card p-6 bg-white/5 space-y-6">
                            <h4 className="text-xs text-white/40 uppercase tracking-widest font-bold">OON Architecture Status</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {oracles.map((oracle) => {
                                if (oracle.id === 'sovereign') return null;
                                return (
                                  <div key={oracle.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {getOracleIcon(oracle.id, 16)}
                                      <div>
                                        <p className="text-xs font-bold text-white">{oracle.name}</p>
                                        <p className="text-[9px] text-white/40">{oracle.role}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-mono font-bold text-white/60">Health: {oracle.status === 'active' ? '100%' : '0%'}</span>
                                      <span className={`w-2 h-2 rounded-full ${oracle.status === 'active' ? 'bg-emerald-400' : 'bg-white/15'}`} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Creator Control & Reports triggering */}
                          <div className="glass-card p-6 border-gold/10 bg-gold/5 space-y-4">
                            <h4 className="text-xs text-gold uppercase tracking-widest font-bold flex items-center gap-2">
                              <Sparkles size={14} className="text-gold" /> Sovereign Commands (Creator Authority Only)
                            </h4>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Run supreme administrative subroutines to compile operational metrics, intelligence digests, or behavior score sheets into permanent PDF-equivalent reports.
                            </p>

                            <div className="flex flex-wrap gap-4">
                              <button
                                onClick={() => handleGenerateReport('weekly')}
                                className="px-5 py-2.5 bg-gold hover:bg-gold-bright text-black font-bold uppercase rounded-lg transition-all text-[10px] tracking-widest"
                              >
                                Compile Weekly Alignment Report
                              </button>
                              
                              <button
                                onClick={() => handleGenerateReport('intelligence')}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase rounded-lg border border-white/10 transition-all text-[10px] tracking-widest"
                              >
                                Compile Creator Briefing
                              </button>
                            </div>

                            {!isCreator && (
                              <div className="flex gap-2 items-center text-[10px] text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                                <Lock size={12} />
                                <span>Note: System is currently running under Subscriber view mode. Interactive report commands are locked.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB TAB: Intelligence Reports */}
                      {activeSubTab === 'reports' && (
                        <div className="space-y-6">
                          {activeOracle.reports.length > 0 ? (
                            <div className="space-y-6">
                              {activeOracle.reports.map((report) => (
                                <div key={report.id} className="glass-card p-6 bg-black/40 border-white/5 space-y-4">
                                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                                    <div>
                                      <h4 className="text-base font-bold text-white">{report.title}</h4>
                                      <p className="text-[10px] text-white/40 mt-0.5">{new Date(report.date).toLocaleString()}</p>
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded ${
                                      report.type === 'intelligence' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-gold/15 text-gold border border-gold/20'
                                    }`}>
                                      {report.type}
                                    </span>
                                  </div>

                                  <div className="text-xs text-white/80 leading-relaxed font-sans whitespace-pre-line prose prose-invert prose-sm max-w-none">
                                    {report.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="glass-card p-12 text-center text-white/40 space-y-3">
                              <FileText size={40} className="mx-auto text-white/20" />
                              <p className="text-sm">No oversight reports generated yet.</p>
                              {isCreator && (
                                <button
                                  onClick={() => handleGenerateReport('weekly')}
                                  className="px-4 py-2 bg-gold text-black rounded-lg font-bold text-xs uppercase"
                                >
                                  Generate First Report
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* FOOTER EVENT STREAM COMPONENT */}
      <section className="glass-card p-6 bg-white/5 border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-gold" size={18} />
            <h3 className="text-lg font-display font-bold text-white">OON Live Event Coordination Stream</h3>
          </div>
          <span className="text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded font-mono font-bold">
            EVENT-DRIVEN ROUTING PROTOCOL
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {events.length > 0 ? (
            events.map((evt) => (
              <div key={evt.id} className="bg-black/40 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs font-mono">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    evt.status === 'failed' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gold font-bold">{evt.type}</span>
                      <span className="text-white/20 text-[10px]">{evt.timestamp}</span>
                    </div>
                    <p className="text-white/70 text-[11px] mt-1">{evt.details}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center">
                  <span className="text-[10px] text-white/30 uppercase mr-1">Responded:</span>
                  {evt.oraclesResponded.length > 0 ? (
                    evt.oraclesResponded.map((oId) => (
                      <span key={oId} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white font-semibold">
                        {oId.toUpperCase()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-white/30 italic">None</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-white/40 italic py-6 text-center">
              Event monitoring idle. Awaiting platform transaction events.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
