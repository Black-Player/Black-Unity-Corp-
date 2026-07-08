import React, { useMemo, useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Briefcase, Activity, Target, Shield, Clock, XCircle, Zap, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/dbService';
import { where, orderBy } from 'firebase/firestore';
import { UserProfile, Trade } from '../types';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { sendTradeReviewToTelegram } from '../services/communicationService';

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
  const currentAccountType = userProfile.account_type || 'demo';
  
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const data = await dbService.list('trades', [
          where('uid', '==', userProfile.uid),
          orderBy('created_at', 'desc')
        ]);
        setTrades(data as Trade[]);
      } catch (error) {
        console.error("Fetch trades failed", error);
      }
      setLoading(false);
    };

    fetchTrades();

    const unsubscribe = dbService.subscribeCollection('trades', [
      where('uid', '==', userProfile.uid),
      orderBy('created_at', 'desc')
    ], (data) => {
      setTrades(data as Trade[]);
    });
    
    return () => unsubscribe();
  }, [userProfile.uid]);

  const filteredPortfolio = portfolio.filter(p => (p.account_type || 'demo') === currentAccountType);
  const openTrades = trades.filter(t => t.status === 'open' && (t.account_type || 'demo') === currentAccountType);
  const closedTrades = trades.filter(t => t.status === 'closed' && (t.account_type || 'demo') === currentAccountType);

  const initialBalance = currentAccountType === 'live' ? userProfile.live_balance : userProfile.demo_balance;

  const tradesPnl = openTrades.reduce((acc, trade) => {
    const currentPrice = marketPrices[trade.pair]?.price || trade.entry_price;
    const diff = trade.type === 'buy' ? currentPrice - trade.entry_price : trade.entry_price - currentPrice;
    const pnl = diff * (trade.lot_size || 0.1) * 100;
    return acc + pnl;
  }, 0);

  const closedPnl = closedTrades.reduce((acc, trade) => acc + (trade.pnl || 0), 0);

  const currentEquity = initialBalance + tradesPnl;
  const totalPnl = closedPnl + tradesPnl;
  const pnlPercentage = initialBalance > 0 ? (totalPnl / (initialBalance - closedPnl)) * 100 : 0;

  const chartData = useMemo(() => {
    const data: {name: string, value: number}[] = [];
    
    openTrades.forEach(trade => {
      const currentPrice = marketPrices[trade.pair]?.price || trade.entry_price;
      const existing = data.find(d => d.name === trade.pair.replace('_', ' ').toUpperCase());
      const lotMultiplier = trade.lot_size || 1;
      const marginUsed = trade.entry_price * lotMultiplier;
      
      if (existing) {
        existing.value += marginUsed;
      } else {
        data.push({
          name: trade.pair.replace('_', ' ').toUpperCase(),
          value: marginUsed
        });
      }
    });
    
    if (data.length === 0) {
       data.push({ name: 'USD/CASH', value: initialBalance });
    }

    return data.sort((a, b) => b.value - a.value);
  }, [openTrades, marketPrices, initialBalance]);

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
          <p className="text-3xl font-bold font-display text-gold">${(currentEquity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
            const diff = trade.type === 'buy' 
              ? (currentPrice - trade.entry_price) 
              : (trade.entry_price - currentPrice);
            const pnl = diff * (trade.lot_size || 0.1) * 100;
            const pnlPerc = (diff / trade.entry_price) * 100;

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

                <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-bold ${pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                      {pnl >= 0 ? '+' : ''}{pnlPerc.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                          addToast("Please configure your Telegram credentials in Settings first.", "error");
                          return;
                        }
                        const success = await sendTradeReviewToTelegram({
                          ...trade,
                          pnl: pnl,
                          pnl_percentage: pnlPerc
                        }, userProfile.integrations);
                        if (success) {
                          addToast("Active trade status sent to Telegram!", "success");
                        } else {
                          addToast("Failed to send trade status. Please check your bot configuration.", "error");
                        }
                      }}
                      className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-gold/10 hover:text-gold transition-all cursor-pointer"
                      title="Send Active Trade Status to Telegram"
                    >
                      <Share2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleCloseTrade(trade)}
                      className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-red-400/10 hover:text-red-400 transition-all cursor-pointer"
                      title="Conclude Ritual"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
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
                <th className="pb-4 text-right pr-2">STT</th>
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
                    <td className="py-4 text-right pr-2">
                      <button 
                        onClick={async () => {
                          if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                            addToast("Please configure your Telegram credentials in Settings first.", "error");
                            return;
                          }
                          const success = await sendTradeReviewToTelegram(trade, userProfile.integrations);
                          if (success) {
                            addToast("Closed trade review sent to Telegram!", "success");
                          } else {
                            addToast("Failed to send trade review. Please verify your bot settings.", "error");
                          }
                        }}
                        className="p-1 px-2.5 rounded bg-gold/15 hover:bg-gold/25 text-gold text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1"
                        title="Send Closed Trade Report to Telegram"
                      >
                        <Share2 size={10} /> STT
                      </button>
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
