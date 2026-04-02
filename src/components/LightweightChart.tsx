import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, LineStyle, Time, UTCTimestamp, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { derivService, DerivCandle } from '../services/derivService';
import { Eye, EyeOff, Activity } from 'lucide-react';

interface LightweightChartProps {
  symbol: string;
  entry?: number;
  sl?: number;
  tps?: number[];
  height?: number;
}

export default function LightweightChart({ symbol, entry, sl, tps, height = 400 }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const smaRef = useRef<any>(null);
  const dataRef = useRef<any[]>([]);
  const [showIndicators, setShowIndicators] = useState(true);
  const [timeframe, setTimeframe] = useState(60); // Default 1m
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const TIMEFRAMES = [
    { label: 'M1', value: 60 },
    { label: 'M5', value: 300 },
    { label: 'M15', value: 900 },
    { label: 'H1', value: 3600 },
    { label: 'H4', value: 14400 },
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#D4AF37',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe <= 300,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255, 255, 255, 0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'SMA 20',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    smaRef.current = smaSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, timeframe]);

  useEffect(() => {
    if (!seriesRef.current || !smaRef.current) return;

    // Reset data when symbol or timeframe changes
    dataRef.current = [];
    seriesRef.current.setData([]);
    smaRef.current.setData([]);
    setIsLoading(true);
    setError(null);

    // Update Deriv subscription for the new timeframe
    derivService.changeTimeframe(symbol, timeframe);

    // Fetch historical data
    const fetchHistory = async () => {
      try {
        const timeframeLabel = TIMEFRAMES.find(tf => tf.value === timeframe)?.label || 'M1';
        const history = await derivService.getHistory(symbol, timeframeLabel, 500);
        if (seriesRef.current && smaRef.current) {
          seriesRef.current.setData(history);
          dataRef.current = history;
          
          // Calculate SMA for history
          const smaData = [];
          for (let i = 19; i < history.length; i++) {
            const slice = history.slice(i - 19, i + 1);
            const sum = slice.reduce((a, b) => a + b.close, 0);
            smaData.push({ time: history[i].time, value: sum / 20 });
          }
          smaRef.current.setData(smaData);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch market data");
        setIsLoading(false);
      }
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
        
        // Lightweight charts requires unique timestamps or updates existing ones
        seriesRef.current.update(newCandle);

        // Manage local data for SMA calculation
        const existingIndex = dataRef.current.findIndex((c: any) => c.time === timestamp);
        if (existingIndex !== -1) {
          dataRef.current[existingIndex] = newCandle;
        } else {
          dataRef.current.push(newCandle);
        }

        if (dataRef.current.length > 500) dataRef.current.shift();

        // Calculate simple SMA 20 based on close prices
        if (dataRef.current.length >= 20) {
          const last20 = dataRef.current.slice(-20);
          const sum = last20.reduce((a, b) => a + b.close, 0);
          const smaValue = sum / 20;
          smaRef.current.update({ time: timestamp, value: smaValue });
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

  // Handle Entry, SL, TP lines
  useEffect(() => {
    if (!seriesRef.current) return;

    // Clear existing price lines
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
        color: '#D4AF37',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }

    if (sl) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: sl,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'SL',
      });
    }

    if (tps && tps.length > 0) {
      tps.forEach((tpValue, index) => {
        if (tpValue) {
          const line = seriesRef.current.createPriceLine({
            price: tpValue,
            color: index === tps.length - 1 ? '#D4AF37' : '#10b981', // Gold for final TP
            lineWidth: index === tps.length - 1 ? 2 : 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `TP${index + 1}`,
          });
          tpLineRefs.current.push(line);
        }
      });
    }
  }, [entry, sl, tps, symbol, timeframe]);

  useEffect(() => {
    if (smaRef.current) {
      smaRef.current.applyOptions({ visible: showIndicators });
    }
  }, [showIndicators]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <Activity className="text-gold animate-pulse mb-2" size={32} />
          <p className="text-xs text-gold/60 font-mono uppercase tracking-widest">Synchronizing Oracle Vision...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10 p-6 text-center">
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
      <div className="absolute top-4 left-4 pointer-events-none">
        <h3 className="text-xl font-display font-bold gold-gradient uppercase tracking-wider">{symbol.replace('_', ' ')}</h3>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Oracle Vision Feed • Lightweight Engine</p>
      </div>
      <div className="absolute top-4 right-4 flex gap-2">
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                timeframe === tf.value ? 'bg-gold text-cosmic-black' : 'text-white/40 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowIndicators(!showIndicators)}
          className={`p-2 rounded-lg glass-card border-white/5 transition-all ${showIndicators ? 'text-gold' : 'text-white/20'}`}
          title="Toggle Oracle Vision"
        >
          {showIndicators ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
}
