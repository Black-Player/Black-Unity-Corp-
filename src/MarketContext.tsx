import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { derivService, DerivTick } from './services/derivService';
import { DERIV_SYMBOLS } from './constants';

interface MarketContextType {
  marketPrices: Record<string, DerivTick>;
  marketPricesRef: React.MutableRefObject<Record<string, DerivTick>>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);
const MarketRefContext = createContext<React.MutableRefObject<Record<string, DerivTick>> | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketPrices, setMarketPrices] = useState<Record<string, DerivTick>>({});
  const pendingUpdates = useRef<Record<string, DerivTick>>({});
  const lastUpdateTime = useRef<number>(0);
  const latestPrices = useRef<Record<string, DerivTick>>({});

  useEffect(() => {
    const symbols = DERIV_SYMBOLS.map(s => s.symbol);
    
    const unsubscribe = derivService.subscribeToTicks(symbols, (tick) => {
      pendingUpdates.current[tick.symbol] = tick;
      latestPrices.current[tick.symbol] = tick;
      
      const now = Date.now();
      // Throttle updates to 500ms to improve performance
      if (now - lastUpdateTime.current > 500) {
        setMarketPrices(prev => ({
          ...prev,
          ...pendingUpdates.current
        }));
        pendingUpdates.current = {};
        lastUpdateTime.current = now;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <MarketRefContext.Provider value={latestPrices}>
      <MarketContext.Provider value={{ marketPrices, marketPricesRef: latestPrices }}>
        {children}
      </MarketContext.Provider>
    </MarketRefContext.Provider>
  );
}

export function useMarketRef() {
  const context = useContext(MarketRefContext);
  if (context === undefined) {
    throw new Error('useMarketRef must be used within a MarketProvider');
  }
  return context;
}

export function useMarketContext() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarketContext must be used within a MarketProvider');
  }
  return context;
}
