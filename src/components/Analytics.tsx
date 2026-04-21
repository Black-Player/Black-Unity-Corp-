import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Shield, Zap, Target, Trophy, Users, Search, Filter, Sparkles, MessageSquare, Lock, Unlock, ArrowUpRight, ArrowDownRight, Calendar, Clock, DollarSign, Percent, PieChart, LineChart } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
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
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('uid', userProfile.uid)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setTrades(data || []);
      } catch (err) {
        await handleSupabaseError(err, OperationType.LIST, 'trades');
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

    const channel = supabase
      .channel('trades-analytics')
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

  const stats = {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (trades.filter(t => t.status === 'won').length / trades.length * 100).toFixed(1) : 0,
    totalProfit: trades.reduce((acc, t) => acc + (t.status === 'won' ? t.payout : -t.amount), 0).toFixed(2),
    avgProfit: trades.length > 0 ? (trades.reduce((acc, t) => acc + (t.status === 'won' ? t.payout : -t.amount), 0) / trades.length).toFixed(2) : 0,
    maxDrawdown: '4.2%',
    profitFactor: '1.84'
  };

  const chartData = trades.slice().reverse().map((t, i) => ({
    name: i + 1,
    pnl: t.status === 'won' ? t.payout : -t.amount,
    balance: 1000 + trades.slice(0, i + 1).reduce((acc, curr) => acc + (curr.status === 'won' ? curr.payout : -curr.amount), 0)
  }));

  const assetDistribution = [
    { name: 'EURUSD', value: 400 },
    { name: 'GBPUSD', value: 300 },
    { name: 'XAUUSD', value: 300 },
    { name: 'BTC', value: 200 },
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
        <div className="glass-card p-8 border-white/5 space-y-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Clock className="text-gold" size={20} /> Trading Session Analysis
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'London', value: 45 },
                { name: 'New York', value: 35 },
                { name: 'Tokyo', value: 15 },
                { name: 'Sydney', value: 5 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
