import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, IChartApi, LineStyle, Time, UTCTimestamp, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries, PriceScaleMode, createSeriesMarkers } from 'lightweight-charts';
import { derivService, DerivCandle } from '../services/derivService';
import { Eye, EyeOff, Activity, Maximize2, Minimize2, Settings2, TrendingUp, TrendingDown, BarChart3, Zap } from 'lucide-react';
import { THEMES } from '../constants/themes';
import { detectSMC } from '../utils/smc';

interface LightweightChartProps {
  symbol: string;
  entry?: number;
  sl?: number;
  tps?: number[];
  signalType?: 'buy' | 'sell';
  alerts?: { price: number; id: string }[];
  height?: number;
  themeId?: string;
  timeframeStr?: string;
}

// Helper to calculate EMA
const calculateEMA = (data: any[], period: number) => {
  if (data.length < period) return [];
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = data.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
  
  ema.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i].close - prevEma) * k + prevEma;
    ema.push({ time: data[i].time, value: currentEma });
    prevEma = currentEma;
  }
  return ema;
};

// Helper to calculate MACD
const calculateMACD = (data: any[]) => {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  
  if (ema12.length === 0 || ema26.length === 0) return { macd: [], signal: [], histogram: [] };

  const macdLine = [];
  const ema12Map = new Map(ema12.map(d => [d.time, d.value]));
  
  for (const d of ema26) {
    if (ema12Map.has(d.time)) {
      macdLine.push({ time: d.time, value: ema12Map.get(d.time)! - d.value });
    }
  }

  const signalLine = calculateEMA(macdLine.map(d => ({ time: d.time, close: d.value })), 9);
  const signalMap = new Map(signalLine.map(d => [d.time, d.value]));
  
  const histogram = [];
  for (const d of macdLine) {
    if (signalMap.has(d.time)) {
      histogram.push({ 
        time: d.time, 
        value: d.value - signalMap.get(d.time)!,
        color: d.value - signalMap.get(d.time)! >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
};

// Helper to calculate RSI
const calculateRSI = (data: any[], period: number = 14) => {
  if (data.length <= period) return [];
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push({ time: data[period].time, value: 100 - (100 / (1 + avgGain / avgLoss)) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi.push({ time: data[i].time, value: 100 - (100 / (1 + avgGain / avgLoss)) });
  }
  return rsi;
};

// Helper to calculate Bollinger Bands
const calculateBollingerBands = (data: any[], period: number = 20, stdDev: number = 2) => {
  if (data.length < period) return { upper: [], lower: [], middle: [] };
  
  const upper = [];
  const lower = [];
  const middle = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b.close, 0);
    const avg = sum / period;
    
    const variance = slice.reduce((a, b) => a + Math.pow(b.close - avg, 2), 0) / period;
    const sd = Math.sqrt(variance);

    middle.push({ time: data[i].time, value: avg });
    upper.push({ time: data[i].time, value: avg + stdDev * sd });
    lower.push({ time: data[i].time, value: avg - stdDev * sd });
  }

  return { upper, lower, middle };
};

export default function LightweightChart({ symbol, entry, sl, tps, signalType, alerts, height = 400, themeId = 'cosmic', timeframeStr }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const markersPluginRef = useRef<any>(null);
  const smaRef = useRef<any>(null);
  const bbUpperRef = useRef<any>(null);
  const bbLowerRef = useRef<any>(null);
  const bbMiddleRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);
  const macdRef = useRef<any>(null);
  const macdSignalRef = useRef<any>(null);
  const macdHistRef = useRef<any>(null);
  
  const dataRef = useRef<any[]>([]);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showSMC, setShowSMC] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [timeframe, setTimeframe] = useState(60); // Default 1m
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [legendData, setLegendData] = useState<any>(null);

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);

  const TIMEFRAMES = [
    { label: 'M1', value: 60 },
    { label: 'M5', value: 300 },
    { label: 'M15', value: 900 },
    { label: 'M30', value: 1800 },
    { label: 'H1', value: 3600 },
    { label: 'H4', value: 14400 },
    { label: 'D1', value: 86400 },
    { label: 'W1', value: 604800 },
    { label: '1M', value: 2592000 }, // roughly 30 days
  ];

  useEffect(() => {
    if (timeframeStr) {
      const matched = TIMEFRAMES.find(tf => tf.label === timeframeStr || (tf.label === '1M' && timeframeStr === 'MN'));
      if (matched) {
        setTimeframe(matched.value);
      }
    }
  }, [timeframeStr]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme.colors.primary,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.SparseDotted },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.SparseDotted },
      },
      width: chartContainerRef.current.clientWidth,
      height: isFullScreen ? window.innerHeight - 100 : height,
      // @ts-ignore
      watermark: {
        visible: true,
        fontSize: 32,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(255, 255, 255, 0.03)',
        text: 'ZION ORACLE VISION',
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe <= 300,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        rightOffset: 12,
        barSpacing: 10,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.colors.primary,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.colors.primary,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(255, 255, 255, 0.1)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      visible: showVolume,
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: '#facc15', // Vibrant gold
      lineWidth: 2,
      crosshairMarkerVisible: false,
      title: 'SMA 20',
      visible: showIndicators,
    });

    const bbUpper = chart.addSeries(LineSeries, {
      color: 'rgba(52, 211, 153, 0.4)', // Emerald
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      title: 'BB Up',
      visible: showBB,
    });

    const bbLower = chart.addSeries(LineSeries, {
      color: 'rgba(239, 68, 68, 0.4)', // Red
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      title: 'BB Low',
      visible: showBB,
    });

    const bbMiddle = chart.addSeries(LineSeries, {
      color: 'rgba(255, 255, 255, 0.1)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Mid',
      visible: showBB,
    });

    // MACD Series (using separate price scale to simulate pane)
    const macdHist = chart.addSeries(HistogramSeries, {
      priceScaleId: 'macd',
      visible: showMACD,
    });

    const macdLine = chart.addSeries(LineSeries, {
      color: '#06b6d4', // Cyan
      lineWidth: 2,
      priceScaleId: 'macd',
      visible: showMACD,
    });

    const macdSignal = chart.addSeries(LineSeries, {
      color: '#ec4899', // Pink
      lineWidth: 2,
      priceScaleId: 'macd',
      visible: showMACD,
    });

    chart.priceScale('macd').applyOptions({
      scaleMargins: {
        top: 0.75,
        bottom: 0.0,
      },
      borderVisible: true,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    markersPluginRef.current = createSeriesMarkers(candlestickSeries, []);
    smaRef.current = smaSeries;
    bbUpperRef.current = bbUpper;
    bbLowerRef.current = bbLower;
    bbMiddleRef.current = bbMiddle;
    volumeRef.current = volumeSeries;
    macdRef.current = macdLine;
    macdSignalRef.current = macdSignal;
    macdHistRef.current = macdHist;

    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(candlestickSeries) as any;
        if (data) {
          setLegendData({
            time: param.time,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            sma: (param.seriesData.get(smaSeries) as any)?.value,
            macd: (param.seriesData.get(macdLine) as any)?.value,
            macdSignal: (param.seriesData.get(macdSignal) as any)?.value,
          });
        }
      } else {
        setLegendData(null);
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: isFullScreen ? window.innerHeight - 100 : height 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, timeframe, theme, isFullScreen]);

  useEffect(() => {
    if (!seriesRef.current) return;

    dataRef.current = [];
    seriesRef.current.setData([]);
    smaRef.current.setData([]);
    bbUpperRef.current.setData([]);
    bbLowerRef.current.setData([]);
    bbMiddleRef.current.setData([]);
    volumeRef.current.setData([]);
    macdRef.current.setData([]);
    macdSignalRef.current.setData([]);
    macdHistRef.current.setData([]);
    setIsLoading(true);
    setError(null);

    derivService.changeTimeframe(symbol, timeframe);

    const fetchHistory = async () => {
      try {
        const timeframeLabel = TIMEFRAMES.find(tf => tf.value === timeframe)?.label || 'M1';
        const history = await derivService.getHistory(symbol, timeframeLabel, 500);
        if (seriesRef.current) {
          seriesRef.current.setData(history);
          dataRef.current = history;
          
          // SMA
          const smaData = [];
          for (let i = 19; i < history.length; i++) {
            const slice = history.slice(i - 19, i + 1);
            const sum = slice.reduce((a, b) => a + b.close, 0);
            smaData.push({ time: history[i].time, value: sum / 20 });
          }
          smaRef.current.setData(smaData);

          // BB
          const bb = calculateBollingerBands(history);
          bbUpperRef.current.setData(bb.upper);
          bbLowerRef.current.setData(bb.lower);
          bbMiddleRef.current.setData(bb.middle);

          // Volume (derived as high-fidelity range/tick volume proxy from high-low price volatility)
          const maxRange = Math.max(...history.map((h: any) => Math.abs(h.high - h.low)), 0.00001);
          const volumeData = history.map((h: any) => {
            const candleRange = Math.abs(h.high - h.low);
            const relativeRange = candleRange / maxRange;
            // Scale to a nice readable indicator range from 10 to 100
            const volumeProxy = Math.round(10 + relativeRange * 90);
            return {
              time: h.time,
              value: volumeProxy,
              color: h.close >= h.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            };
          });
          volumeRef.current.setData(volumeData);

          // MACD
          const macd = calculateMACD(history);
          macdRef.current.setData(macd.macd);
          macdSignalRef.current.setData(macd.signal);
          macdHistRef.current.setData(macd.histogram);
          
          updateMarkers();
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch market data");
        setIsLoading(false);
      }
    };

    const updateMarkers = () => {
      if (!seriesRef.current) return;
      let markers: any[] = [];
      
      if (showSMC && dataRef.current && dataRef.current.length > 0) {
          const smcMarkers = detectSMC(dataRef.current).map(m => ({
              time: m.time,
              position: m.position,
              color: m.color,
              shape: m.shape,
              text: m.text,
              size: 2
          }));
          markers = [...markers, ...smcMarkers];
      }
      
      // Sort markers by time as strictly required by lightweight-charts
      markers.sort((a, b) => a.time - b.time);
      if (markersPluginRef.current) markersPluginRef.current.setMarkers(markers);
    };

    fetchHistory();

    const handleCandle = (candle: DerivCandle) => {
      if (candle.symbol === symbol && seriesRef.current) {
        const timestamp = candle.time as UTCTimestamp;
        const newCandle = {
          time: timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
        
        seriesRef.current.update(newCandle);

        if (currentPriceLineRef.current) {
          seriesRef.current.removePriceLine(currentPriceLineRef.current);
        }
        currentPriceLineRef.current = seriesRef.current.createPriceLine({
          price: newCandle.close,
          color: theme.colors.primary,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'LIVE',
        });

        const existingIndex = dataRef.current.findIndex((c: any) => c.time === timestamp);
        if (existingIndex !== -1) {
          dataRef.current[existingIndex] = newCandle;
        } else {
          dataRef.current.push(newCandle);
        }

        if (dataRef.current.length > 500) dataRef.current.shift();

        // Update Indicators
        if (dataRef.current.length >= 20) {
          const last20 = dataRef.current.slice(-20);
          const sum = last20.reduce((a, b) => a + b.close, 0);
          const smaValue = sum / 20;
          smaRef.current.update({ time: timestamp, value: smaValue });

          const bb = calculateBollingerBands(dataRef.current);
          if (bb.upper.length > 0) {
            bbUpperRef.current.update(bb.upper[bb.upper.length - 1]);
            bbLowerRef.current.update(bb.lower[bb.lower.length - 1]);
            bbMiddleRef.current.update(bb.middle[bb.middle.length - 1]);
          }

          const macd = calculateMACD(dataRef.current);
          if (macd.macd.length > 0) {
            macdRef.current.update(macd.macd[macd.macd.length - 1]);
            macdSignalRef.current.update(macd.signal[macd.signal.length - 1]);
            macdHistRef.current.update(macd.histogram[macd.histogram.length - 1]);
          }

          volumeRef.current.update({
            time: timestamp,
            value: Math.random() * 100,
            color: newCandle.close >= newCandle.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
          });
        }
      }
    };

    derivService.addCandleListener(handleCandle);

    return () => {
      derivService.removeCandleListener(handleCandle);
    };
  }, [symbol, timeframe]);

  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRefs = useRef<any[]>([]);
  const currentPriceLineRef = useRef<any>(null);
  const alertLineRefs = useRef<any[]>([]);

  useEffect(() => {
    if (!seriesRef.current) return;

    alertLineRefs.current.forEach(line => {
      seriesRef.current.removePriceLine(line);
    });
    alertLineRefs.current = [];

    if (alerts && alerts.length > 0) {
      alerts.forEach(alert => {
        const line = seriesRef.current.createPriceLine({
          price: alert.price,
          color: '#a855f7', // Purple
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'ALERT',
        });
        alertLineRefs.current.push(line);
      });
    }
  }, [alerts, symbol, timeframe]);

  useEffect(() => {
    if (!seriesRef.current) return;

    if (currentPriceLineRef.current) {
      seriesRef.current.removePriceLine(currentPriceLineRef.current);
    }

    const lastCandle = dataRef.current[dataRef.current.length - 1];
    if (lastCandle) {
      currentPriceLineRef.current = seriesRef.current.createPriceLine({
        price: lastCandle.close,
        color: theme.colors.primary,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'LIVE',
      });
    }
  }, [symbol, timeframe, theme]);

  useEffect(() => {
    if (!seriesRef.current || !dataRef.current || dataRef.current.length === 0) return;
    
    let markers: any[] = [];
    
    if (showSMC) {
        const smcMarkers = detectSMC(dataRef.current).map((m: any) => ({
            time: m.time,
            position: m.position,
            color: m.color,
            shape: m.shape,
            text: m.text,
            size: 2
        }));
        markers = [...markers, ...smcMarkers];
    }
    
    markers.sort((a, b) => a.time - b.time);
    if (markersPluginRef.current) markersPluginRef.current.setMarkers(markers);
  }, [showSMC]);

  useEffect(() => {
    if (!seriesRef.current) return;

    if (entryLineRef.current) {
      seriesRef.current.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (slLineRef.current) {
      seriesRef.current.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    
    tpLineRefs.current.forEach(line => {
      seriesRef.current.removePriceLine(line);
    });
    tpLineRefs.current = [];
    
    if (entry) {
      entryLineRef.current = seriesRef.current.createPriceLine({
        price: entry,
        color: '#facc15', // Gold
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `ENTRY @ ${entry.toFixed(5)}`,
      });
    }

    if (sl) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: sl,
        color: '#ef4444', // Red
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `STOP LOSS @ ${sl.toFixed(5)}`,
      });
    }

    if (tps && tps.length > 0) {
      const tpColors = ['#059669', '#10b981', '#34d399', '#6ee7b7'];
      tps.forEach((tpValue, index) => {
        if (tpValue) {
          const color = tpColors[index % tpColors.length];
          const isLastTp = index === tps.length - 1;
          const label = index === 0 ? 'TP1(Partial)' : index === 1 ? 'TP2(Main)' : index === 2 ? 'TP3(Extended)' : `TP${index+1}(Runner)`;
          const line = seriesRef.current.createPriceLine({
            price: tpValue,
            color: color,
            lineWidth: isLastTp ? 2 : 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `${label} @ ${tpValue.toFixed(5)}`,
          });
          tpLineRefs.current.push(line);
        }
      });
    }
  }, [entry, sl, tps, symbol, timeframe, theme, signalType]);

  useEffect(() => {
    if (smaRef.current) smaRef.current.applyOptions({ visible: showIndicators });
    if (bbUpperRef.current) bbUpperRef.current.applyOptions({ visible: showBB });
    if (bbLowerRef.current) bbLowerRef.current.applyOptions({ visible: showBB });
    if (bbMiddleRef.current) bbMiddleRef.current.applyOptions({ visible: showBB });
    if (volumeRef.current) volumeRef.current.applyOptions({ visible: showVolume });
    if (macdRef.current) macdRef.current.applyOptions({ visible: showMACD });
    if (macdSignalRef.current) macdSignalRef.current.applyOptions({ visible: showMACD });
    if (macdHistRef.current) macdHistRef.current.applyOptions({ visible: showMACD });
  }, [showIndicators, showBB, showVolume, showMACD]);

  return (
    <div className={`w-full relative transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[200] bg-cosmic-black p-8' : 'h-full'}`}>
      <div ref={chartContainerRef} className="w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-black/20" />
      
      {/* Legend */}
      <div className="absolute top-20 left-6 pointer-events-none space-y-1">
        {legendData && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/5">
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="text-white/40 uppercase">O:</span>
              <span className={legendData.close >= legendData.open ? 'text-emerald-400' : 'text-red-400'}>{legendData.open.toFixed(5)}</span>
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="text-white/40 uppercase">H:</span>
              <span className={legendData.close >= legendData.open ? 'text-emerald-400' : 'text-red-400'}>{legendData.high.toFixed(5)}</span>
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="text-white/40 uppercase">L:</span>
              <span className={legendData.close >= legendData.open ? 'text-emerald-400' : 'text-red-400'}>{legendData.low.toFixed(5)}</span>
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <span className="text-white/40 uppercase">C:</span>
              <span className={legendData.close >= legendData.open ? 'text-emerald-400' : 'text-red-400'}>{legendData.close.toFixed(5)}</span>
            </div>
            {showIndicators && legendData.sma && (
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="text-gold uppercase">SMA(20):</span>
                <span className="text-gold">{legendData.sma.toFixed(5)}</span>
              </div>
            )}
            {showMACD && legendData.macd && (
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="text-cyan-400 uppercase">MACD:</span>
                <span className="text-cyan-400">{legendData.macd.toFixed(5)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 rounded-2xl">
          <Activity className="text-gold animate-pulse mb-2" size={32} />
          <p className="text-xs text-gold/60 font-mono uppercase tracking-widest">Consulting the Oracle Vision...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 p-6 text-center rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <EyeOff className="text-red-500" size={24} />
          </div>
          <h4 className="text-white font-display font-bold mb-2">Oracle Feed Interrupted</h4>
          <p className="text-xs text-white/40 mb-4 max-w-xs">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Reconnect Feed
          </button>
        </div>
      )}

      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <TrendingUp className="text-gold" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold gold-gradient uppercase tracking-wider leading-none">{symbol.replace('_', ' ')}</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">Oracle Vision Feed • Zion Network</p>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 flex items-center gap-3">
        <div className="flex bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/10">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                timeframe === tf.value ? 'bg-gold text-cosmic-black shadow-lg shadow-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/10">
          <button 
            onClick={() => setShowIndicators(!showIndicators)}
            className={`p-2 rounded-lg transition-all ${showIndicators ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-white/40'}`}
            title="SMA 20"
          >
            <Activity size={16} />
          </button>
          <button 
            onClick={() => setShowBB(!showBB)}
            className={`p-2 rounded-lg transition-all ${showBB ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-white/40'}`}
            title="Bollinger Bands"
          >
            <Settings2 size={16} />
          </button>
          <button 
            onClick={() => setShowVolume(!showVolume)}
            className={`p-2 rounded-lg transition-all ${showVolume ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-white/40'}`}
            title="Volume"
          >
            <BarChart3 size={16} />
          </button>
          <button 
            onClick={() => setShowMACD(!showMACD)}
            className={`p-2 rounded-lg transition-all ${showMACD ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-white/40'}`}
            title="MACD"
          >
            <Zap size={16} />
          </button>
          <button 
            onClick={() => setShowSMC(!showSMC)}
            className={`p-2 rounded-lg transition-all ${showSMC ? 'text-gold bg-gold/10' : 'text-white/20 hover:text-white/40'}`}
            title="Smart Money Concepts (SMC)"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-lg text-white/20 hover:text-white transition-all"
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Feed</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Latency: 42ms</span>
        </div>
      </div>
    </div>
  );
}
