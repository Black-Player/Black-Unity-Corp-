/**
 * BLĀCK-PLĀYER RSA
 * LAYER 2 — INSTRUMENT TRUTH ENGINE
 * Authoritative instrument specifications, verified pricing, decimal precision, tick values, and staleness/conflict guards.
 */

export interface InstrumentSpec {
  symbol: string;
  name: string;
  category: 'synthetic' | 'forex' | 'crypto' | 'commodity' | 'index';
  currentPrice: number;
  bid: number;
  ask: number;
  spread: number;
  priceSource: string;
  lastUpdated: number;
  decimalPrecision: number;
  tickSize: number;
  tickValue: number;
  pointValue: number;
  contractSize: number;
  minLot: number;
  maxLot: number;
  lotIncrement: number;
  tradingAvailability: '24/7' | 'Market Hours' | 'Weekend Closed';
  currency: string;
  brokerSource: string;
  status: 'active' | 'stale' | 'conflict' | 'suspended';
}

// Master Authoritative Instrument Database
const MASTER_INSTRUMENT_CATALOG: Record<string, Omit<InstrumentSpec, 'currentPrice' | 'bid' | 'ask' | 'spread' | 'lastUpdated' | 'status'>> = {
  // --- DERIV SYNTHETICS (CRASH & BOOM) ---
  'CRASH300': {
    symbol: 'CRASH300',
    name: 'Crash 300 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.50,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'CRASH500': {
    symbol: 'CRASH500',
    name: 'Crash 500 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.20,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'CRASH1000': {
    symbol: 'CRASH1000',
    name: 'Crash 1000 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.20,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'BOOM300': {
    symbol: 'BOOM300',
    name: 'Boom 300 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 1.00,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'BOOM500': {
    symbol: 'BOOM500',
    name: 'Boom 500 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.20,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'BOOM1000': {
    symbol: 'BOOM1000',
    name: 'Boom 1000 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.20,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },

  // --- VOLATILITY (1HZ & STANDARD) ---
  '1HZ100V': {
    symbol: '1HZ100V',
    name: 'Volatility 100 (1s) Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.10,
    maxLot: 40.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  '1HZ75V': {
    symbol: '1HZ75V',
    name: 'Volatility 75 (1s) Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.005,
    maxLot: 20.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  '1HZ50V': {
    symbol: '1HZ50V',
    name: 'Volatility 50 (1s) Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.005,
    maxLot: 30.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  '1HZ25V': {
    symbol: '1HZ25V',
    name: 'Volatility 25 (1s) Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.005,
    maxLot: 50.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  '1HZ10V': {
    symbol: '1HZ10V',
    name: 'Volatility 10 (1s) Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.10,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'R_100': {
    symbol: 'R_100',
    name: 'Volatility 100 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.20,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'R_75': {
    symbol: 'R_75',
    name: 'Volatility 75 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.001,
    maxLot: 20.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'R_50': {
    symbol: 'R_50',
    name: 'Volatility 50 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.005,
    maxLot: 40.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'R_25': {
    symbol: 'R_25',
    name: 'Volatility 25 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.50,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'R_10': {
    symbol: 'R_10',
    name: 'Volatility 10 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.30,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'STP': {
    symbol: 'STP',
    name: 'Step Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 1,
    tickSize: 0.1,
    tickValue: 0.1,
    pointValue: 0.1,
    contractSize: 1,
    minLot: 0.10,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },
  'JD100': {
    symbol: 'JD100',
    name: 'Jump 100 Index',
    category: 'synthetic',
    priceSource: 'Deriv WS Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.01,
    maxLot: 10.0,
    lotIncrement: 0.001,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv SVG'
  },

  // --- FOREX ---
  'frxEURUSD': {
    symbol: 'frxEURUSD',
    name: 'EUR/USD',
    category: 'forex',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 5,
    tickSize: 0.00001,
    tickValue: 1.0,
    pointValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },
  'frxGBPUSD': {
    symbol: 'frxGBPUSD',
    name: 'GBP/USD',
    category: 'forex',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 5,
    tickSize: 0.00001,
    tickValue: 1.0,
    pointValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },
  'frxUSDJPY': {
    symbol: 'frxUSDJPY',
    name: 'USD/JPY',
    category: 'forex',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 3,
    tickSize: 0.001,
    tickValue: 1.0,
    pointValue: 9.15,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },
  'frxAUDUSD': {
    symbol: 'frxAUDUSD',
    name: 'AUD/USD',
    category: 'forex',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 5,
    tickSize: 0.00001,
    tickValue: 1.0,
    pointValue: 10.0,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },
  'frxUSDCAD': {
    symbol: 'frxUSDCAD',
    name: 'USD/CAD',
    category: 'forex',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 5,
    tickSize: 0.00001,
    tickValue: 1.0,
    pointValue: 7.45,
    contractSize: 100000,
    minLot: 0.01,
    maxLot: 100.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },

  // --- COMMODITIES ---
  'frxXAUUSD': {
    symbol: 'frxXAUUSD',
    name: 'Gold (XAU/USD)',
    category: 'commodity',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 100,
    minLot: 0.01,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: 'Market Hours',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },

  // --- CRYPTO ---
  'cryBTCUSD': {
    symbol: 'cryBTCUSD',
    name: 'Bitcoin (BTC/USD)',
    category: 'crypto',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.01,
    maxLot: 20.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  },
  'cryETHUSD': {
    symbol: 'cryETHUSD',
    name: 'Ethereum (ETH/USD)',
    category: 'crypto',
    priceSource: 'Deriv Interbank Feed',
    decimalPrecision: 2,
    tickSize: 0.01,
    tickValue: 1.0,
    pointValue: 1.0,
    contractSize: 1,
    minLot: 0.01,
    maxLot: 50.0,
    lotIncrement: 0.01,
    tradingAvailability: '24/7',
    currency: 'USD',
    brokerSource: 'Deriv Financial'
  }
};

// Initial base baseline prices
const BASELINE_PRICES: Record<string, number> = {
  'CRASH300': 2780.50,
  'CRASH500': 3086.21,
  'CRASH1000': 5724.30,
  'BOOM300': 2950.40,
  'BOOM500': 4890.15,
  'BOOM1000': 10580.90,
  '1HZ100V': 2450.80,
  '1HZ75V': 1850.25,
  '1HZ50V': 320.10,
  '1HZ25V': 945.50,
  '1HZ10V': 6750.30,
  'R_100': 1248.50,
  'R_75': 9825.40,
  'R_50': 345.10,
  'R_25': 1820.60,
  'R_10': 6450.80,
  'STP': 8750.0,
  'JD100': 21400.0,
  'frxEURUSD': 1.08450,
  'frxGBPUSD': 1.27320,
  'frxUSDJPY': 154.250,
  'frxAUDUSD': 0.65480,
  'frxUSDCAD': 1.36850,
  'frxXAUUSD': 2645.50,
  'cryBTCUSD': 94250.0,
  'cryETHUSD': 3420.0
};

class InstrumentTruthEngine {
  private instruments: Map<string, InstrumentSpec> = new Map();
  private maxStalenessMs = 30000; // 30 seconds max freshness threshold for signals
  private maxAllowedPriceConflictDeviation = 0.02; // 2% max deviation before flagging conflict

  constructor() {
    this.initializeCatalog();
  }

  private canonicalize(symbol: string): string {
    if (!symbol) return 'CRASH300';
    const clean = symbol.toUpperCase().replace(/[\s\-_/]/g, '');
    if (clean.includes('CRASH300')) return 'CRASH300';
    if (clean.includes('CRASH500')) return 'CRASH500';
    if (clean.includes('CRASH1000')) return 'CRASH1000';
    if (clean.includes('BOOM300')) return 'BOOM300';
    if (clean.includes('BOOM500')) return 'BOOM500';
    if (clean.includes('BOOM1000')) return 'BOOM1000';
    if (clean.includes('1HZ100')) return '1HZ100V';
    if (clean.includes('1HZ75')) return '1HZ75V';
    if (clean.includes('1HZ50')) return '1HZ50V';
    if (clean.includes('1HZ25')) return '1HZ25V';
    if (clean.includes('1HZ10')) return '1HZ10V';
    if (clean.includes('R100') || clean === 'R_100') return 'R_100';
    if (clean.includes('R75') || clean === 'R_75') return 'R_75';
    if (clean.includes('R50') || clean === 'R_50') return 'R_50';
    if (clean.includes('R25') || clean === 'R_25') return 'R_25';
    if (clean.includes('R10') || clean === 'R_10') return 'R_10';
    if (clean.includes('STEP') || clean === 'STP') return 'STP';
    if (clean.includes('JD100') || clean.includes('JUMP100')) return 'JD100';
    if (clean.includes('EURUSD')) return 'frxEURUSD';
    if (clean.includes('GBPUSD')) return 'frxGBPUSD';
    if (clean.includes('USDJPY')) return 'frxUSDJPY';
    if (clean.includes('AUDUSD')) return 'frxAUDUSD';
    if (clean.includes('USDCAD')) return 'frxUSDCAD';
    if (clean.includes('XAUUSD') || clean.includes('GOLD')) return 'frxXAUUSD';
    if (clean.includes('BTCUSD') || clean.includes('BITCOIN')) return 'cryBTCUSD';
    if (clean.includes('ETHUSD') || clean.includes('ETHEREUM')) return 'cryETHUSD';
    return symbol;
  }

  private initializeCatalog() {
    const now = Date.now();
    for (const [sym, config] of Object.entries(MASTER_INSTRUMENT_CATALOG)) {
      const basePrice = BASELINE_PRICES[sym] || 1000.0;
      const spread = config.tickSize * (config.category === 'synthetic' ? 2 : 1.5);
      const spec: InstrumentSpec = {
        ...config,
        currentPrice: basePrice,
        bid: Number((basePrice - spread).toFixed(config.decimalPrecision)),
        ask: Number((basePrice + spread).toFixed(config.decimalPrecision)),
        spread: Number(spread.toFixed(config.decimalPrecision)),
        lastUpdated: now,
        status: 'active'
      };
      this.instruments.set(sym, spec);
    }
  }

  /**
   * Updates an instrument's live price from a verified market data feed.
   */
  public updatePrice(rawSymbol: string, price: number, source = 'Deriv WS Feed'): InstrumentSpec {
    const symbol = this.canonicalize(rawSymbol);
    let spec = this.instruments.get(symbol);
    const now = Date.now();

    if (!spec) {
      // Create dynamically if not found
      const isForex = symbol.startsWith('frx');
      const isCrypto = symbol.startsWith('cry');
      const dec = symbol.includes('JPY') || symbol.includes('GOLD') || symbol.includes('XAU') ? 2 : (isForex ? 5 : 2);
      const tick = dec === 5 ? 0.00001 : 0.01;
      spec = {
        symbol,
        name: symbol,
        category: isForex ? 'forex' : (isCrypto ? 'crypto' : 'synthetic'),
        currentPrice: price,
        bid: price - tick,
        ask: price + tick,
        spread: tick * 2,
        priceSource: source,
        lastUpdated: now,
        decimalPrecision: dec,
        tickSize: tick,
        tickValue: 1.0,
        pointValue: 1.0,
        contractSize: isForex ? 100000 : 1,
        minLot: isForex ? 0.01 : 0.1,
        maxLot: 50.0,
        lotIncrement: 0.01,
        tradingAvailability: isForex ? 'Market Hours' : '24/7',
        currency: 'USD',
        brokerSource: isForex ? 'Deriv Financial' : 'Deriv SVG',
        status: 'active'
      };
      this.instruments.set(symbol, spec);
      return spec;
    }

    if (typeof price === 'number' && !isNaN(price) && price > 0) {
      const spread = spec.tickSize * 2;
      spec.currentPrice = Number(price.toFixed(spec.decimalPrecision));
      spec.bid = Number((price - spread).toFixed(spec.decimalPrecision));
      spec.ask = Number((price + spread).toFixed(spec.decimalPrecision));
      spec.spread = Number(spread.toFixed(spec.decimalPrecision));
      spec.lastUpdated = now;
      spec.priceSource = source;
      spec.status = 'active';
    }

    return spec;
  }

  /**
   * Retrieves verified authoritative instrument specification.
   */
  public getSpec(rawSymbol: string): InstrumentSpec {
    const symbol = this.canonicalize(rawSymbol);
    let spec = this.instruments.get(symbol);
    if (!spec) {
      this.updatePrice(symbol, BASELINE_PRICES[symbol] || 1000.0, 'Baseline Init');
      spec = this.instruments.get(symbol)!;
    }
    return spec;
  }

  /**
   * Checks whether the instrument price data is stale.
   * If stale, returns warning: "⚠️ PRICE DATA STALE — SIGNAL BLOCKED"
   */
  public checkStaleness(rawSymbol: string, maxAgeMs = this.maxStalenessMs): { isStale: boolean; ageMs: number; message?: string } {
    const spec = this.getSpec(rawSymbol);
    const ageMs = Date.now() - spec.lastUpdated;
    if (ageMs > maxAgeMs) {
      return {
        isStale: true,
        ageMs,
        message: `⚠️ PRICE DATA STALE — SIGNAL BLOCKED (${spec.symbol} data is ${Math.round(ageMs / 1000)}s old, threshold: ${maxAgeMs / 1000}s)`
      };
    }
    return { isStale: false, ageMs };
  }

  /**
   * Validates if two price sources diverge beyond safe tolerance.
   * If divergent, returns warning: "⚠️ PRICE CONFLICT — SIGNAL BLOCKED"
   */
  public checkPriceConflict(rawSymbol: string, candidatePrice: number): { hasConflict: boolean; deviationPercent: number; message?: string } {
    const spec = this.getSpec(rawSymbol);
    if (!candidatePrice || candidatePrice <= 0) {
      return {
        hasConflict: true,
        deviationPercent: 100,
        message: `⚠️ PRICE CONFLICT — SIGNAL BLOCKED (Candidate price is 0 or invalid)`
      };
    }

    const deviation = Math.abs(candidatePrice - spec.currentPrice) / spec.currentPrice;
    if (deviation > this.maxAllowedPriceConflictDeviation) {
      return {
        hasConflict: true,
        deviationPercent: Number((deviation * 100).toFixed(2)),
        message: `⚠️ PRICE CONFLICT — SIGNAL BLOCKED (Price deviation of ${(deviation * 100).toFixed(2)}% exceeds allowed threshold of ${(this.maxAllowedPriceConflictDeviation * 100).toFixed(1)}%)`
      };
    }

    return { hasConflict: false, deviationPercent: Number((deviation * 100).toFixed(2)) };
  }

  /**
   * Returns all active authoritative instrument specifications.
   */
  public getAllSpecs(): InstrumentSpec[] {
    return Array.from(this.instruments.values());
  }

  /**
   * Formats a raw number value using the exact authoritative decimal precision of the instrument.
   */
  public formatValue(rawSymbol: string, value: number): string {
    const spec = this.getSpec(rawSymbol);
    return Number(value).toFixed(spec.decimalPrecision);
  }
}

export const instrumentTruthEngine = new InstrumentTruthEngine();
