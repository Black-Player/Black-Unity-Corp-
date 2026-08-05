import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Shield, Zap, Target, Trophy, Users, Search, Filter, Sparkles, MessageSquare, Lock, Unlock, ArrowUpRight, ArrowDownRight, Calendar, Clock, DollarSign, Percent, PieChart, LineChart } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line, AreaChart, Area, PieChart as RePieChart, Pie, Cell } from 'recharts';

import { BehavioralService } from '../services/behavioralService';

export default function Analytics({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7D');
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const data = await dbService.list('trades', [
          where('uid', '==', userProfile.uid)
        ]);
        const sorted = (data as any[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTrades(sorted || []);
      } catch (err) {
        try {
          const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('uid', userProfile.uid)
            .order('created_at', { ascending: false })
            .limit(100);
          if (!error && data) setTrades(data);
        } catch (e) {
          console.error("Error fetching trades:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
    
    const fetchInsights = async () => {
         setLoadingInsights(true);
         try {
            const growthRecs = await BehavioralService.getGrowthRecommendations(userProfile.uid);
            setInsights(growthRecs);
         } catch(e) {
            console.error("Failed to fetch behavioral insights", e);
         } finally {
            setLoadingInsights(false);
         }
    };
    
    fetchInsights();

    const unsubscribe = dbService.subscribeCollection('trades', [
      where('uid', '==', userProfile.uid)
    ], (data) => {
      const sorted = (data as any[]).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTrades(sorted);
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile.uid]);

  const closedTrades = trades.filter(t => t.status === 'closed' || t.pnl !== undefined);
  const winningTrades = closedTrades.filter(t => t.pnl > 0 || t.status === 'won' || t.result === 'Won');
  const totalProfitNum = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const stats = {
    totalTrades: trades.length,
    winRate: closedTrades.length > 0 ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1) : '0.0',
    totalProfit: totalProfitNum.toFixed(2),
    avgProfit: trades.length > 0 ? (totalProfitNum / trades.length).toFixed(2) : '0.00',
    maxDrawdown: '2.4%',
    profitFactor: closedTrades.length > 0 ? (winningTrades.length > 0 ? '2.15' : '1.00') : '0.00'
  };

  const startingBalance = userProfile.account_type === 'live' ? userProfile.live_balance : userProfile.demo_balance;
  let runningBalance = startingBalance || 1000;
  
  const chartData = trades.slice().reverse().map((t, i) => {
    runningBalance += (t.pnl || 0);
    return {
      name: i + 1,
      pnl: t.pnl || 0,
      balance: parseFloat(runningBalance.toFixed(2))
    };
  });

  const pairCounts: Record<string, number> = {};
  trades.forEach(t => {
    if (t.pair) {
      pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
    }
  });

  const assetDistribution = Object.keys(pairCounts).length > 0
    ? Object.entries(pairCounts).map(([name, value]) => ({ name, value }))
    : [
        { name: 'EURUSD', value: 4 },
        { name: 'GBPUSD', value: 3 },
        { name: 'XAUUSD', value: 2 },
        { name: 'BTC', value: 1 },
      ];

  const COLORS = ['#D4AF37', '#996515', '#F9E29C', '#FFFFFF'];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <BarChart3 className="text-gold" size={32} /> Performance Analytics
          </h1>
          <p className="text-white/40">Deep dive into your trading rituals and neural alignment.</p>
        </div>
        <div className="flex gap-1 p-1 glass-card border-white/5">
          {['24H', '7D', '30D', 'ALL'].map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                timeframe === t ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-white/40 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Win Rate', value: `${stats.winRate}%`, icon: Target, color: 'text-emerald-400' },
          { label: 'Total P/L', value: `${stats.totalProfit} USDT`, icon: DollarSign, color: 'text-gold' },
          { label: 'Profit Factor', value: stats.profitFactor, icon: Activity, color: 'text-emerald-400' },
          { label: 'Max Drawdown', value: stats.maxDrawdown, icon: TrendingDown, color: 'text-red-400' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                <item.icon size={20} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight size={12} /> +12%
              </span>
            </div>
            <div>
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{item.label}</p>
              <p className={`text-2xl font-display font-bold ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <LineChart className="text-gold" size={20} /> Equity Curve
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold"></span> Balance</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Profit</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#D4AF37' }}
                />
                <Area type="monotone" dataKey="balance" stroke="#D4AF37" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5 space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <PieChart className="text-gold" size={20} /> Asset Allocation
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={assetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {assetDistribution.map((asset, i) => (
              <div key={asset.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs font-bold">{asset.name}</span>
                </div>
                <span className="text-xs text-white/40 font-mono">{(asset.value / 1200 * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 border-gold/10 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xl font-display font-bold flex items-center gap-2">
               <Trophy className="text-gold" size={20} /> Weekly Prophetic Summary
             </h3>
             <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Last 7 Cycles</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Weekly Volume</p>
                <p className="text-xl font-bold font-display text-gold">
                  ${trades.filter(t => new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString()}
                </p>
             </div>
             <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Consistency Score</p>
                <p className="text-xl font-bold font-display text-emerald-400">94/100</p>
             </div>
          </div>
          <div className="space-y-3">
             <p className="text-xs text-white/60 leading-relaxed italic border-l-2 border-gold pl-4 py-1">
               "Your presence in the London session continues to yield high-alpha results. The Omni Core detects a slight divergence in your discipline during the final hours of the New York session. Recalibrate for the coming week."
             </p>
             <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                   <TrendingUp size={12} /> +18.4% WoW
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gold font-bold">
                   <Target size={12} /> 12 Prophecies Fulfilled
                </div>
             </div>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5 space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Zap className="text-gold" size={20} /> AI Oracle Accuracy
          </h3>
          <div className="space-y-6">
            {[
              { name: 'Trinity', accuracy: 92, signals: 124 },
              { name: 'Neo', accuracy: 88, signals: 96 },
              { name: 'Morpheus', accuracy: 85, signals: 72 },
              { name: 'Oracle', accuracy: 94, signals: 48 },
            ].map((oracle) => (
              <div key={oracle.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{oracle.name}</span>
                    <span className="text-[10px] text-white/40 font-mono">{oracle.signals} Signals</span>
                  </div>
                  <span className="text-sm font-bold text-gold">{oracle.accuracy}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${oracle.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="lg:col-span-2 glass-card p-8 border-gold/10 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xl font-display font-bold flex items-center gap-2">
               <Shield className="text-gold" size={20} /> AI Behavioral Insights
             </h3>
             <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Auto-Logged by Zion</span>
          </div>
          <div className="space-y-4">
             {loadingInsights ? (
                 <p className="text-xs text-white/40 italic">Zion is analyzing your trading patterns...</p>
             ) : insights.length > 0 ? (
                 insights.map((insight, idx) => (
                     <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                            <Sparkles size={14} className={idx % 2 === 0 ? "text-emerald-400" : "text-gold"} /> 
                            {idx === 0 ? "Account Scalability" : "Discipline & Psychology"}
                        </p>
                        <p className="text-xs text-white/60 leading-relaxed italic">"{insight}"</p>
                     </div>
                 ))
             ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-white/60 leading-relaxed italic">Not enough closed trades to form a solid behavioral construct. The Oracle requires more data.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
