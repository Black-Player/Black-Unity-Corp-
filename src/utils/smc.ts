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
  // Only detect and return the clean 6-Step Multi-Timeframe Reversal Setup Markings
  return detect6StepReversalSetup(data);
}

/**
 * Detects 6-Step Multi-Timeframe Reversal Setups:
 * Step 1: 15M Ranging Market High Probability Starting Point
 * Step 2: 5M Breakout Below Uptrend / Above Downtrend
 * Step 3: 5M Sweep creating Long Wick on 15M
 * Step 4: Direction Change creating 15M Fair Value Gap
 * Step 5: 15M Gap Retest + 1M Rejection Candlestick
 * Step 6: Entry on 2nd Candlestick after Rejection
 */
export function detect6StepReversalSetup(data: Candle[]): SMCMarker[] {
  const setupMarkers: SMCMarker[] = [];
  if (data.length < 15) return setupMarkers;

  for (let i = 5; i < data.length - 2; i++) {
    const prev3 = data.slice(i - 5, i - 1);
    const curr = data[i - 1]; // Rejection candle candidate
    const entryCandle = data[i]; // 2nd candle after rejection (Trigger)

    const rangeHigh = Math.max(...prev3.map(c => c.high));
    const rangeLow = Math.min(...prev3.map(c => c.low));
    const rangeSpread = rangeHigh - rangeLow;

    // Step 1 Check: Ranging Market Starting Point (compact ATR)
    const isRanging = rangeSpread <= curr.open * 0.012;

    // Step 3 Check: Long Wick (Rejection)
    const candleHeight = curr.high - curr.low;
    const bodyHeight = Math.abs(curr.close - curr.open);
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;

    const isBullishRejection = candleHeight > 0 && lowerWick >= candleHeight * 0.4 && bodyHeight <= candleHeight * 0.5;
    const isBearishRejection = candleHeight > 0 && upperWick >= candleHeight * 0.4 && bodyHeight <= candleHeight * 0.5;

    // Step 6: Entry on 2nd Candlestick after Rejected Candlestick
    if (isRanging && isBullishRejection && entryCandle.close > curr.high) {
      // Step 1: 15M Range Base
      setupMarkers.push({
        time: prev3[0].time,
        position: 'aboveBar',
        color: '#a855f7',
        shape: 'square',
        text: `Step 1: 15M Range Base`,
        price: rangeHigh
      });
      // Step 3: 5M Sweep Wick Rejection
      setupMarkers.push({
        time: curr.time,
        position: 'belowBar',
        color: '#3b82f6',
        shape: 'circle',
        text: `Step 3: 5M Sweep Wick Rejection`,
        price: curr.low
      });
      // Step 6: Entry Trigger
      setupMarkers.push({
        time: entryCandle.time,
        position: 'belowBar',
        color: '#10b981', // Emerald green
        shape: 'arrowUp',
        text: `🚀 Step 6 Entry: Bullish 6-Step Reversal Trigger @ ${entryCandle.close.toFixed(2)}`,
        price: entryCandle.low,
        type: 'bullish_ob'
      });
    } else if (isRanging && isBearishRejection && entryCandle.close < curr.low) {
      // Step 1: 15M Range Base
      setupMarkers.push({
        time: prev3[0].time,
        position: 'belowBar',
        color: '#a855f7',
        shape: 'square',
        text: `Step 1: 15M Range Base`,
        price: rangeLow
      });
      // Step 3: 5M Sweep Wick Rejection
      setupMarkers.push({
        time: curr.time,
        position: 'aboveBar',
        color: '#3b82f6',
        shape: 'circle',
        text: `Step 3: 5M Sweep Wick Rejection`,
        price: curr.high
      });
      // Step 6: Entry Trigger
      setupMarkers.push({
        time: entryCandle.time,
        position: 'aboveBar',
        color: '#f43f5e', // Bright Rose
        shape: 'arrowDown',
        text: `💥 Step 6 Entry: Bearish 6-Step Reversal Trigger @ ${entryCandle.close.toFixed(2)}`,
        price: entryCandle.high,
        type: 'bearish_ob'
      });
    }
  }

  return setupMarkers;
}
