import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

export default function TickerTape() {
  const symbols = Object.values(DERIV_SYMBOLS).slice(0, 10).map(s => s.symbol);

  return (
    <div className="w-full bg-black border-b border-white/5 overflow-hidden py-1.5 relative top-0 z-50 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10" />
      
      <div className="flex animate-marquee whitespace-nowrap min-w-max">
        {[...symbols, ...symbols].map((symbol, i) => (
          <TickerTapeItem key={`${symbol}-${i}`} symbol={symbol} />
        ))}
      </div>
    </div>
  );
}
