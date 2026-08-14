import { useState, useEffect } from 'react';
import { derivService, DerivTick } from '../services/derivService';
import { DERIV_SYMBOLS } from '../constants';
import { getFallbackPrice } from '../lib/instrumentPrices';
import { instrumentTruthEngine } from '../services/instrumentTruthEngine';
import { deterministicTradingEngine } from '../services/deterministicTradingEngine';

export interface NormalizedTick extends DerivTick {
  rawPrice: number;
  formattedPrice: string;
  ask: number;
  bid: number;
  decimals: number;
  pipSize: number;
  lastUpdated: number;
}

/**
 * Returns decimal precision, pip size, and spread for any instrument symbol (Synthetic Indices, Forex, Crypto, etc.).
 */
export function getSyntheticPrecision(symbol: string, currentPrice = 1.0): { decimals: number; pipSize: number; spread: number } {
  const p = (symbol || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');

  if (p.includes('JPY')) {
    return { decimals: 2, pipSize: 0.01, spread: 0.02 };
  }
  if (p.includes('XAU') || p.includes('GOLD')) {
    return { decimals: 2, pipSize: 0.1, spread: 0.25 };
  }
  if (p.includes('BTC') || p.includes('ETH')) {
    return { decimals: 2, pipSize: 1.0, spread: 2.0 };
  }

  // Synthetic Indices: Boom, Crash, Volatility, Step, Jump
  if (
    p.includes('BOOM') ||
    p.includes('CRASH') ||
    p.includes('1HZ') ||
    p.includes('R_') ||
    p.includes('JD') ||
    p.includes('STP') ||
    p.includes('STEP')
  ) {
    const pipSize = currentPrice > 0 ? Number((currentPrice * 0.0001).toFixed(6)) : 0.01;
    return {
      decimals: 2,
      pipSize,
      spread: pipSize * 1.5,
    };
  }

  // Standard Forex (EURUSD, GBPUSD, AUDUSD, USDCAD)
  return { decimals: 4, pipSize: 0.0001, spread: 0.0002 };
}

/**
 * Normalizes a symbol string to its canonical DERIV symbol name (e.g. 'CRASH 300' -> 'CRASH300').
 */
export function normalizeSymbolKey(symbol: string): string {
  if (!symbol) return 'CRASH300';
  const clean = symbol.toUpperCase().replace(/\s+/g, '');
  if (clean.includes('CRASH300')) return 'CRASH300';
  if (clean.includes('CRASH500')) return 'CRASH500';
  if (clean.includes('CRASH1000')) return 'CRASH1000';
  if (clean.includes('BOOM300')) return 'BOOM300';
  if (clean.includes('BOOM500')) return 'BOOM500';
  if (clean.includes('BOOM1000')) return 'BOOM1000';
  if (clean.includes('STEP')) return 'STPRNG';
  return clean;
}

/**
 * Normalizes tick object data with spread, precision, ask/bid prices, and formatted strings.
 */
export function normalizeTickData(rawTick: Partial<DerivTick> & { symbol: string; price?: number }): NormalizedTick {
  const symbolKey = normalizeSymbolKey(rawTick.symbol);
  const price = typeof rawTick.price === 'number' && !isNaN(rawTick.price) && rawTick.price > 0
    ? rawTick.price
    : getFallbackPrice(symbolKey);

  const precision = getSyntheticPrecision(symbolKey, price);
  const roundedPrice = Number(price.toFixed(precision.decimals));

  const ask = Number((roundedPrice + precision.spread).toFixed(precision.decimals));
  const bid = Number((roundedPrice - precision.spread).toFixed(precision.decimals));

  return {
    symbol: symbolKey,
    price: roundedPrice,
    rawPrice: price,
    change: typeof rawTick.change === 'number' ? Number(rawTick.change.toFixed(2)) : 0,
    ask,
    bid,
    formattedPrice: roundedPrice.toFixed(precision.decimals),
    decimals: precision.decimals,
    pipSize: precision.pipSize,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculates strict Stop Loss & Take Profit levels based on 1:3.5 Risk-to-Reward ratio.
 */
export function calculateSLTP(
  symbol: string,
  entryPrice: number,
  type: 'buy' | 'sell',
  riskRewardRatio = 3.5,
  customSLDistance?: number
) {
  const precision = getSyntheticPrecision(symbol, entryPrice);
  const isBuy = type.toLowerCase() === 'buy';

  // Default SL distance is 22 pips or provided custom distance
  const slDistance = customSLDistance && customSLDistance > 0
    ? customSLDistance
    : 22 * precision.pipSize;

  const entry = Number(entryPrice.toFixed(precision.decimals));
  const stop_loss = Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(precision.decimals));

  // 1:3.5 Risk-to-Reward for TP1, scaled for higher targets
  const tp1 = Number((isBuy ? entry + slDistance * riskRewardRatio : entry - slDistance * riskRewardRatio).toFixed(precision.decimals));
  const tp2 = Number((isBuy ? entry + slDistance * 5.0 : entry - slDistance * 5.0).toFixed(precision.decimals));
  const tp3 = Number((isBuy ? entry + slDistance * 7.5 : entry - slDistance * 7.5).toFixed(precision.decimals));
  const tp4 = Number((isBuy ? entry + slDistance * 10.0 : entry - slDistance * 10.0).toFixed(precision.decimals));

  return {
    symbol,
    entry,
    stop_loss,
    tp1,
    tp2,
    tp3,
    tp4,
    risk_reward: riskRewardRatio,
    pip_size: precision.pipSize,
    decimals: precision.decimals,
  };
}

export function useMarketPrices() {
  const [marketPrices, setMarketPrices] = useState<Record<string, NormalizedTick>>(() => {
    // Populate instant fallback state for all symbols on mount
    const initialMap: Record<string, NormalizedTick> = {};
    DERIV_SYMBOLS.forEach((s) => {
      const fallback = normalizeTickData({ symbol: s.symbol });
      initialMap[s.symbol] = fallback;
      initialMap[normalizeSymbolKey(s.symbol)] = fallback;
    });
    return initialMap;
  });

  useEffect(() => {
    const symbols = DERIV_SYMBOLS.map((s) => s.symbol);

    const unsubscribe = derivService.subscribeToTicks(symbols, (tick) => {
      const normalized = normalizeTickData(tick);
      instrumentTruthEngine.updatePrice(tick.symbol, tick.price, 'Deriv WS Live');
      setMarketPrices((prev) => ({
        ...prev,
        [tick.symbol]: normalized,
        [normalized.symbol]: normalized,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return marketPrices;
}
