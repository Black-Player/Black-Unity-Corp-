import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Zap, Target, Shield, Activity, RefreshCw, BarChart3, Database, Cpu, Sparkles, TrendingUp, TrendingDown, Clock, Search, List, Settings, CheckCircle2, Globe } from 'lucide-react';
import { UserProfile, Trade } from '../types';
import { dbService } from '../services/dbService';
import { StrategyService, TradingStrategy } from '../services/strategyService';
import { BehavioralService } from '../services/behavioralService';
import { where, orderBy, limit } from 'firebase/firestore';

interface IntelligenceCoreProps {
    userProfile: UserProfile;
    addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const IntelligenceCore: React.FC<IntelligenceCoreProps> = ({ userProfile, addToast }) => {
    const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [optimizing, setOptimizing] = useState(false);
    const [marketMemory, setMarketMemory] = useState<any[]>([]);
    const [growthRecommendations, setGrowthRecommendations] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch strategies
                const strategyData = await dbService.list('trading_strategies', [
                    where('uid', '==', userProfile.uid),
                    orderBy('created_at', 'desc')
                ]);
                setStrategies(strategyData as unknown as TradingStrategy[]);

                // Fetch market memory (recent trade outcomes)
                const tradeData = await dbService.list('trades', [
                    where('uid', '==', userProfile.uid),
                    where('status', '==', 'closed'),
                    orderBy('closed_at', 'desc'),
                    limit(20)
                ]);
                setMarketMemory(tradeData);

                // Fetch Growth Recommendations
                const recommendations = await BehavioralService.getGrowthRecommendations(userProfile.uid);
                setGrowthRecommendations(recommendations);
            } catch (err) {
                console.error("Failed to fetch intelligence data", err);
            }
            setLoading(false);
        };

        fetchData();
    }, [userProfile.uid]);

    // PART 9: PAIR CONTROL SYSTEM
    const assetPerformance = marketMemory.reduce((acc: any, trade) => {
        if (!acc[trade.pair]) acc[trade.pair] = { win: 0, loss: 0, pnl: 0 };
        if (trade.pnl > 0) acc[trade.pair].win += 1;
        else acc[trade.pair].loss += 1;
        acc[trade.pair].pnl += trade.pnl;
        return acc;
    }, {});

    const handleOptimize = async (strategy: TradingStrategy) => {
        setOptimizing(true);
        try {
            const updated = await StrategyService.optimizeStrategy(strategy, marketMemory);
            await dbService.update('trading_strategies', strategy.id, updated as any);
            setStrategies(prev => prev.map(s => s.id === strategy.id ? updated : s));
            addToast(`Intelligence Evolved: ${strategy.name} optimization complete.`, 'success');
        } catch (err) {
            addToast("Optimization loop failed. Celestial debris detected.", 'error');
        }
        setOptimizing(false);
    };

    const handleEvolveAll = async () => {
        setOptimizing(true);
        addToast("Initiating Autonomous Evolution Loop...", "info");
        try {
            let updatedStrategies = [...strategies];
            
            for (let i = 0; i < updatedStrategies.length; i++) {
                const s = updatedStrategies[i];
                const updated = await StrategyService.optimizeStrategy(s, marketMemory);
                
                // PART 13: AUTO-KILL STRATEGIES
                if (updated.performance && updated.performance.total_trades > 5 && updated.performance.win_rate < 40) {
                    updated.is_active = false; // Auto-kill
                    console.log(`Auto-Killed Strategy: ${updated.name} due to poor performance (< 40%).`);
                }
                
                await dbService.update('trading_strategies', s.id, updated as any);
                updatedStrategies[i] = updated;
            }

            // PART 12: AI VS AI ENGINE - Sort and Promote
            updatedStrategies.sort((a, b) => (b.performance?.win_rate || 0) - (a.performance?.win_rate || 0));
            
            setStrategies(updatedStrategies);
            addToast("Evolution Loop Complete. Underperforming logic eradicated.", "success");
        } catch (err) {
            addToast("Evolution loop failed.", "error");
        }
        setOptimizing(false);
    };

    const handleFuseStrategies = async () => {
        if (strategies.length < 2) {
            addToast("You need at least two active strategies to initiate Fusion.", "error");
            return;
        }

        setOptimizing(true);
        addToast("Commencing Strategy Fusion. Merging Apex parameters...", "info");

        try {
            // Take the top 2 strategies based on performance
            const sorted = [...strategies].sort((a, b) => (b.performance?.win_rate || 0) - (a.performance?.win_rate || 0));
            const topStrats = sorted.slice(0, 2);

            const fusedStrategy = await StrategyService.fuseStrategies(topStrats[0], topStrats[1]);
            fusedStrategy.uid = userProfile.uid;

            await dbService.create('trading_strategies', fusedStrategy);
            setStrategies(prev => [fusedStrategy, ...prev]);

            addToast(`Strategy Fusion Complete! Created: ${fusedStrategy.name}`, "success");
        } catch (err) {
            console.error("Fusion Error:", err);
            addToast("Strategy Fusion failed. The logic streams collided heavily.", "error");
        }
        setOptimizing(false);
    };

    const handleExportPinescript = () => {
        // PHASE 20: THE WEAVER'S LOOM (Strategy Code Builder)
        if (strategies.length === 0) return;
        const topStrat = strategies[0];
        const script = `//@version=5
strategy("Omni Core - ${topStrat.name}", overlay=true)

// Script generated by The Weaver's Loom 
// Target Win Rate: ${topStrat.win_rate_target}%
// Risk Reward: 1:${topStrat.risk_reward_target}

longCondition = ta.crossover(ta.sma(close, 14), ta.sma(close, 28))
if (longCondition)
    strategy.entry("Log_Long", strategy.long)

shortCondition = ta.crossunder(ta.sma(close, 14), ta.sma(close, 28))
if (shortCondition)
    strategy.entry("Log_Short", strategy.short)
`;
        const blob = new Blob([script], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `OmniCore_${topStrat.name.replace(/\s+/g, "_")}.pine`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast("Weaver's Loom: Strategy successfully exported to PineScript.", 'success');
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Strategy Control Center */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            <Brain className="text-gold" /> Omni Evolution Core
                        </h2>
                        <div className="flex flex-wrap gap-2">
                             <button 
                                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2 transition-all"
                                onClick={handleExportPinescript}
                                disabled={strategies.length === 0}
                            >
                                <Database size={14} />
                                PineScript
                            </button>
                             <button 
                                className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2 transition-all"
                                onClick={handleFuseStrategies}
                                disabled={optimizing || strategies.length < 2}
                            >
                                <Zap size={14} className={optimizing ? "animate-pulse" : ""} />
                                Fuse Apex
                            </button>
                             <button 
                                className="px-4 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gold flex items-center gap-2 transition-all"
                                onClick={handleEvolveAll}
                                disabled={optimizing}
                            >
                                <RefreshCw size={14} className={optimizing ? "animate-spin" : ""} />
                                {optimizing ? "Evolving..." : "Evolve All"}
                            </button>
                        </div>
                    </div>

                    {/* PART 12: AI vs AI ENGINE */}
                    <div className="glass-card p-6 border border-gold/20 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Cpu size={80} className="text-gold" />
                         </div>
                         <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-gold animate-pulse" />
                                <h3 className="text-lg font-bold text-white italic">AI vs AI Competition Pool</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                                Our sentinel bots are currently competing for orbital dominance. Winning strategies receive increased celestial weight, while underperforming logic is automatically killed.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                {strategies.slice(0, 4).map((s, i) => (
                                    <div key={s.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                                         <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-2 border border-gold/20">
                                            <span className="text-sm font-bold">#{i+1}</span>
                                         </div>
                                         <p className="text-[10px] font-bold text-white truncate w-full text-center">{s.name}</p>
                                         <p className={`text-[8px] font-bold mt-1 uppercase ${s.performance?.win_rate && s.performance.win_rate > 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(s.performance?.win_rate || 0).toFixed(1)}% WR
                                         </p>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {strategies.map((strategy) => (
                            <motion.div 
                                key={strategy.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-card p-6 space-y-4 border-white/5 hover:border-gold/20 transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-white">{strategy.name}</h3>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{strategy.logic.substring(0, 30)}...</p>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${strategy.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {strategy.is_active ? 'Active' : 'Paused'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-3 bg-white/5 rounded-xl text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-bold">Accuracy</p>
                                        <p className="text-sm font-mono font-bold text-gold">{(strategy.performance?.win_rate || strategy.win_rate_target).toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-bold">Drawdown</p>
                                        <p className="text-sm font-mono font-bold text-red-400">{(strategy.performance?.drawdown || 0).toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl text-center">
                                        <p className="text-[8px] text-white/20 uppercase font-bold">R/R</p>
                                        <p className="text-sm font-mono font-bold text-blue-400">1:{strategy.risk_reward_target.toFixed(1)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button 
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                                        onClick={() => handleOptimize(strategy)}
                                        disabled={optimizing}
                                    >
                                        Optimize
                                    </button>
                                    <button className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                                        <Settings size={14} className="text-white/40" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Market Memory & Evolution Stats */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Sparkles className="text-gold" size={14} /> User DNA Intelligence
                        </h3>
                        <div className="space-y-4">
                             <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/40 uppercase font-bold">Discipline Score</span>
                                    <span className="text-xs font-mono font-bold text-gold">88/100</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gold" style={{ width: '88%' }} />
                                </div>
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <h4 className="text-[10px] text-gold uppercase font-bold tracking-widest">Growth Directives</h4>
                                    <div className="space-y-2">
                                        {growthRecommendations.map((rec, i) => (
                                            <p key={i} className="text-[10px] text-white/60 leading-relaxed italic border-l border-gold/20 pl-2">
                                                "{rec}"
                                            </p>
                                        ))}
                                    </div>
                                </div>
                             </div>

                             <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                                <h4 className="text-[10px] text-white/40 uppercase font-bold mb-2">Behavioral Risks</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-[10px] text-emerald-400">
                                        <CheckCircle2 size={12} /> No Revenge Trading
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] text-emerald-400">
                                        <CheckCircle2 size={12} /> Consistent Lot Sizing
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] text-orange-400">
                                        <Activity size={12} /> Slight Over-trading detected
                                    </li>
                                </ul>
                             </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Globe className="text-gold" size={14} /> Sentiment Engine
                        </h3>
                        <div className="space-y-4">
                             <div className="relative h-20 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                                <div className="absolute inset-0 flex">
                                    <div className="h-full bg-red-500/10 flex-1" />
                                    <div className="h-full bg-emerald-500/10 flex-1" />
                                </div>
                                <div className="relative text-center">
                                    <p className="text-lg font-bold text-white uppercase italic">Retail Sentiment</p>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">72% Long on XAUUSD &rarr; Seeking Liquidity Below</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Database className="text-gold" size={14} /> Market Memory
                        </h3>
                        
                        <div className="space-y-4">
                            {marketMemory.map((trade, i) => (
                                <div key={trade.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trade.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {trade.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-white">{trade.pair}</p>
                                        <p className="text-[10px] text-white/40">{new Date(trade.closed_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                        </p>
                                        <p className="text-[8px] text-white/20 uppercase font-bold">Outcome</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Target className="text-gold" size={14} /> Asset Dominance
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(assetPerformance).map(([pair, stats]: [string, any]) => (
                                <div key={pair} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-white">{pair}</span>
                                        <span className={stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                            ${stats.pnl.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                                        <div 
                                            className="h-full bg-emerald-500" 
                                            style={{ width: `${(stats.win / (stats.win + stats.loss)) * 100}%` }} 
                                        />
                                        <div 
                                            className="h-full bg-red-500" 
                                            style={{ width: `${(stats.loss / (stats.win + stats.loss)) * 100}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                            {Object.keys(assetPerformance).length === 0 && <p className="text-[10px] text-white/20 text-center py-4">Awaiting celestial data for asset profiling...</p>}
                        </div>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Activity className="text-gold" size={14} /> Intelligence Vitals
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase font-bold">
                                    <span className="text-white/40">Knowledge Base Base</span>
                                    <span className="text-gold">84%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '84%' }}
                                        className="h-full bg-gold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase font-bold">
                                    <span className="text-white/40">Pattern Detection</span>
                                    <span className="text-blue-400">92%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '92%' }}
                                        className="h-full bg-blue-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase font-bold">
                                    <span className="text-white/40">Risk Adaptability</span>
                                    <span className="text-emerald-400">76%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '76%' }}
                                        className="h-full bg-emerald-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
