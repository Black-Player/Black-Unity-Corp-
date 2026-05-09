import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { createChart, ColorType, IChartApi, CandlestickSeries } from 'lightweight-charts';
import { Play, Pause, TrendingUp, TrendingDown, RefreshCcw, DollarSign, Activity } from 'lucide-react';
import { UserProfile } from '../types';

export default function TradingGame({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [balance, setBalance] = useState(10000);
  const [position, setPosition] = useState<'BUY' | 'SELL' | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(100);
  const [pnl, setPnl] = useState<number>(0);
  const [candles, setCandles] = useState<any[]>([]);

  // Generate initial historical data
  useEffect(() => {
    let price = 100;
    const initialData = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 200; i >= 0; i--) {
      const open = price;
      const close = price + (Math.random() - 0.5) * 2;
      const high = Math.max(open, close) + Math.random();
      const low = Math.min(open, close) - Math.random();
      initialData.push({ time: now - i * 60, open, high, low, close });
      price = close;
    }
    setCandles(initialData);
    setCurrentPrice(price);
  }, []);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
    });

    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    seriesRef.current.setData(candles);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [candles]);

  // Game Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        const newTime = lastCandle.time + 60;
        
        // Random walk generator
        const volatility = 0.5;
        const trend = (Math.random() - 0.5) * 0.1;
        
        const open = lastCandle.close;
        const close = open + (Math.random() - 0.5) * volatility + trend;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        const newCandle = { time: newTime, open, high, low, close };
        
        if (seriesRef.current) {
          seriesRef.current.update(newCandle);
        }

        setCurrentPrice(close);

        if (position && entryPrice) {
          const diff = position === 'BUY' ? close - entryPrice : entryPrice - close;
          setPnl(diff * 10); // Multiplier for effect
        }

        return [...prev, newCandle];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, position, entryPrice]);

  const handleTrade = (type: 'BUY' | 'SELL') => {
    if (position) {
      addToast("You already have an open position. Close it first.", "error");
      return;
    }
    setPosition(type);
    setEntryPrice(currentPrice);
    setPnl(0);
    addToast(`${type} position opened at ${currentPrice.toFixed(2)}`, "info");
    if (!isPlaying) setIsPlaying(true);
  };

  const handleClose = () => {
    if (!position) return;
    setBalance(prev => prev + pnl);
    addToast(`Position closed. ${pnl >= 0 ? 'Profit:' : 'Loss:'} $${Math.abs(pnl).toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
    setPosition(null);
    setEntryPrice(null);
    setPnl(0);
  };

  const resetGame = () => {
    setBalance(10000);
    setPosition(null);
    setEntryPrice(null);
    setPnl(0);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
          <Activity size={32} /> Trading Simulator
        </h1>
        <p className="text-white/40">Test your strategies in a risk-free, accelerated market environment.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-1 rounded-xl border-white/5 relative overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex gap-4">
               <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Current Balance</span>
                  <span className="text-xl font-mono text-gold">${balance.toFixed(2)}</span>
               </div>
               {position && (
                 <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Open PNL</span>
                    <span className={`text-xl font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                    </span>
                 </div>
               )}
            </div>

            <div ref={chartContainerRef} className="w-full h-[450px]" />
            
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleTrade('BUY')}
              disabled={!!position}
              className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                position ? 'opacity-50 cursor-not-allowed bg-emerald-400/5 text-emerald-400 border border-emerald-400/10' : 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/50 hover:bg-emerald-400 hover:text-black'
              }`}
            >
              <TrendingUp size={20} /> Buy Market
            </button>
            <button 
              onClick={() => handleTrade('SELL')}
              disabled={!!position}
              className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                 position ? 'opacity-50 cursor-not-allowed bg-red-400/5 text-red-400 border border-red-400/10' : 'bg-red-400/20 text-red-400 border border-red-400/50 hover:bg-red-400 hover:text-white'
              }`}
            >
              <TrendingDown size={20} /> Sell Market
            </button>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-gold/20 bg-gold/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
              <DollarSign size={16} /> Game Stats
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Market Phase</span>
                <span className="text-emerald-400 font-bold uppercase tracking-widest">Active</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Initial Balance</span>
                <span className="text-white font-mono">$10,000.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Net Profit</span>
                <span className={`font-mono font-bold ${balance - 10000 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${(balance - 10000).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 space-y-3">
               {position ? (
                 <button 
                  onClick={handleClose}
                  className="w-full py-3 bg-gold text-black font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-all text-xs"
                 >
                   Close Position
                 </button>
               ) : (
                 <div className="text-center p-3 border border-white/5 bg-black/20 rounded-xl text-xs text-white/40">
                   No active positions
                 </div>
               )}
            </div>
          </div>

          <button 
            onClick={resetGame}
            className="w-full py-3 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RefreshCcw size={16} /> Reset Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
