import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useMarketContext } from '../MarketContext';
import { DERIV_SYMBOLS } from '../constants';

const TickerTapeItem = ({ symbol }: { symbol: string }) => {
  const { marketPrices } = useMarketContext();
  const data = marketPrices[symbol];
  
  if (!data) return null;

  const isUp = data.change >= 0;
  const price = data.price?.toFixed(4) || '0.0000';

  return (
    <div className="flex items-center gap-2 mx-6 border-r border-white/5 pr-6 last:border-0 text-xs font-mono">
      <span className="text-white/60 font-bold">{symbol}</span>
      <span className="text-white">{price}</span>
      <span className={`flex items-center text-[10px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {Math.abs(data.change || 0).toFixed(2)}%
      </span>
    </div>
  );
};

const MarketStatusBadge = () => {
  const { connectionStatus } = useMarketContext();

  const config = {
    Live: {
      text: 'LIVE',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse',
      icon: Wifi
    },
    Syncing: {
      text: 'SYNCING',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      dot: 'bg-blue-500 animate-spin',
      icon: RefreshCw
    },
    Delayed: {
      text: 'DELAYED',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse',
      icon: WifiOff
    }
  }[connectionStatus || 'Syncing'];

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${config.bg} ${config.color} border ${config.border} shrink-0 ml-3 mr-1 relative z-20`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon size={10} className="shrink-0" />
      <span>{config.text}</span>
    </div>
  );
};

export default function TickerTape() {
  const symbols = Object.values(DERIV_SYMBOLS).slice(0, 10).map(s => s.symbol);

  return (
    <div className="w-full bg-black border-b border-white/5 overflow-hidden py-1 relative top-0 z-50 flex items-center">
      <MarketStatusBadge />
      <div className="h-4 w-[1px] bg-white/10 mx-2 shrink-0 z-20" />
      
      <div className="relative flex-1 overflow-hidden flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10" />
        
        <div className="flex animate-marquee whitespace-nowrap min-w-max">
          {[...symbols, ...symbols].map((symbol, i) => (
            <TickerTapeItem key={`${symbol}-${i}`} symbol={symbol} />
          ))}
        </div>
      </div>
    </div>
  );
}
