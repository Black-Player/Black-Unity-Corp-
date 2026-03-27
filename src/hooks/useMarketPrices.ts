import { useState, useEffect } from 'react';
import { derivService } from '../services/derivService';
import { DERIV_SYMBOLS } from '../constants';

export function useMarketPrices() {
  const [marketPrices, setMarketPrices] = useState<Record<string, any>>({});

  useEffect(() => {
    const symbols = DERIV_SYMBOLS.map(s => s.symbol);
    
    const unsubscribe = derivService.subscribeToTicks(symbols, (tick) => {
      setMarketPrices(prev => ({
        ...prev,
        [tick.symbol]: tick
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return marketPrices;
}
