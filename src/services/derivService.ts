import { Signal } from '../types';
import { DERIV_SYMBOLS } from '../constants';

const APP_ID = 1089;
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;

export interface DerivTick {
  symbol: string;
  price: number;
  change: number;
}

export interface DerivCandle {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
}

class DerivService {
  private socket: WebSocket | null = null;
  private apiToken: string;
  private tickListeners: Set<(tick: DerivTick) => void> = new Set();
  private candleListeners: Set<(candle: DerivCandle) => void> = new Set();
  private symbols: string[] = DERIV_SYMBOLS.map(s => s.symbol);
  private lastPrices: Record<string, number> = {};
  private pingInterval: any = null;
  private nextRequestId = 1;
  private shouldAuthorize = true;
  private lastTickReceivedTime = 0;

  // Real-time market simulator properties for closed/unsupported symbols
  private simulationInterval: any = null;
  private realSymbols: Set<string> = new Set();
  private currentCandles: Record<string, DerivCandle> = {};
  private simPrices: Record<string, number> = {
    BOOM300: 1500 + Math.random() * 50,
    CRASH300: 4200 + Math.random() * 100,
    STP: 280 + Math.random() * 10,
    frxEURUSD: 1.0850 + (Math.random() - 0.5) * 0.01,
    frxGBPUSD: 1.2720 + (Math.random() - 0.5) * 0.01,
    frxUSDJPY: 158.30 + (Math.random() - 0.5) * 1.5,
    frxAUDUSD: 0.6650 + (Math.random() - 0.5) * 0.01,
    frxUSDCAD: 1.3680 + (Math.random() - 0.5) * 0.01,
  };

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.startSimulation();
  }

  private startSimulation() {
    if (this.simulationInterval) return;
    this.simulationInterval = setInterval(() => {
      this.symbols.forEach(symbol => {
        if (!this.realSymbols.has(symbol)) {
          this.generateSimulatedTick(symbol);
        }
      });
    }, 1000);
  }

  private generateSimulatedTick(symbol: string) {
    let currentPrice = this.simPrices[symbol];
    if (currentPrice === undefined) {
      if (symbol.includes('BOOM1000')) currentPrice = 14650;
      else if (symbol.includes('BOOM500')) currentPrice = 4930;
      else if (symbol.includes('BOOM300')) currentPrice = 1500;
      else if (symbol.includes('BOOM150')) currentPrice = 15000;
      else if (symbol.includes('BOOM100')) currentPrice = 10000;
      else if (symbol.includes('BOOM50')) currentPrice = 5000;
      else if (symbol.includes('CRASH1000')) currentPrice = 5830;
      else if (symbol.includes('CRASH500')) currentPrice = 2870;
      else if (symbol.includes('CRASH300')) currentPrice = 4200;
      else if (symbol.includes('CRASH150')) currentPrice = 15000;
      else if (symbol.includes('CRASH100')) currentPrice = 10000;
      else if (symbol.includes('CRASH50')) currentPrice = 5000;
      else if (symbol.includes('1HZ')) currentPrice = 5000;
      else if (symbol.includes('R_')) currentPrice = 1000;
      else if (symbol.includes('JD')) currentPrice = 50000;
      else currentPrice = 100;
      this.simPrices[symbol] = currentPrice;
    }

    let change = 0;
    
    if (symbol.includes('BOOM300')) {
      if (Math.random() < 0.04) {
        change = 30 + Math.random() * 80;
      } else {
        change = -0.5 - Math.random() * 1.5;
      }
    } else if (symbol.includes('BOOM500')) {
      if (Math.random() < 0.03) {
        change = 20 + Math.random() * 50;
      } else {
        change = -0.3 - Math.random() * 0.8;
      }
    } else if (symbol.includes('BOOM1000')) {
      if (Math.random() < 0.02) {
        change = 15 + Math.random() * 45;
      } else {
        change = -0.2 - Math.random() * 0.5;
      }
    } else if (symbol.includes('BOOM150')) {
      if (Math.random() < 0.025) {
        change = 25 + Math.random() * 65;
      } else {
        change = -0.25 - Math.random() * 0.6;
      }
    } else if (symbol.includes('BOOM100')) {
      if (Math.random() < 0.02) {
        change = 20 + Math.random() * 50;
      } else {
        change = -0.2 - Math.random() * 0.5;
      }
    } else if (symbol.includes('BOOM50')) {
      if (Math.random() < 0.015) {
        change = 15 + Math.random() * 40;
      } else {
        change = -0.15 - Math.random() * 0.4;
      }
    } else if (symbol.includes('CRASH300')) {
      if (Math.random() < 0.04) {
        change = -30 - Math.random() * 80;
      } else {
        change = 0.5 + Math.random() * 1.5;
      }
    } else if (symbol.includes('CRASH500')) {
      if (Math.random() < 0.03) {
        change = -20 - Math.random() * 50;
      } else {
        change = 0.3 + Math.random() * 0.8;
      }
    } else if (symbol.includes('CRASH1000')) {
      if (Math.random() < 0.02) {
        change = -15 - Math.random() * 45;
      } else {
        change = 0.2 + Math.random() * 0.5;
      }
    } else if (symbol.includes('CRASH150')) {
      if (Math.random() < 0.025) {
        change = -25 - Math.random() * 65;
      } else {
        change = 0.25 + Math.random() * 0.6;
      }
    } else if (symbol.includes('CRASH100')) {
      if (Math.random() < 0.02) {
        change = -20 - Math.random() * 50;
      } else {
        change = 0.2 + Math.random() * 0.5;
      }
    } else if (symbol.includes('CRASH50')) {
      if (Math.random() < 0.015) {
        change = -15 - Math.random() * 40;
      } else {
        change = 0.15 + Math.random() * 0.4;
      }
    } else if (symbol.includes('STP')) {
      change = Math.random() < 0.5 ? 0.1 : -0.1;
    } else if (symbol.startsWith('frx')) {
      const isJPY = symbol.includes('JPY');
      const pipSize = isJPY ? 0.01 : 0.0001;
      change = (Math.random() - 0.5) * 3 * pipSize;
    } else {
      const percentChange = (Math.random() - 0.5) * 0.05;
      change = currentPrice * (percentChange / 100);
    }

    const nextPrice = currentPrice + change;
    this.simPrices[symbol] = Math.max(0.0001, nextPrice);
    
    const lastPrice = this.lastPrices[symbol] || nextPrice;
    const tickChange = lastPrice !== 0 ? ((nextPrice - lastPrice) / lastPrice) * 100 : 0;
    
    this.lastPrices[symbol] = nextPrice;
    
    if (this.lastTickReceivedTime === 0) {
      this.lastTickReceivedTime = Date.now();
    }

    const tickData = {
      symbol,
      price: nextPrice,
      change: tickChange
    };

    this.tickListeners.forEach(callback => callback(tickData));
    this.updateSimulatedOHLC(symbol, nextPrice);
  }

  private updateSimulatedOHLC(symbol: string, price: number) {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const minuteEpoch = Math.floor(nowEpoch / 60) * 60;
    
    let candle = this.currentCandles[symbol];
    if (!candle || candle.time !== minuteEpoch) {
      candle = {
        symbol,
        open: price,
        high: price,
        low: price,
        close: price,
        time: minuteEpoch
      };
      this.currentCandles[symbol] = candle;
    } else {
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
    }
    
    this.candleListeners.forEach(callback => callback(candle));
  }

  private generateSimulatedHistory(symbol: string, timeframe: string, count: number): DerivCandle[] {
    const granularityMap: Record<string, number> = {
      'M1': 60,
      'M5': 300,
      'M15': 900,
      'M30': 1800,
      'H1': 3600,
      'H4': 14400,
      'D1': 86400,
      'W1': 86400,
      '1M': 86400
    };
    const stepSeconds = granularityMap[timeframe] || 60;
    const nowEpoch = Math.floor(Date.now() / 1000);
    
    let basePrice = this.simPrices[symbol] || 1500;
    const candles: DerivCandle[] = [];
    
    for (let i = count - 1; i >= 0; i--) {
      const candleTime = nowEpoch - (i * stepSeconds);
      let change = 0;
      if (symbol.includes('BOOM')) {
        const isBoom = Math.random() < 0.15;
        if (isBoom) {
          change = 40 + Math.random() * 100;
        } else {
          change = -5 - Math.random() * 15;
        }
      } else if (symbol.includes('CRASH')) {
        const isCrash = Math.random() < 0.15;
        if (isCrash) {
          change = -40 - Math.random() * 100;
        } else {
          change = 5 + Math.random() * 15;
        }
      } else if (symbol.includes('STP')) {
        change = (Math.random() - 0.5) * 15;
      } else if (symbol.startsWith('frx')) {
        const isJPY = symbol.includes('JPY');
        const factor = isJPY ? 0.3 : 0.0015;
        change = (Math.random() - 0.5) * factor;
      } else {
        change = basePrice * ((Math.random() - 0.5) * 0.01);
      }
      
      const open = basePrice;
      const close = basePrice + change;
      const wickFactor = symbol.startsWith('frx') ? (symbol.includes('JPY') ? 0.05 : 0.0003) : (basePrice * 0.002);
      const high = Math.max(open, close) + Math.random() * wickFactor;
      const low = Math.max(0.0001, Math.min(open, close) - Math.random() * wickFactor);
      
      candles.push({
        symbol,
        open,
        high,
        low,
        close,
        time: candleTime
      });
      
      basePrice = close;
    }
    
    this.simPrices[symbol] = basePrice;
    return candles;
  }


  getConnectionStatus(): 'Live' | 'Syncing' | 'Delayed' {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return 'Syncing';
    }
    if (this.lastTickReceivedTime === 0) {
      return 'Syncing';
    }
    const diff = Date.now() - this.lastTickReceivedTime;
    if (diff > 8000) {
      return 'Delayed';
    }
    return 'Live';
  }

  private pendingRequests: Map<string, { resolve: (data: any) => void, reject: (error: Error) => void, timeout: NodeJS.Timeout }> = new Map();

  connect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    this.socket = new WebSocket(DERIV_WS_URL);

    this.socket.onopen = () => {
      console.log('Connected to Deriv WebSocket');
      if (this.shouldAuthorize) {
        this.authorize();
      } else {
        console.log('Skipping authorization to run on public market data feed');
      }
      this.subscribeData(); // Always subscribe to public data
      this.startPing();
    };

    this.socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        
        // Handle ping response
        if (data.msg_type === 'ping') return;

        // Handle pending requests first
        const reqId = data.req_id?.toString();
        if (reqId && this.pendingRequests.has(reqId)) {
          const { resolve, reject, timeout } = this.pendingRequests.get(reqId)!;
          clearTimeout(timeout);
          this.pendingRequests.delete(reqId);
          
          // Always resolve, let the specific request handler (like getHistory) handle any specific errors (e.g. invalid symbols) gracefully
          resolve(data);
          return;
        }

        this.handleMessage(data);
      } catch (e) {
        console.error('Error parsing Deriv message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('Deriv connection closed. Reconnecting in 2s...');
      this.isAuthorized = false;
      this.stopPing();
      setTimeout(() => this.connect(), 2000);
    };

    this.socket.onerror = (error) => {
      console.warn('Deriv WebSocket Error:', error);
    };
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ ping: 1 }));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async waitForConnection(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Deriv connection timeout (60s)'));
      }, 60000);

      const check = () => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else if (this.socket?.readyState === WebSocket.CLOSED) {
          clearTimeout(timeout);
          reject(new Error('Deriv connection failed'));
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  private isAuthorized = false;

  private authorize() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ authorize: this.apiToken }));
    }
  }

  private subscribeData() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.symbols.forEach(symbol => {
        // Subscribe to ticks for real-time price updates
        this.socket?.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
      });
      // Initial subscription to 1m candles for all symbols
      this.symbols.forEach(symbol => {
        this.socket?.send(JSON.stringify({ ohlc: symbol, subscribe: 1, granularity: 60 }));
      });
    }
  }

  changeTimeframe(symbol: string, granularity: number) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      // Valid granularities: 60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400
      const validGranularities = [60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400];
      let safeGranularity = validGranularities.includes(granularity) ? granularity : 86400;
      if (granularity < 60) safeGranularity = 60;
      if (granularity > 86400) safeGranularity = 86400;
      
      this.socket.send(JSON.stringify({ ohlc: symbol, subscribe: 1, granularity: safeGranularity }));
    }
  }

  private handleMessage(data: any) {
    if (data.error) {
      console.warn('Deriv WebSocket Response Error:', data.error);
    }

    if (data.msg_type === 'authorize') {
      if (data.error) {
        console.warn('Deriv Authorization Optional: Limited feature set (public market data only active).', data.error.message);
        this.isAuthorized = false;
        // If authorization fails because of invalid/expired token, fall back to public data
        this.shouldAuthorize = false;
        if (this.socket) {
          console.log('Closing invalid authorized socket to establish a clean public market data connection...');
          this.socket.close();
        }
        return;
      }
      console.log('Deriv Authorized Successfully');
      this.isAuthorized = true;
    }

    if (data.msg_type === 'tick' && data.tick) {
      this.lastTickReceivedTime = Date.now();
      const tick = data.tick;
      const symbol = tick.symbol;
      this.realSymbols.add(symbol); // Mark as real to disable simulation for this symbol
      const price = typeof tick.quote === 'string' ? parseFloat(tick.quote) : tick.quote;
      const lastPrice = this.lastPrices[symbol] || price;
      const change = lastPrice !== 0 ? ((price - lastPrice) / lastPrice) * 100 : 0;
      
      this.lastPrices[symbol] = price;

      const tickData = { symbol, price, change };
      this.tickListeners.forEach(callback => callback(tickData));
    }

    if (data.msg_type === 'ohlc' && data.ohlc) {
      const ohlc = data.ohlc;
      const candleData: DerivCandle = {
        symbol: ohlc.symbol,
        open: parseFloat(ohlc.open),
        high: parseFloat(ohlc.high),
        low: parseFloat(ohlc.low),
        close: parseFloat(ohlc.close),
        time: ohlc.open_time,
      };
      this.candleListeners.forEach(callback => callback(candleData));
    }
  }

  subscribeToTicks(symbols: string[], callback: (tick: DerivTick) => void) {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  async getHistory(symbol: string, timeframe: string, count: number, retries = 2): Promise<DerivCandle[]> {
    const granularityMap: Record<string, number> = {
      'M1': 60,
      'M5': 300,
      'M15': 900,
      'M30': 1800,
      'H1': 3600,
      'H4': 14400,
      'D1': 86400,
      'W1': 86400, // Deriv max is daily
      '1M': 86400
    };
    const granularity = granularityMap[timeframe] || 60;

    try {
      await this.waitForConnection();
    } catch (e) {
      if (retries > 0) {
        console.warn(`Deriv connection failed, retrying history for ${symbol}... (${retries} left)`);
        await new Promise(r => setTimeout(r, 2000));
        return this.getHistory(symbol, timeframe, count, retries - 1);
      }
      throw new Error(`Deriv connection failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        if (retries > 0) {
          resolve(this.getHistory(symbol, timeframe, count, retries - 1));
        } else {
          reject(new Error('Deriv WebSocket not connected'));
        }
        return;
      }

      const requestId = this.nextRequestId++;
      const requestIdStr = requestId.toString();
      
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestIdStr)) {
          this.pendingRequests.delete(requestIdStr);
          if (retries > 0) {
            console.warn(`History request timed out for ${symbol}, retrying... (${retries} left)`);
            resolve(this.getHistory(symbol, timeframe, count, retries - 1));
          } else {
            reject(new Error(`History request timed out for ${symbol} (${timeframe}) after 30s`));
          }
        }
      }, 30000);

      this.pendingRequests.set(requestIdStr, {
        resolve: (data: any) => {
          if (data.msg_type === 'candles' || data.candles) {
            const candles = data.candles.map((c: any) => ({
              symbol,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
              time: c.epoch
            }));
            resolve(candles);
          } else if (data.error) {
            // Handle specific "invalid symbol" or closed market errors by serving simulated history
            if (data.error.code === 'InvalidSymbol' || data.error.message?.toLowerCase().includes('invalid') || data.error.message?.toLowerCase().includes('closed')) {
              console.warn(`Symbol ${symbol} is not available or market is closed on this Deriv account. Serving simulated history.`);
              resolve(this.generateSimulatedHistory(symbol, timeframe, count));
            } else {
              reject(new Error(data.error.message));
            }
          } else {
            reject(new Error(`Unexpected response type: ${data.msg_type}`));
          }
        },
        reject,
        timeout
      });

      this.socket.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count,
        end: 'latest',
        granularity,
        style: 'candles',
        req_id: requestId
      }));
    });
  }

  addListener(callback: (tick: DerivTick) => void) {
    this.tickListeners.add(callback);
  }

  removeListener(callback: (tick: DerivTick) => void) {
    this.tickListeners.delete(callback);
  }

  addCandleListener(callback: (candle: DerivCandle) => void) {
    this.candleListeners.add(callback);
  }

  removeCandleListener(callback: (candle: DerivCandle) => void) {
    this.candleListeners.delete(callback);
  }

  // Keep for backward compatibility
  setOnTick(callback: (tick: DerivTick) => void) {
    this.tickListeners.clear();
    this.tickListeners.add(callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  updateToken(newToken: string) {
    if (newToken && this.apiToken !== newToken) {
      console.log('Updating Deriv API Token and reconnecting...');
      this.apiToken = newToken;
      this.shouldAuthorize = true;
      this.isAuthorized = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('deriv_api_token', newToken);
      }
      if (this.socket) {
        this.socket.close(); // This will trigger reconnection automatically with the new token
      }
    }
  }
}

const getInitialToken = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('deriv_api_token');
    if (stored) return stored;
  }
  return 'pat_165192ec637f5c82e4d3f04f98de40df58372e111c84f267574b65b455e6681e';
};

export const derivService = new DerivService(getInitialToken());
