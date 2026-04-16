import React, { useMemo, useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Briefcase, Activity, Target, Shield, Clock, XCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Trade } from '../types';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

import { useMarketContext } from '../MarketContext';

interface PortfolioProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleCloseTrade: (trade: Trade, reason?: string) => Promise<void>;
}

const COLORS = ['#FFD700', '#4ADE80', '#60A5FA', '#A78BFA', '#F472B6', '#FB923C'];

export const Portfolio: React.FC<PortfolioProps> = ({ userProfile, addToast, handleCloseTrade }) => {
  const { marketPrices } = useMarketContext();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const portfolio = userProfile.portfolio || [];
  const currentAccountType = userProfile.account_type;
  
  useEffect(() => {
    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('uid', userProfile.uid)
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, OperationType.LIST, `trades`);
      } else {
        setTrades(data as Trade[]);
      }
      setLoading(false);
    };

    fetchTrades();

    const channel = supabase
      .channel(`public:trades:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trades', 
        filter: `uid=eq.${userProfile.uid}` 
      }, fetchTrades)
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const filteredPortfolio = portfolio.filter(p => p.account_type === currentAccountType);
  const openTrades = trades.filter(t => t.status === 'open' && t.account_type === currentAccountType);
  const closedTrades = trades.filter(t => t.status === 'closed' && t.account_type === currentAccountType);

  const totalValue = filteredPortfolio.reduce((acc, item) => {
    const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
    return acc + (item.amount * currentPrice);
  }, 0);

  const totalCost = filteredPortfolio.reduce((acc, item) => {
    return acc + (item.amount * item.avg_price);
  }, 0);

  const tradesPnl = openTrades.reduce((acc, trade) => {
    const currentPrice = marketPrices[trade.pair]?.price || trade.entry_price;
    const pnl = trade.type === 'buy' 
      ? (currentPrice - trade.entry_price) 
      : (trade.entry_price - currentPrice);
    return acc + pnl;
  }, 0);

  const totalPnl = (totalValue - totalCost) + tradesPnl;
  const pnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const chartData = useMemo(() => {
    const data = filteredPortfolio.map(item => {
      const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
      return {
        name: item.symbol.replace('_', ' ').toUpperCase(),
        value: item.amount * currentPrice
      };
    });
    
    openTrades.forEach(trade => {
      const currentPrice = marketPrices[trade.pair]?.price || trade.entry_price;
      const existing = data.find(d => d.name === trade.pair.replace('_', ' ').toUpperCase());
      if (existing) {
        existing.value += trade.entry_price; // Simplified value for trades
      } else {
        data.push({
          name: trade.pair.replace('_', ' ').toUpperCase(),
          value: trade.entry_price
        });
      }
    });

    return data.sort((a, b) => b.value - a.value);
  }, [filteredPortfolio, openTrades, marketPrices]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-2 border-gold/20 bg-gold/5"
        >
          <div className="flex items-center gap-3 text-white/40">
            <Wallet size={18} />
            <span className="text-xs uppercase tracking-widest">Portfolio Value</span>
          </div>
          <p className="text-3xl font-bold font-display text-gold">${(totalValue + openTrades.length * 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 space-y-2"
        >
          <div className="flex items-center gap-3 text-white/40">
            <TrendingUp size={18} />
            <span className="text-xs uppercase tracking-widest">Total P/L</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold font-display ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className={`text-sm font-bold ${totalPnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
              ({totalPnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%)
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 space-y-2"
        >
          <div className="flex items-center gap-3 text-white/40">
            <PieChart size={18} />
            <span className="text-xs uppercase tracking-widest">Active Rituals</span>
          </div>
          <p className="text-3xl font-bold font-display">{filteredPortfolio.length + openTrades.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <PieChart className="text-gold" size={20} /> Asset Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Activity className="text-gold" size={20} /> Portfolio Health
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-white/40">Risk Exposure</span>
                <span className="text-emerald-400">Low</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[25%] shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-white/40">Diversification Score</span>
                <span className="text-gold">85%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gold w-[85%] shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">Max Drawdown</div>
                <div className="text-lg font-bold text-red-400">-2.4%</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">Sharpe Ratio</div>
                <div className="text-lg font-bold text-emerald-400">2.8</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Zap className="text-gold" size={20} /> Active Rituals (Open Trades)
        </h3>

        <div className="space-y-4">
          {openTrades.map((trade) => {
            const currentPrice = marketPrices[trade.pair]?.price || trade.entry_price;
            const pnl = trade.type === 'buy' 
              ? (currentPrice - trade.entry_price) 
              : (trade.entry_price - currentPrice);
            const pnlPerc = (pnl / trade.entry_price) * 100;

            return (
              <motion.div 
                key={trade.id}
                layout
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'text-red-400 bg-red-400/10'}`}>
                    {trade.type === 'buy' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{trade.pair.replace('_', ' ').toUpperCase()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {trade.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex gap-3">
                      <span>Entry: ${trade.entry_price.toFixed(2)}</span>
                      <span>Current: ${currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-bold ${pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCloseTrade(trade)}
                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-red-400/10 hover:text-red-400 transition-all"
                    title="Conclude Ritual"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {openTrades.length === 0 && (
            <div className="py-12 text-center text-white/20 italic border border-dashed border-white/5 rounded-xl">
              No active rituals in the physical realm.
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Clock className="text-gold" size={20} /> Ritual History (Closed Trades)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5">
                <th className="pb-4">Asset</th>
                <th className="pb-4">Type</th>
                <th className="pb-4">Entry</th>
                <th className="pb-4">Exit</th>
                <th className="pb-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {closedTrades.map((trade) => {
                const pnl = trade.pnl || 0;
                const pnlPerc = trade.pnl_percentage || 0;

                return (
                  <tr key={trade.id} className="text-sm">
                    <td className="py-4 font-bold">{trade.pair.replace('_', ' ').toUpperCase()}</td>
                    <td className="py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-4 font-mono">${trade.entry_price.toFixed(2)}</td>
                    <td className="py-4 font-mono">${(trade.entry_price + pnl).toFixed(2)}</td>
                    <td className="py-4 text-right">
                      <div className={`flex flex-col items-end ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span className="font-bold">{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</span>
                        <span className="text-[10px] opacity-60">({pnl >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%)</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {closedTrades.length === 0 && (
          <div className="py-12 text-center text-white/20 italic">
            Your ritual history is empty.
          </div>
        )}
      </div>
    </div>
  );
};
