export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SMCMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
  id?: string;
  price?: number;
  type?: 'bullish_fvg' | 'bearish_fvg' | 'bullish_ob' | 'bearish_ob' | 'bos' | 'choch';
}

export function detectSMC(data: Candle[]): SMCMarker[] {
  const markers: SMCMarker[] = [];
  if (data.length < 10) return markers;

  // Simple Swing High / Swing Low detection
  const swingHighs: { index: number; candle: Candle }[] = [];
  const swingLows: { index: number; candle: Candle }[] = [];
  
  const SWING_LENGTH = 10;

  for (let i = SWING_LENGTH; i < data.length - SWING_LENGTH; i++) {
    const isSwingHigh = data.slice(i - SWING_LENGTH, i + SWING_LENGTH + 1).every((c, idx) => {
      return idx === SWING_LENGTH || c.high <= data[i].high;
    });
    
    if (isSwingHigh) swingHighs.push({ index: i, candle: data[i] });

    const isSwingLow = data.slice(i - SWING_LENGTH, i + SWING_LENGTH + 1).every((c, idx) => {
      return idx === SWING_LENGTH || c.low >= data[i].low;
    });

    if (isSwingLow) swingLows.push({ index: i, candle: data[i] });
  }

  // 1. Detect FVG (Fair Value Gaps) with elegant labels
  for (let i = 2; i < data.length; i++) {
    const c1 = data[i - 2];
    const c3 = data[i];
    
    // Bullish FVG
    if (c1.high < c3.low && data[i-1].close > data[i-1].open) {
      if (Math.abs(c3.low - c1.high) > (c3.high - c3.low) * 0.4) {
        markers.push({
          time: data[i - 1].time as number,
          position: 'belowBar',
          color: '#a855f7', // SMC Purple for Imbalance
          shape: 'square',
          text: `FVG Imbalance @ ${(c1.high).toFixed(2)} - ${(c3.low).toFixed(2)}`,
          price: (c1.high + c3.low) / 2,
          type: 'bullish_fvg'
        });
      }
    }
    
    // Bearish FVG
    if (c1.low > c3.high && data[i-1].close < data[i-1].open) {
      if (Math.abs(c1.low - c3.high) > (c3.high - c3.low) * 0.4) {
        markers.push({
          time: data[i - 1].time as number,
          position: 'aboveBar',
          color: '#ec4899', // Bright Magenta for Bearish Imbalance
          shape: 'square',
          text: `FVG Imbalance @ ${(c3.high).toFixed(2)} - ${(c1.low).toFixed(2)}`,
          price: (c1.low + c3.high) / 2,
          type: 'bearish_fvg'
        });
      }
    }
  }

  // 2. Detect BOS and CHOCH (High-confluence Continuation vs Trend Reversal Shifts)
  const allSwings = [
    ...swingHighs.map(s => ({...s, type: 'high' as const})), 
    ...swingLows.map(s => ({...s, type: 'low' as const}))
  ].sort((a, b) => a.index - b.index);
  
  let lastBreakDirection: 'up' | 'down' | null = null;

  for (let i = 2; i < allSwings.length; i++) {
    const current = allSwings[i];
    const prevPrev = allSwings[i - 2];
    
    if (current.type === 'high' && prevPrev.type === 'high' && current.candle.high > prevPrev.candle.high) {
      const isCHoCH = lastBreakDirection === 'down';
      lastBreakDirection = 'up';
      
      markers.push({
        time: current.candle.time as number,
        position: 'aboveBar',
        color: isCHoCH ? '#f59e0b' : '#10b981', // Orange for CHoCH, Green for BOS
        shape: 'arrowDown',
        text: isCHoCH ? `CHoCH (Change of Character) @ ${current.candle.high.toFixed(2)}` : `BOS (Break of Structure) @ ${current.candle.high.toFixed(2)}`,
        price: current.candle.high,
        type: isCHoCH ? 'choch' : 'bos'
      });
    }
    if (current.type === 'low' && prevPrev.type === 'low' && current.candle.low < prevPrev.candle.low) {
      const isCHoCH = lastBreakDirection === 'up';
      lastBreakDirection = 'down';

      markers.push({
        time: current.candle.time as number,
        position: 'belowBar',
        color: isCHoCH ? '#f59e0b' : '#ef4444', // Orange for CHoCH, Red for BOS
        shape: 'arrowUp',
        text: isCHoCH ? `CHoCH (Change of Character) @ ${current.candle.low.toFixed(2)}` : `BOS (Break of Structure) @ ${current.candle.low.toFixed(2)}`,
        price: current.candle.low,
        type: isCHoCH ? 'choch' : 'bos'
      });
    }
  }

  // 3. Order block detection: A down candle before a very strong up move
  for (let i = 2; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i+1];
    
    // Bullish OB
    if (current.close < current.open && next.close > next.open && (next.close - next.open) > (current.open - current.close) * 3.0) {
      markers.push({
        time: current.time as number,
        position: 'belowBar',
        color: '#10b981',
        shape: 'square',
        text: `Bullish Order Block (OB) @ ${current.low.toFixed(2)}`,
        price: current.low,
        type: 'bullish_ob'
      });
    }
    
    // Bearish OB
    if (current.close > current.open && next.close < next.open && (next.open - next.close) > (current.close - current.open) * 3.0) {
      markers.push({
        time: current.time as number,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'square',
        text: `Bearish Order Block (OB) @ ${current.high.toFixed(2)}`,
        price: current.high,
        type: 'bearish_ob'
      });
    }
  }

  // Deduplicate markers by time, keeping highest priority elements
  const dedupedMap = new Map<number, SMCMarker>();
  markers.forEach(m => {
    const existing = dedupedMap.get(m.time);
    if (!existing) {
      dedupedMap.set(m.time, m);
    } else {
      // Prioritize BOS/CHoCH, then OB, then FVG
      const priority = (type: string) => {
        if (type === 'bos' || type === 'choch') return 3;
        if (type === 'bullish_ob' || type === 'bearish_ob') return 2;
        return 1;
      };
      if (priority(m.type || '') > priority(existing.type || '')) {
        dedupedMap.set(m.time, m);
      }
    }
  });

  return Array.from(dedupedMap.values()).sort((a, b) => a.time - b.time);
}
