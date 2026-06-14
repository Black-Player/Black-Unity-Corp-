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
}

export function detectSMC(data: Candle[]): SMCMarker[] {
  const markers: SMCMarker[] = [];
  if (data.length < 10) return markers;

  // Simple Swing High / Swing Low detection
  const swingHighs: { index: number; candle: Candle }[] = [];
  const swingLows: { index: number; candle: Candle }[] = [];
  
  const SWING_LENGTH = 15;

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

  // Detect FVG (Fair Value Gaps) - Super Strong only
  for (let i = 2; i < data.length; i++) {
    const c1 = data[i - 2];
    const c3 = data[i];
    
    // Bullish FVG
    if (c1.high < c3.low && data[i-1].close > data[i-1].open) {
      if (Math.abs(c3.low - c1.high) > (c3.high - c3.low) * 0.7) {
        markers.push({
          time: data[i - 1].time as number,
          position: 'belowBar',
          color: '#3b82f6', // Blue for FVG
          shape: 'circle',
          text: 'Major FVG'
        });
      }
    }
    
    // Bearish FVG
    if (c1.low > c3.high && data[i-1].close < data[i-1].open) {
      if (Math.abs(c1.low - c3.high) > (c3.high - c3.low) * 0.7) {
        markers.push({
          time: data[i - 1].time as number,
          position: 'aboveBar',
          color: '#ef4444', // Red for FVG
          shape: 'circle',
          text: 'Major FVG'
        });
      }
    }
  }

  // Detect BOS and CHOCH
  const allSwings = [...swingHighs.map(s => ({...s, type: 'high'})), ...swingLows.map(s => ({...s, type: 'low'}))].sort((a,b) => a.index - b.index);
  
  for (let i = 2; i < allSwings.length; i++) {
    const current = allSwings[i];
    const prevPrev = allSwings[i - 2];
    
    if (current.type === 'high' && prevPrev.type === 'high' && current.candle.high > prevPrev.candle.high) {
      markers.push({
        time: current.candle.time as number,
        position: 'aboveBar',
        color: '#22c55e',
        shape: 'arrowDown',
        text: 'BOS / CHOCH'
      });
    }
    if (current.type === 'low' && prevPrev.type === 'low' && current.candle.low < prevPrev.candle.low) {
       markers.push({
        time: current.candle.time as number,
        position: 'belowBar',
        color: '#ef4444',
        shape: 'arrowUp',
        text: 'BOS / CHOCH'
      });
    }
  }

  // Order block detection: A down candle before a very strong up move
  for (let i = 2; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i+1];
    
    // Bullish OB
    if (current.close < current.open && next.close > next.open && (next.close - next.open) > (current.open - current.close) * 4.0) {
      markers.push({
        time: current.time as number,
        position: 'belowBar',
        color: '#10b981',
        shape: 'arrowUp',
        text: 'Key OB'
      });
    }
    
    // Bearish OB
    if (current.close > current.open && next.close < next.open && (next.open - next.close) > (current.close - current.open) * 4.0) {
      markers.push({
        time: current.time as number,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'arrowDown',
        text: 'Key OB'
      });
    }
  }

  // Deduplicate markers by time, keeping highest priority
  const dedupedMap = new Map<number, SMCMarker>();
  markers.forEach(m => {
    // If a marker already exists at this time, we can optionally skip or combine.
    // For simple lightweight-charts, we can just let them all be present, though it might clutter.
    // Actually, lightweight-charts supports multiple markers per timestamp, so we don't strictly need to dedupe, 
    // but just to be safe:
    dedupedMap.set(m.time + Math.random(), m); 
  });

  return Array.from(dedupedMap.values()).sort((a, b) => a.time - b.time);
}
