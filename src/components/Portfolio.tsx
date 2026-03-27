import React, { useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Briefcase, Activity, Target, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PortfolioProps {
  userProfile: UserProfile;
  marketPrices: Record<string, any>;
}

const COLORS = ['#FFD700', '#4ADE80', '#60A5FA', '#A78BFA', '#F472B6', '#FB923C'];

export const Portfolio: React.FC<PortfolioProps> = ({ userProfile, marketPrices }) => {
  const portfolio = userProfile.portfolio || [];
  const currentAccountType = userProfile.account_type;
  
  const filteredPortfolio = portfolio.filter(p => p.account_type === currentAccountType);

  const totalValue = filteredPortfolio.reduce((acc, item) => {
    const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
    return acc + (item.amount * currentPrice);
  }, 0);

  const totalCost = filteredPortfolio.reduce((acc, item) => {
    return acc + (item.amount * item.avg_price);
  }, 0);

  const totalPnl = totalValue - totalCost;
  const pnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const chartData = useMemo(() => {
    return filteredPortfolio.map(item => {
      const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
      return {
        name: item.symbol.replace('_', ' ').toUpperCase(),
        value: item.amount * currentPrice
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredPortfolio, marketPrices]);

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
          <p className="text-3xl font-bold font-display text-gold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
            <span className="text-xs uppercase tracking-widest">Assets Held</span>
          </div>
          <p className="text-3xl font-bold font-display">{filteredPortfolio.length}</p>
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
          <Briefcase className="text-gold" size={20} /> Current Holdings ({currentAccountType.toUpperCase()})
        </h3>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5">
                <th className="pb-4">Asset</th>
                <th className="pb-4">Amount</th>
                <th className="pb-4">Avg Price</th>
                <th className="pb-4">Current Price</th>
                <th className="pb-4 text-right">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPortfolio.map((item, i) => {
                const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
                const pnl = (currentPrice - item.avg_price) * item.amount;
                const pnlPerc = ((currentPrice - item.avg_price) / item.avg_price) * 100;

                return (
                  <tr key={i} className="text-sm">
                    <td className="py-4 font-bold">{item.symbol.replace('_', ' ').toUpperCase()}</td>
                    <td className="py-4 font-mono">{item.amount.toFixed(4)}</td>
                    <td className="py-4 font-mono">${item.avg_price.toFixed(2)}</td>
                    <td className="py-4 font-mono">${currentPrice.toFixed(2)}</td>
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

        <div className="md:hidden space-y-4">
          {filteredPortfolio.map((item, i) => {
            const currentPrice = marketPrices[item.symbol]?.price || item.avg_price;
            const pnl = (currentPrice - item.avg_price) * item.amount;
            const pnlPerc = ((currentPrice - item.avg_price) / item.avg_price) * 100;

            return (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gold">{item.symbol.replace('_', ' ').toUpperCase()}</span>
                  <div className={`flex flex-col items-end ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="font-bold">{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</span>
                    <span className="text-[10px] opacity-60">({pnl >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%)</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-widest text-white/40">
                  <div>
                    <p>Amount</p>
                    <p className="text-white font-mono mt-1">{item.amount.toFixed(4)}</p>
                  </div>
                  <div>
                    <p>Avg Price</p>
                    <p className="text-white font-mono mt-1">${item.avg_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p>Current</p>
                    <p className="text-white font-mono mt-1">${currentPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPortfolio.length === 0 && (
          <div className="py-12 text-center text-white/20 italic">
            No active holdings in your {currentAccountType} portfolio.
          </div>
        )}
      </div>
    </div>
  );
};
