import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { derivService, DerivTick } from './services/derivService';
import { DERIV_SYMBOLS } from './constants';
import { normalizeTickData, normalizeSymbolKey, NormalizedTick } from './hooks/useMarketPrices';

interface MarketContextType {
  marketPrices: Record<string, NormalizedTick>;
  marketPricesRef: React.MutableRefObject<Record<string, NormalizedTick>>;
  connectionStatus: 'Live' | 'Syncing' | 'Delayed';
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);
const MarketRefContext = createContext<React.MutableRefObject<Record<string, NormalizedTick>> | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with default normalized prices for all symbols
  const [marketPrices, setMarketPrices] = useState<Record<string, NormalizedTick>>(() => {
    const initialMap: Record<string, NormalizedTick> = {};
    DERIV_SYMBOLS.forEach((s) => {
      const normalized = normalizeTickData({ symbol: s.symbol });
      initialMap[s.symbol] = normalized;
      initialMap[normalizeSymbolKey(s.symbol)] = normalized;
    });
    return initialMap;
  });

  const [connectionStatus, setConnectionStatus] = useState<'Live' | 'Syncing' | 'Delayed'>('Syncing');
  const pendingUpdates = useRef<Record<string, NormalizedTick>>({});
  const latestPrices = useRef<Record<string, NormalizedTick>>(marketPrices);

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
      const normalized = normalizeTickData(tick);
      const canonKey = normalizeSymbolKey(tick.symbol);
      
      pendingUpdates.current[tick.symbol] = normalized;
      pendingUpdates.current[canonKey] = normalized;

      latestPrices.current[tick.symbol] = normalized;
      latestPrices.current[canonKey] = normalized;
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
