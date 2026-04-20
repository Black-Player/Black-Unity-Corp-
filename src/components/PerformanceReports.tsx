import { useState, useEffect, useMemo } from 'react';
import { UserProfile, Trade } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText, PieChart, Activity, Shield, Zap, Target, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RePieChart, Pie } from 'recharts';

import TradeHistory from './TradeHistory';
import AssetHeatmap from './AssetHeatmap';

interface PerformanceReportsProps {
  userProfile: UserProfile;
}

export default function PerformanceReports({ userProfile }: PerformanceReportsProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('uid', userProfile.uid)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setTrades(data as Trade[]);
      } catch (err) {
        await handleSupabaseError(err, OperationType.LIST, 'trades');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();

    const channel = supabase
      .channel('trades-performance')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trades',
        filter: `uid=eq.${userProfile.uid}`
      }, () => {
        fetchTrades();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const stats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalProfit = closedTrades.reduce((acc, t) => acc + (t.pnl > 0 ? t.pnl : 0), 0);
    const totalLoss = Math.abs(closedTrades.reduce((acc, t) => acc + (t.pnl < 0 ? t.pnl : 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 100 : 0;
    const netPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

    return {
      totalTrades,
      winRate,
      profitFactor,
      netPnL,
      winningTrades,
      losingTrades: totalTrades - winningTrades,
    };
  }, [trades]);

  const chartData = useMemo(() => {
    if (trades.length === 0) return [];
    
    // Group trades by date and calculate cumulative PnL
    const sortedTrades = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let cumulativePnL = 0;
    
    return sortedTrades.map(t => {
      cumulativePnL += t.pnl;
      return {
        date: new Date(t.created_at).toLocaleDateString(),
        pnl: cumulativePnL,
        tradePnL: t.pnl,
        pair: t.pair
      };
    });
  }, [trades]);

  const assetDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    trades.forEach(t => {
      distribution[t.pair] = (distribution[t.pair] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({
      name: name.replace('frx', '').replace('cry', '').replace('R_', 'Vol '),
      value: Math.round((value / trades.length) * 100)
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [trades]);

  const COLORS = ['#D4AF37', '#4ade80', '#60a5fa', '#f472b6', '#fbbf24'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <BarChart3 className="text-gold" /> Performance Analytics
          </h1>
          <p className="text-white/40 mt-1">Deep cosmic analysis of your trading journey.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          {(['7d', '30d', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                timeframe === t ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Net Profit', value: `$${stats.netPnL.toFixed(2)}`, icon: TrendingUp, color: stats.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400', trend: stats.netPnL >= 0 ? '+12.5%' : '-5.2%' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Zap, color: 'text-gold', trend: '+2.1%' },
          { label: 'Profit Factor', value: stats.profitFactor.toFixed(2), icon: Activity, color: 'text-blue-400', trend: '+0.12' },
          { label: 'Total Rituals', value: stats.totalTrades.toString(), icon: Target, color: 'text-white', trend: 'Active' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon size={48} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</h3>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <TrendingUp className="text-gold" size={20} /> Equity Curve
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gold"></div> Cumulative PnL
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Activity className="text-gold animate-spin" size={32} />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ color: '#ffffff40', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#D4AF37" 
                    fillOpacity={1} 
                    fill="url(#colorPnL)" 
                    strokeWidth={3} 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                <Activity size={48} />
                <p className="italic">No ritual data available for analysis.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-8 border-white/5 flex flex-col">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-8">
            <PieChart className="text-gold" size={20} /> Asset Distribution
          </h3>
          <div className="flex-1 min-h-[250px]">
            {assetDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {assetDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20">
                <p className="text-xs italic">No assets traded yet.</p>
              </div>
            )}
          </div>
          <div className="mt-6 space-y-3">
            {assetDistribution.map((asset, index) => (
              <div key={asset.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-white/60">{asset.name}</span>
                </div>
                <span className="text-xs font-bold text-white">{asset.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="text-gold" size={20} />
          <h3 className="text-xl font-display font-bold">Celestial Asset Map</h3>
        </div>
        <AssetHeatmap trades={trades} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="glass-card p-8 border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <FileText className="text-gold" size={20} /> The Oracle's Ledger
            </h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Complete Ritual History</p>
          </div>
          <TradeHistory trades={trades} userId={userProfile.uid} />
        </div>
      </div>
    </div>
  );
}
