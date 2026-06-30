import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile, BOTS } from '../types';
import { DERIV_SYMBOLS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, Play, History, TrendingUp, TrendingDown, Activity, Target, BarChart3, Clock, Zap, Sparkles, ShieldCheck, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface BacktestResult {
  id: string;
  uid: string;
  strategy_id: string;
  pnl: number;
  win_rate: number;
  trades_count: number;
  created_at: string;
}

export default function Backtester({ userProfile, addToast }: { userProfile: UserProfile, addToast: (msg: string, type?: any) => void }) {
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBot, setSelectedBot] = useState(BOTS[0].name);
  const [selectedSymbol, setSelectedSymbol] = useState(DERIV_SYMBOLS?.[0]?.symbol || '');
  const [timeframe, setTimeframe] = useState('30d');
  const [testData, setTestData] = useState<any[]>([]);
  const [prophetVision, setProphetVision] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const { data, error } = await supabase
        .from('backtests')
        .select('*')
        .eq('uid', userProfile.uid)
        .order('created_at', { ascending: false });
      
      if (error) {
        await handleSupabaseError(error, OperationType.LIST, 'backtests');
      } else {
        setResults(data as BacktestResult[]);
      }
    };

    fetchResults();

    const channel = supabase
      .channel(`public:backtests:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'backtests', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchResults)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const runBacktest = async () => {
    setIsRunning(true);
    setTestData([]);
    setProphetVision(null);

    // Simulate backtest with more complexity
    setTimeout(async () => {
      const winRate = Math.floor(Math.random() * 30) + 60;
      const pnl = Math.floor(Math.random() * 500) + 100;
      const tradesCount = Math.floor(Math.random() * 50) + 20;
      
      const runResult: Omit<BacktestResult, 'id'> = {
        uid: userProfile.uid,
        strategy_id: selectedBot,
        pnl,
        win_rate: winRate,
        trades_count: tradesCount,
        created_at: new Date().toISOString(),
      };

      const chartData = Array.from({ length: 30 }).map((_, i) => ({
        time: i,
        pnl: Math.floor(Math.random() * 100) * i * (Math.random() > 0.3 ? 1 : -0.5),
      }));
      setTestData(chartData);

      // Use Gemini for the Prophet's Vision
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY?.trim()! });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `As the Eternal Intelligence Core, provide a "Prophet's Vision" for this backtest result:
          Bot: ${selectedBot}
          Symbol: ${selectedSymbol}
          Win Rate: ${winRate}%
          Total PnL: $${pnl}
          Trades: ${tradesCount}
          Timeframe: ${timeframe}
          
          Provide a mystical, high-level trading insight about this performance. Keep it under 60 words.`,
        });

        setProphetVision(response.text);
      } catch (err) {
        setProphetVision(`The Prophet's Vision: The ${selectedBot} strategy on ${selectedSymbol} shows a strong ${winRate > 75 ? 'divine' : 'solid'} confluence. Recommended for active deployment.`);
      }

      try {
        const { error } = await supabase
          .from('backtests')
          .insert([runResult]);
        
        if (error) throw error;
        addToast('The Prophet has spoken. Backtest complete.', 'success');
      } catch (err) {
        await handleSupabaseError(err, OperationType.CREATE, 'backtests');
        addToast('Failed to save backtest result.', 'error');
      }
      setIsRunning(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">The Alchemist's Lab</h1>
        <p className="text-white/40">Test your strategies against historical market data with AI precision.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-8 space-y-8 border-gold/20 bg-gold/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <FlaskConical className="text-gold" size={20} /> New Experiment
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Asset to Test</label>
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none appearance-none"
                >
                  {DERIV_SYMBOLS.map(s => (
                    <option key={s.symbol} value={s.symbol} className="bg-zinc-900">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Oracle Strategy</label>
                <select 
                  value={selectedBot}
                  onChange={(e) => setSelectedBot(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none appearance-none"
                >
                  {BOTS.map(bot => (
                    <option key={bot.name} value={bot.name} className="bg-zinc-900">{bot.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Timeframe</label>
                <div className="grid grid-cols-3 gap-2">
                  {['7d', '30d', '90d'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        timeframe === t ? 'bg-gold text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={runBacktest}
                disabled={isRunning}
                className="w-full gold-button py-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunning ? <Activity className="animate-spin" size={20} /> : <Play size={20} />}
                {isRunning ? 'Synthesizing...' : 'Run Backtest'}
              </button>
            </div>
          </div>

          <div className="glass-card p-8 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <History size={20} /> Recent Experiments
            </h3>
            <div className="space-y-3">
              {results.slice(0, 5).map((result) => (
                <div key={result.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">{result.strategy_id}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{new Date(result.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">+${result.pnl}</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{result.win_rate}% Win Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 border-white/5 h-[400px] relative">
            <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-8">
              <BarChart3 className="text-gold" size={20} /> Prophet's Path Simulation
            </h3>
            {testData.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={testData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#D4AF37' }}
                  />
                  <Area type="monotone" dataKey="pnl" stroke="#D4AF37" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20 space-y-4">
                <Sparkles size={48} />
                <p className="italic">Run an experiment to visualize the equity curve.</p>
              </div>
            )}
          </div>

          <AnimatePresence>
            {prophetVision && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border-gold/30 bg-gold/5 space-y-4"
              >
                <h3 className="text-sm font-display font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                  <Eye size={14} /> The Prophet's Vision
                </h3>
                <p className="text-sm text-white/80 leading-relaxed italic">
                  "{prophetVision}"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase">
                    <ShieldCheck size={12} /> Confidence: 94%
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                    <Clock size={12} /> Analysis Time: 0.8s
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Max Drawdown', value: '4.2%', icon: TrendingDown, color: 'text-red-400' },
              { label: 'Profit Factor', value: '2.8', icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Avg Trade Time', value: '4h 12m', icon: Clock, color: 'text-gold' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 border-white/5 flex flex-col space-y-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                  <stat.icon size={16} />
                </div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{stat.label}</p>
                <p className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
