import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Trade } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Target,
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceStatsProps {
  userProfile: UserProfile;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ userProfile }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: userProfile.stats?.total_trades || 0,
    wins: userProfile.stats?.wins || 0,
    losses: userProfile.stats?.losses || 0,
    winRate: userProfile.win_rate || 0,
    totalProfit: userProfile.total_pnl || 0,
    profitFactor: userProfile.stats?.profit_factor || 0,
    maxDrawdown: userProfile.stats?.max_drawdown || 0,
    avgProfit: 0,
    bestTrade: 0,
    worstTrade: 0
  });

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const q = query(
          collection(db, 'users', userProfile.uid, 'trades'),
          where('status', '==', 'closed'),
          orderBy('closed_at', 'desc'),
          limit(50)
        );
        const querySnap = await getDocs(q);
        const fetchedTrades = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
        setTrades(fetchedTrades);

        // Calculate Stats
        if (fetchedTrades.length > 0) {
          const wins = fetchedTrades.filter(t => t.pnl > 0).length;
          const losses = fetchedTrades.filter(t => t.pnl <= 0).length;
          const totalProfit = fetchedTrades.reduce((acc, t) => acc + t.pnl, 0);
          const grossProfit = fetchedTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
          const grossLoss = Math.abs(fetchedTrades.filter(t => t.pnl <= 0).reduce((acc, t) => acc + t.pnl, 0));
          
          setStats({
            totalTrades: fetchedTrades.length,
            wins,
            losses,
            winRate: (wins / fetchedTrades.length) * 100,
            totalProfit,
            avgProfit: totalProfit / fetchedTrades.length,
            profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
            bestTrade: Math.max(...fetchedTrades.map(t => t.pnl)),
            worstTrade: Math.min(...fetchedTrades.map(t => t.pnl)),
            maxDrawdown: userProfile.stats?.max_drawdown || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching performance stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [userProfile.uid]);

  const chartData = [...trades].reverse().map((t, i) => {
    const cumulativePnl = trades.slice(trades.length - 1 - i).reduce((acc, curr) => acc + curr.pnl, 0);
    return {
      name: new Date(t.closed_at!).toLocaleDateString(),
      pnl: cumulativePnl
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Profit" 
          value={`$${stats.totalProfit.toFixed(2)}`} 
          icon={<TrendingUp className="text-emerald-400" />}
          trend={stats.totalProfit >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`} 
          icon={<Target className="text-gold" />}
          subValue={`${stats.wins}W / ${stats.losses}L`}
        />
        <StatCard 
          title="Profit Factor" 
          value={stats.profitFactor.toFixed(2)} 
          icon={<Shield size={18} className="text-blue-400" />}
          subValue="Gross P/L Ratio"
        />
        <StatCard 
          title="Max Drawdown" 
          value={`${stats.maxDrawdown.toFixed(1)}%`} 
          icon={<BarChart3 className="text-purple-400" />}
          subValue="Peak to Trough"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <TrendingUp className="text-gold" size={20} /> Equity Curve
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest">
              <Calendar size={12} /> Last 50 Trades
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '8px' }}
                  itemStyle={{ color: '#D4AF37' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#D4AF37" 
                  fillOpacity={1} 
                  fill="url(#colorPnl)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <PieChart className="text-gold" size={20} /> Performance Ratios
          </h3>
          <div className="space-y-4">
            <RatioRow label="Best Trade" value={`$${stats.bestTrade.toFixed(2)}`} color="text-emerald-400" />
            <RatioRow label="Worst Trade" value={`$${stats.worstTrade.toFixed(2)}`} color="text-red-400" />
            <RatioRow label="Total Volume" value={stats.totalTrades.toString()} />
            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/40 uppercase tracking-widest">Win Consistency</span>
                <span className="text-xs font-bold text-gold">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.winRate}%` }}
                  className="h-full bg-gold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <History className="text-gold" size={20} /> Trade History
          </h3>
          <button className="text-xs text-gold hover:underline">Export CSV</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Pair</th>
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Type</th>
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Entry</th>
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Exit</th>
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">P/L ($)</th>
                <th className="pb-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.map((trade) => (
                <tr key={trade.id} className="group hover:bg-white/5 transition-all">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{trade.pair}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 font-mono text-xs">{trade.entry_price}</td>
                  <td className="py-4 font-mono text-xs">{trade.current_price}</td>
                  <td className={`py-4 font-mono text-xs font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                  </td>
                  <td className="py-4 text-[10px] text-white/40">
                    {new Date(trade.closed_at!).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="text-center py-12 text-white/20 italic">No trade history available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, subValue }: any) => (
  <div className="glass-card p-6 space-y-2 border-white/5 hover:border-gold/20 transition-all">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{title}</span>
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-display font-bold">{value}</span>
      {trend && (
        <span className={`text-[10px] font-bold ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        </span>
      )}
    </div>
    {subValue && <p className="text-[10px] text-white/20">{subValue}</p>}
  </div>
);

const RatioRow = ({ label, value, color = "text-white/60" }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
  </div>
);
