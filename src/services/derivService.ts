import { Signal } from '../types';
import { DERIV_SYMBOLS } from '../constants';

const APP_ID = 1089;
const DERIV_WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

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

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private pendingRequests: Map<string, { resolve: (data: any) => void, reject: (error: Error) => void, timeout: NodeJS.Timeout }> = new Map();

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(DERIV_WS_URL);

    this.socket.onopen = () => {
      console.log('Connected to Deriv WebSocket');
      this.authorize();
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
          
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            resolve(data);
          }
          return;
        }

        this.handleMessage(data);
      } catch (e) {
        console.error('Error parsing Deriv message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('Deriv connection closed. Reconnecting in 5s...');
      this.isAuthorized = false;
      this.stopPing();
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error('Deriv WebSocket Error:', error);
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
    if (data.msg_type === 'authorize') {
      if (data.error) {
        console.warn('Deriv Authorization Optional: Limited feature set (public market data only active).', data.error.message);
        this.isAuthorized = false;
        return;
      }
      console.log('Deriv Authorized Successfully');
      this.isAuthorized = true;
    }

    if (data.msg_type === 'tick' && data.tick) {
      const tick = data.tick;
      const symbol = tick.symbol;
      const price = tick.quote;
      const lastPrice = this.lastPrices[symbol] || price;
      const change = ((price - lastPrice) / lastPrice) * 100;
      
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
            // Handle specific "invalid symbol" error
            if (data.error.code === 'InvalidSymbol' || data.error.message?.includes('invalid')) {
              console.warn(`Symbol ${symbol} is not available on this Deriv account.`);
              resolve([]); // Resolve with empty history instead of crashing
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
}

export const derivService = new DerivService('eGYgMolJfh9pBQ4');
