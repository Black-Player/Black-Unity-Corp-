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

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(DERIV_WS_URL);

    this.socket.onopen = () => {
      console.log('Connected to Deriv WebSocket');
      this.authorize();
    };

    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      this.handleMessage(data);
    };

    this.socket.onclose = () => {
      console.log('Deriv connection closed. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error('Deriv WebSocket Error:', error);
    };
  }

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
      // Unsubscribe from previous OHLC for this symbol if needed
      // Deriv handles this by replacing the subscription for the same symbol/granularity pair
      // but to be safe we just send the new one
      this.socket.send(JSON.stringify({ ohlc: symbol, subscribe: 1, granularity }));
    }
  }

  private handleMessage(data: any) {
    if (data.msg_type === 'authorize') {
      if (data.error) {
        console.error('Deriv Authorization Failed:', data.error.message);
        return;
      }
      console.log('Deriv Authorized Successfully');
      this.subscribeData();
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

  async getHistory(symbol: string, timeframe: string, count: number): Promise<DerivCandle[]> {
    const granularityMap: Record<string, number> = {
      'M1': 60,
      'M5': 300,
      'M15': 900,
      'H1': 3600,
      'H4': 14400,
      'D1': 86400
    };
    const granularity = granularityMap[timeframe] || 60;

    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error('Deriv WebSocket not connected'));
        return;
      }

      const requestId = Math.random().toString(36).substring(7);
      const handleHistory = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'candles' && data.req_id === requestId) {
          this.socket?.removeEventListener('message', handleHistory);
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            const candles = data.candles.map((c: any) => ({
              symbol,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
              time: c.epoch
            }));
            resolve(candles);
          }
        }
      };

      this.socket.addEventListener('message', handleHistory);
      this.socket.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count,
        end: 'latest',
        granularity,
        style: 'candles',
        req_id: requestId
      }));

      // Timeout after 10s
      setTimeout(() => {
        this.socket?.removeEventListener('message', handleHistory);
        reject(new Error('History request timed out'));
      }, 10000);
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
