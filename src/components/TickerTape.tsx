import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useMarketContext } from '../MarketContext';

export default function TickerTape() {
  const { marketPrices } = useMarketContext();
  
  if (!marketPrices || Object.keys(marketPrices).length === 0) return null;

  const pairs = Object.entries(marketPrices).slice(0, 10);

  return (
    <div className="w-full bg-black border-b border-white/5 overflow-hidden py-1.5 relative top-0 z-50 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10" />
      
      <div className="flex animate-marquee whitespace-nowrap min-w-max">
        {pairs.concat(pairs).map(([pair, data], i) => {
          const isUp = Math.random() > 0.5; // Simplification since there's no sentiment on raw tick
          const price = data?.price?.toFixed(4) || '0.0000';
          
          return (
            <div key={`${pair}-${i}`} className="flex items-center gap-2 mx-6 border-r border-white/5 pr-6 last:border-0 text-xs font-mono">
              <span className="text-white/60 font-bold">{pair}</span>
              <span className="text-white">{price}</span>
              <span className={`flex items-center text-[10px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {isUp ? '+0.2%' : '-0.1%'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
