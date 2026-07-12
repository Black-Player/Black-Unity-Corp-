import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { derivService, DerivTick } from './services/derivService';
import { DERIV_SYMBOLS } from './constants';

interface MarketContextType {
  marketPrices: Record<string, DerivTick>;
  marketPricesRef: React.MutableRefObject<Record<string, DerivTick>>;
  connectionStatus: 'Live' | 'Syncing' | 'Delayed';
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);
const MarketRefContext = createContext<React.MutableRefObject<Record<string, DerivTick>> | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [marketPrices, setMarketPrices] = useState<Record<string, DerivTick>>({});
  const [connectionStatus, setConnectionStatus] = useState<'Live' | 'Syncing' | 'Delayed'>('Syncing');
  const pendingUpdates = useRef<Record<string, DerivTick>>({});
  const lastUpdateTime = useRef<number>(0);
  const latestPrices = useRef<Record<string, DerivTick>>({});

  useEffect(() => {
    // Poll connection status every second
    const statusInterval = setInterval(() => {
      setConnectionStatus(derivService.getConnectionStatus());
    }, 1000);

    // Regularly flush pending ticks to state every 500ms
    const flushInterval = setInterval(() => {
      if (Object.keys(pendingUpdates.current).length > 0) {
        setMarketPrices(prev => ({
          ...prev,
          ...pendingUpdates.current
        }));
        pendingUpdates.current = {};
      }
    }, 500);

    const symbols = DERIV_SYMBOLS.map(s => s.symbol);
    
    const unsubscribe = derivService.subscribeToTicks(symbols, (tick) => {
      pendingUpdates.current[tick.symbol] = tick;
      latestPrices.current[tick.symbol] = tick;
    });

    return () => {
      clearInterval(statusInterval);
      clearInterval(flushInterval);
      unsubscribe();
    };
  }, []);

  return (
    <MarketRefContext.Provider value={latestPrices}>
      <MarketContext.Provider value={{ marketPrices, marketPricesRef: latestPrices, connectionStatus }}>
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
