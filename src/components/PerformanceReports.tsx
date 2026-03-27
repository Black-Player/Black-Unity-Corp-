import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText, PieChart, Activity, Shield, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface PerformanceReportsProps {
  userProfile: UserProfile;
}

export default function PerformanceReports({ userProfile }: PerformanceReportsProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);

  // Mock data for the charts
  const performanceData = [
    { date: '2024-03-20', profit: 120, drawdown: -20 },
    { date: '2024-03-21', profit: 450, drawdown: -10 },
    { date: '2024-03-22', profit: 320, drawdown: -40 },
    { date: '2024-03-23', profit: 890, drawdown: -5 },
    { date: '2024-03-24', profit: 1200, drawdown: -15 },
    { date: '2024-03-25', profit: 950, drawdown: -60 },
    { date: '2024-03-26', profit: 1540, drawdown: -10 },
  ];

  const assetPerformance = [
    { name: 'BTC/USD', value: 45, color: '#F7931A' },
    { name: 'ETH/USD', value: 30, color: '#627EEA' },
    { name: 'SOL/USD', value: 15, color: '#14F195' },
    { name: 'Other', value: 10, color: '#8884d8' },
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
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
          { label: 'Total Profit', value: '+$1,540.24', icon: TrendingUp, color: 'text-emerald-400', trend: '+12.5%' },
          { label: 'Win Rate', value: '68.4%', icon: Zap, color: 'text-gold', trend: '+2.1%' },
          { label: 'Max Drawdown', value: '-4.2%', icon: TrendingDown, color: 'text-rose-400', trend: '-0.5%' },
          { label: 'Profit Factor', value: '2.48', icon: Activity, color: 'text-blue-400', trend: '+0.12' },
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
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
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
              <TrendingUp className="text-gold" size={20} /> Profit Growth
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gold"></div> Profit
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Drawdown
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => val.split('-')[2]}
                />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="profit" stroke="#FFD700" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                <Area type="monotone" dataKey="drawdown" stroke="#F43F5E" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-8">
            <PieChart className="text-gold" size={20} /> Asset Distribution
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetPerformance} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {assetPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {assetPerformance.map((asset) => (
              <div key={asset.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }}></div>
                  <span className="text-xs text-white/60">{asset.name}</span>
                </div>
                <span className="text-xs font-bold text-white">{asset.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-6">
            <Shield className="text-gold" size={20} /> Risk Assessment
          </h3>
          <div className="space-y-6">
            {[
              { label: 'Sharpe Ratio', value: '1.84', desc: 'Excellent risk-adjusted returns', score: 85 },
              { label: 'Sortino Ratio', value: '2.12', desc: 'Superior downside protection', score: 92 },
              { label: 'Beta', value: '0.85', desc: 'Lower volatility than market average', score: 78 },
            ].map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold text-white">{metric.label}</p>
                    <p className="text-[10px] text-white/40 italic">{metric.desc}</p>
                  </div>
                  <span className="text-lg font-bold text-gold">{metric.value}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.score}%` }}
                    className="h-full bg-gold shadow-[0_0_10px_rgba(255,215,0,0.3)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-6">
            <FileText className="text-gold" size={20} /> Export Reports
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Full Performance Audit', format: 'PDF', size: '2.4 MB' },
              { title: 'Trade History Log', format: 'CSV', size: '1.1 MB' },
              { title: 'Tax Summary 2024', format: 'PDF', size: '0.8 MB' },
              { title: 'AI Strategy Insights', format: 'JSON', size: '0.5 MB' },
            ].map((report) => (
              <button
                key={report.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-gold/30 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                  <Download size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{report.title}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{report.format} • {report.size}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-xl bg-gold/5 border border-gold/10 flex items-center gap-4">
            <Calendar className="text-gold" size={20} />
            <div>
              <p className="text-xs font-bold text-white">Next Auto-Report</p>
              <p className="text-[10px] text-white/40">Scheduled for April 1st, 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
