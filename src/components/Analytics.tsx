import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { UserProfile, Trade, BOTS } from '../types';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, PieChart, Activity, Award, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AnalyticsProps {
  userProfile: UserProfile;
}

export default function Analytics({ userProfile }: AnalyticsProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [prophecy, setProphecy] = useState<string | null>(null);
  const [loadingProphecy, setLoadingProphecy] = useState(false);

  useEffect(() => {
    const fetchTrades = async () => {
      const q = query(
        collection(db, 'users', userProfile.uid, 'trades'),
        orderBy('created_at', 'asc')
      );
      const snapshot = await getDocs(q);
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(tradesData);
      setLoading(false);
    };

    fetchTrades();
  }, [userProfile.uid]);

  const generateProphecy = async () => {
    if (trades.length === 0) return;
    setLoadingProphecy(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const tradeSummary = trades.slice(-10).map(t => ({
        pair: t.pair,
        type: t.type,
        pnl: t.pnl,
        status: t.status
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As the RSA Trading Oracle, analyze these recent trades and provide a short, mystical, yet practical "Prophecy" for the trader's next steps. Use an African Cosmic tone. Trades: ${JSON.stringify(tradeSummary)}`,
      });

      setProphecy(response.text || "The stars are silent today. Continue your journey with caution.");
    } catch (error) {
      console.error("Prophecy error:", error);
      setProphecy("The cosmic veil is thick. I cannot see your path right now.");
    } finally {
      setLoadingProphecy(false);
    }
  };

  const closedTrades = trades.filter(t => t.status === 'closed');
  const winRate = closedTrades.length > 0 
    ? (closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100 
    : 0;
  const totalPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);

  // Prepare data for Equity Curve
  let runningPnl = 0;
  const equityData = closedTrades.map(t => {
    runningPnl += t.pnl;
    return {
      date: new Date(t.closed_at || t.created_at).toLocaleDateString(),
      pnl: runningPnl
    };
  });

  // Performance by Bot (Simulated mapping since trade doesn't have bot_name yet, 
  // but we can derive it from the signal if we had it. For now, let's mock bot performance)
  const botPerformance = BOTS.map(bot => ({
    name: bot.name,
    wins: Math.floor(Math.random() * 20) + 5,
    losses: Math.floor(Math.random() * 10) + 2
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Performance Analytics</h1>
        <p className="text-white/40">Detailed breakdown of your cosmic trading journey.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-gold" size={20} />
            <span className="text-sm text-white/40 uppercase tracking-widest">Total Trades</span>
          </div>
          <div className="text-3xl font-bold font-display">{closedTrades.length}</div>
        </div>
        <div className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-emerald-400" size={20} />
            <span className="text-sm text-white/40 uppercase tracking-widest">Win Rate</span>
          </div>
          <div className="text-3xl font-bold font-display text-emerald-400">{winRate.toFixed(1)}%</div>
        </div>
        <div className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} size={20} />
            <span className="text-sm text-white/40 uppercase tracking-widest">Total P/L</span>
          </div>
          <div className={`text-3xl font-bold font-display ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-gold" size={20} />
            <span className="text-sm text-white/40 uppercase tracking-widest">Avg. R:R</span>
          </div>
          <div className="text-3xl font-bold font-display">1:2.4</div>
        </div>
      </div>

      <div className="glass-card p-8 border-gold/20 bg-gold/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <h3 className="text-2xl font-display font-bold gold-gradient flex items-center gap-2">
              <Sparkles className="text-gold" size={24} /> The Oracle's Prophecy
            </h3>
            <p className="text-white/60 leading-relaxed italic">
              {prophecy || "Seek the wisdom of the stars to guide your next trade. The Oracle awaits your call."}
            </p>
            <button 
              onClick={generateProphecy}
              disabled={loadingProphecy || trades.length === 0}
              className="px-6 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loadingProphecy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Consult the Oracle
            </button>
          </div>
          <div className="w-full md:w-64 h-32 glass-card border-gold/10 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Cosmic Sentiment</p>
            <p className="text-2xl font-display font-bold text-gold">ASCENDING</p>
            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div className="w-3/4 h-full bg-gold" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold mb-8 flex items-center gap-2">
            <TrendingUp className="text-gold" size={20} /> Equity Curve
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  itemStyle={{ color: '#D4AF37' }}
                />
                <Area type="monotone" dataKey="pnl" stroke="#D4AF37" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5">
          <h3 className="text-xl font-display font-bold mb-8 flex items-center gap-2">
            <BarChart3 className="text-gold" size={20} /> Performance by Bot
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={botPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #ffffff10', borderRadius: '8px' }}
                />
                <Bar dataKey="wins" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
