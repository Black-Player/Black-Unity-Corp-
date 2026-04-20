import { useMemo } from 'react';
import { Trade } from '../types';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface AssetHeatmapProps {
  trades: Trade[];
}

export default function AssetHeatmap({ trades }: AssetHeatmapProps) {
  const performanceData = useMemo(() => {
    const data: Record<string, { pnl: number, count: number, wins: number }> = {};
    
    trades.forEach(t => {
      if (!data[t.pair]) {
        data[t.pair] = { pnl: 0, count: 0, wins: 0 };
      }
      data[t.pair].pnl += t.pnl;
      data[t.pair].count += 1;
      if (t.pnl > 0) data[t.pair].wins += 1;
    });

    return Object.entries(data).map(([pair, stats]) => {
      const wRate = (stats.wins / stats.count) * 100;
      return {
        pair: pair.replace('frx', '').replace('cry', '').replace('R_', 'Vol '),
        pnl: stats.pnl,
        winRate: wRate,
        count: stats.count,
        liquidityZone: wRate > 60 ? 'Bullish Buy-Side Liquidity' : (wRate < 40 ? 'Bearish Sell-Side Liquidity' : 'Ranging Equilibrium')
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  if (performanceData.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="text-blue-400" size={16} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Phase 22: Predictive Liquidity Matrix</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {performanceData.map((asset, i) => (
          <motion.div
            key={asset.pair}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-4 border-white/5 relative overflow-hidden group hover:border-white/20 transition-all ${
              asset.pnl >= 0 ? 'bg-emerald-400/5' : 'bg-rose-400/5'
            }`}
          >
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              {asset.pnl >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{asset.pair}</p>
            <h4 className={`text-lg font-display font-bold ${asset.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {asset.pnl >= 0 ? '+' : ''}{asset.pnl.toFixed(2)}
            </h4>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-white/30 uppercase tracking-widest">Win Rate</span>
                <span className="text-[10px] font-bold text-white/80">{asset.winRate.toFixed(0)}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${asset.winRate >= 50 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  style={{ width: `${asset.winRate}%` }}
                ></div>
              </div>
              <div className="text-[8px] font-bold text-white/40 uppercase bg-black/20 p-1.5 rounded-md mt-2 text-center border border-white/5 truncate">
                {asset.liquidityZone}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
