import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, Eye, Play, Sparkles, AlertTriangle, ShieldCheck, 
  HelpCircle, Copy, Check, RefreshCw, BarChart2, BookOpen, Layers, Info, TrendingUp, Award, Camera
} from 'lucide-react';
import { Signal, UserProfile } from '../types';
import { sendPhotoToTelegram, sendSignalToTelegram } from '../services/communicationService';

// Browser-native high-definition SVG to PNG Blob capture engine
export async function captureSvgAsPngBlob(svgElement: SVGSVGElement): Promise<Blob> {
  const serializer = new XMLSerializer();
  
  // Clone the SVG so we don't disrupt the live DOM state
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // High-Definition upscale dimensions for Telegram and local saving
  svgClone.setAttribute('width', '1280');
  svgClone.setAttribute('height', '800');
  
  const svgString = serializer.serializeToString(svgClone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not construct 2D render context"));
        return;
      }
      
      // Draw professional dark theme backdrop
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid pattern over background manually for the exported image
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.drawImage(img, 0, 0, 1280, 800);
      URL.revokeObjectURL(url);
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG Blob compilation failure"));
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

interface UltimateConfluenceChartProps {
  signal: Partial<Signal>;
  userProfile: UserProfile;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function UltimateConfluenceChart({ signal, userProfile, addToast }: UltimateConfluenceChartProps) {
  const isSignalBuy = signal.decision === 'Buy' || signal.stop_loss < signal.entry;
  const [direction, setDirection] = useState<'bullish' | 'bearish'>(isSignalBuy ? 'bullish' : 'bearish');
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animationStep, setAnimationStep] = useState(0); // 0: idle, 1: inducement, 2: liquidity sweep, 3: choch/bos, 4: mitigation/entry, 5: take profit expansion
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Sync state if signal changes
  useEffect(() => {
    setDirection(isSignalBuy ? 'bullish' : 'bearish');
    setAnimationStep(0);
    setIsPlayingAnimation(false);
  }, [signal.id, isSignalBuy]);

  // Dynamic animation sequence for Liquidity Sweep and Mitigation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAnimation) {
      setAnimationStep(1);
      
      const sequence = [
        { step: 1, delay: 1500 }, // Inducement build-up
        { step: 2, delay: 1800 }, // Liquidity Sweep spike (Warning!)
        { step: 3, delay: 1800 }, // CHoCH / BOS Breakout
        { step: 4, delay: 1800 }, // Pullback & Mitigation (Entry Triggered!)
        { step: 5, delay: 2000 }, // Take Profit Expansion (Target Hit!)
        { step: 0, delay: 1000 }  // Back to normal
      ];

      let currentIdx = 0;
      const runNext = () => {
        if (currentIdx >= sequence.length) {
          setIsPlayingAnimation(false);
          setAnimationStep(0);
          return;
        }
        
        const current = sequence[currentIdx];
        setAnimationStep(current.step);
        currentIdx++;
        timer = setTimeout(runNext, current.delay);
      };

      timer = setTimeout(runNext, 1200);
    } else {
      setAnimationStep(0);
    }

    return () => clearTimeout(timer);
  }, [isPlayingAnimation]);

  const pairName = signal.pair ? signal.pair.replace('frx', '').replace('R_', 'Vol ').toUpperCase() : 'XAUUSD';
  const entryPrice = signal.entry || 2345.50;
  const slPrice = signal.stop_loss || 2335.00;
  const tp1Price = signal.tp1 || 2360.00;
  const tp2Price = signal.tp2 || 2375.00;
  const tp3Price = signal.tp3 || 2390.00;
  
  // Calculate a proportional 4th Take Profit target
  const tp4Price = signal.tp4 || (isSignalBuy ? entryPrice + Math.abs(entryPrice - slPrice) * 6.0 : entryPrice - Math.abs(entryPrice - slPrice) * 6.0);

  // Dynamic Y-scaling: maps prices cleanly to our 320px high SVG frame (margins 40px to 280px)
  const getPriceScaleY = (price: number) => {
    const allPrices = [slPrice, entryPrice, tp1Price, tp2Price, tp3Price, tp4Price];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const range = maxPrice - minPrice || 1;
    
    // Normalize percentage (0 = minPrice, 1 = maxPrice)
    const percentage = (price - minPrice) / range;
    
    // In SVG, lower Y is at the top. So we subtract percentage from 270.
    return 270 - (percentage * 210); // Spans from Y=270 (lowest price) to Y=60 (highest price)
  };

  const getFullPromptText = () => {
    return `Create a high-fidelity institutional order flow chart of ${pairName} on 1H timeframe showing a perfect Smart Money Concepts (SMC) reversal setup.
Style: Dark TradingView theme, absolute precision, clean modern design.
- SL (Stop Loss) level in vibrant Red: ${slPrice}
- Entry Zone in bright emerald Green: ${entryPrice}
- Progress Take Profit levels (TP1, TP2, TP3, TP4) in glowing Royal Blue: ${tp1Price}, ${tp2Price}, ${tp3Price}, ${tp4Price}
- A beautifully shaded Order Block (OB) box where the mitigation happened.
- Clean unshaded boxes with dotted outlines representing Fair Value Gaps (FVGs).
- Solid trendlines labeled BOS and CHoCH showing structural breakout levels.
- Horizontal dotted lines showing Inducement levels and Liquidity Sweeps.
- Direction of setup: ${direction.toUpperCase()}.`;
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(getFullPromptText());
    setCopiedPrompt(true);
    addToast("Ultimate SMC Chart Prompt exported to clipboard!", "success");
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Generate 15 dynamic candlesticks which tell the comprehensive story of the SMC setup
  const generateSetupCandles = () => {
    const R = Math.abs(entryPrice - slPrice) || 10;
    const isBuy = direction === 'bullish';
    
    const makeCandle = (
      index: number, 
      openPrice: number, 
      closePrice: number, 
      highPrice: number, 
      lowPrice: number,
      label?: string
    ) => {
      const x = 30 + index * 27; // Clean horizontal alignment
      return {
        x,
        open: getPriceScaleY(openPrice),
        close: getPriceScaleY(closePrice),
        high: getPriceScaleY(highPrice),
        low: getPriceScaleY(lowPrice),
        openPrice,
        closePrice,
        highPrice,
        lowPrice,
        type: isBuy 
          ? (closePrice >= openPrice ? 'bull' : 'bear')
          : (closePrice <= openPrice ? 'bull' : 'bear'),
        label
      };
    };

    const candlesList = [];

    if (isBuy) {
      // Bullish SMC Accumulation Setup
      candlesList.push(makeCandle(0, entryPrice - 0.3 * R, entryPrice - 0.1 * R, entryPrice, entryPrice - 0.4 * R));
      candlesList.push(makeCandle(1, entryPrice - 0.1 * R, entryPrice - 0.4 * R, entryPrice - 0.05 * R, entryPrice - 0.5 * R));
      // Inducement point (IDM)
      candlesList.push(makeCandle(2, entryPrice - 0.4 * R, entryPrice - 0.2 * R, entryPrice + 0.2 * R, entryPrice - 0.6 * R, 'IDM'));
      candlesList.push(makeCandle(3, entryPrice - 0.2 * R, entryPrice - 0.5 * R, entryPrice - 0.1 * R, entryPrice - 0.6 * R));
      // Liquidity Sweep (Sweeps below all consolidation lows)
      candlesList.push(makeCandle(4, entryPrice - 0.5 * R, entryPrice - 0.8 * R, entryPrice - 0.3 * R, entryPrice - 0.94 * R, 'SWEEP'));
      // Strong Displacement upwards (Leaves FVG)
      candlesList.push(makeCandle(5, entryPrice - 0.78 * R, entryPrice + 0.3 * R, entryPrice + 0.4 * R, entryPrice - 0.8 * R));
      // Breakout of character (CHoCH)
      candlesList.push(makeCandle(6, entryPrice + 0.25 * R, entryPrice + 1.0 * R, entryPrice + 1.1 * R, entryPrice + 0.2 * R, 'CHOCH'));
      // Break of Structure (BOS)
      candlesList.push(makeCandle(7, entryPrice + 0.9 * R, entryPrice + 1.6 * R, entryPrice + 1.7 * R, entryPrice + 0.8 * R, 'BOS'));
      candlesList.push(makeCandle(8, entryPrice + 1.6 * R, entryPrice + 1.3 * R, entryPrice + 1.8 * R, entryPrice + 1.2 * R));
      // Deeper Pullback into FVG & Order Block
      candlesList.push(makeCandle(9, entryPrice + 1.3 * R, entryPrice + 0.5 * R, entryPrice + 1.4 * R, entryPrice + 0.4 * R));
      // Mitigation / Tap entry perfectly!
      candlesList.push(makeCandle(10, entryPrice + 0.5 * R, entryPrice + 0.2 * R, entryPrice + 0.6 * R, entryPrice, 'ENTRY'));
      // Strong bullish bounce
      candlesList.push(makeCandle(11, entryPrice + 0.2 * R, tp1Price - 0.1 * R, tp1Price, entryPrice + 0.1 * R));
      candlesList.push(makeCandle(12, tp1Price - 0.1 * R, tp1Price + 0.3 * R, tp1Price + 0.5 * R, tp1Price - 0.2 * R, 'TP1'));
      candlesList.push(makeCandle(13, tp1Price + 0.3 * R, tp1Price + 0.1 * R, tp1Price + 0.4 * R, tp1Price));
      // Full expansion past targets
      candlesList.push(makeCandle(14, tp1Price + 0.1 * R, tp3Price + 0.5 * R, tp3Price + 0.8 * R, tp1Price, 'TARGET'));
    } else {
      // Bearish SMC Distribution Setup
      candlesList.push(makeCandle(0, entryPrice + 0.3 * R, entryPrice + 0.1 * R, entryPrice + 0.4 * R, entryPrice));
      candlesList.push(makeCandle(1, entryPrice + 0.1 * R, entryPrice + 0.4 * R, entryPrice + 0.5 * R, entryPrice + 0.05 * R));
      // Inducement point (IDM)
      candlesList.push(makeCandle(2, entryPrice + 0.4 * R, entryPrice + 0.2 * R, entryPrice + 0.6 * R, entryPrice - 0.2 * R, 'IDM'));
      candlesList.push(makeCandle(3, entryPrice + 0.2 * R, entryPrice + 0.5 * R, entryPrice + 0.6 * R, entryPrice + 0.1 * R));
      // Liquidity Sweep (Sweeps above all consolidation highs)
      candlesList.push(makeCandle(4, entryPrice + 0.5 * R, entryPrice + 0.8 * R, entryPrice + 0.94 * R, entryPrice + 0.3 * R, 'SWEEP'));
      // Strong Displacement downwards (Leaves FVG)
      candlesList.push(makeCandle(5, entryPrice + 0.78 * R, entryPrice - 0.3 * R, entryPrice + 0.8 * R, entryPrice - 0.4 * R));
      // Breakout of character (CHoCH)
      candlesList.push(makeCandle(6, entryPrice - 0.25 * R, entryPrice - 1.0 * R, entryPrice - 0.2 * R, entryPrice - 1.1 * R, 'CHOCH'));
      // Break of Structure (BOS)
      candlesList.push(makeCandle(7, entryPrice - 0.9 * R, entryPrice - 1.6 * R, entryPrice - 0.8 * R, entryPrice - 1.7 * R, 'BOS'));
      candlesList.push(makeCandle(8, entryPrice - 1.6 * R, entryPrice - 1.3 * R, entryPrice - 1.2 * R, entryPrice - 1.8 * R));
      // Deeper Pullback up into FVG & Order Block
      candlesList.push(makeCandle(9, entryPrice - 1.3 * R, entryPrice - 0.5 * R, entryPrice - 0.4 * R, entryPrice - 1.4 * R));
      // Mitigation / Tap entry perfectly!
      candlesList.push(makeCandle(10, entryPrice - 0.5 * R, entryPrice - 0.2 * R, entryPrice, entryPrice - 0.6 * R, 'ENTRY'));
      // Strong bearish bounce down
      candlesList.push(makeCandle(11, entryPrice - 0.2 * R, tp1Price + 0.1 * R, entryPrice - 0.1 * R, tp1Price));
      candlesList.push(makeCandle(12, tp1Price + 0.1 * R, tp1Price - 0.3 * R, tp1Price + 0.2 * R, tp1Price - 0.5 * R, 'TP1'));
      candlesList.push(makeCandle(13, tp1Price - 0.3 * R, tp1Price - 0.1 * R, tp1Price, tp1Price - 0.4 * R));
      // Full expansion down
      candlesList.push(makeCandle(14, tp1Price - 0.1 * R, tp3Price - 0.5 * R, tp1Price, tp3Price - 0.8 * R, 'TARGET'));
    }

    return candlesList;
  };

  const candles = generateSetupCandles();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureAndBroadcast = async () => {
    if (!svgRef.current) {
      addToast("Failed to capture: SVG element not found.", "error");
      return;
    }
    
    setIsCapturing(true);
    addToast("Generating premium chart snapshot...", "info");
    
    try {
      // 1. Capture SVG element as high-definition PNG Blob
      const blob = await captureSvgAsPngBlob(svgRef.current);
      
      // 2. Prepare the beautiful SMC narrative caption
      const caption = `📊 <b>BUC ORACLE PROPHECY UPDATE</b>
━━━━━━━━━━━━━━━━━━━━
📌 <b>Asset:</b> ${pairName} • 1H timeframe
🔥 <b>Direction:</b> ${direction.toUpperCase() === 'BULLISH' ? '🟢 ACCUMULATION (MARKUP)' : '🔴 DISTRIBUTION (MARKDOWN)'}

⚡ <b>INSTITUTIONAL LEVEL PROFILE:</b>
• <b>Entry Trigger:</b> $${entryPrice.toFixed(2)}
• <b>Stop Loss (SL):</b> $${slPrice.toFixed(2)}
• <b>Target TP1:</b> $${tp1Price.toFixed(2)}
• <b>Target TP2:</b> $${tp2Price.toFixed(2)}
• <b>Target TP3:</b> $${tp3Price.toFixed(2)}
• <b>Ultimate TP4:</b> $${tp4Price.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━
💡 <b>SMC Confluence Details:</b>
- Beautifully mitigated <b>Order Block (OB)</b> zone shaded on chart.
- Algorithmic imbalances (<b>Fair Value Gaps</b>) remain unfilled.
- Local structural shifts confirmed via <b>CHoCH</b> and <b>BOS</b> trendlines.
- Trailing protection active: SL will shift to Breakeven at TP1 automatically.

🔮 <i>Oracle Engine • Powered by Blāck-Plāyer SMC Core</i>`;

      // 3. Broadcast the photo to Telegram
      const success = await sendPhotoToTelegram(blob, caption, userProfile.integrations);
      
      if (success) {
        addToast("SMC Chart Snapshot & Analysis broadcasted to Telegram successfully!", "success");
      } else {
        addToast("Broadcast failed. Please check your Telegram API Key configuration.", "warning");
      }
    } catch (error: any) {
      console.error("Capture and broadcast error:", error);
      addToast(`Error generating snapshot: ${error.message || error}`, "error");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Chart Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={16} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">TradingView Smart Money Concepts Chart</h3>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Dynamic SVG plotting with institutional Order Flow levels & structural transitions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direction toggle */}
          <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/5">
            <button
              onClick={() => setDirection('bullish')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${direction === 'bullish' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              🟢 Bullish
            </button>
            <button
              onClick={() => setDirection('bearish')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${direction === 'bearish' ? 'bg-red-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
            >
              🔴 Bearish
            </button>
          </div>

          {/* Animation Trigger */}
          <button
            onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
            className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isPlayingAnimation ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/10 text-white/80 hover:bg-white/5'}`}
          >
            {isPlayingAnimation ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
            <span>{isPlayingAnimation ? 'Tracking flow...' : 'Play SMC Sequence'}</span>
          </button>

          {/* Copy Prompt option */}
          <button
            onClick={copyPromptToClipboard}
            className="px-4 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export text prompt for external chart generators"
          >
            {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedPrompt ? 'Copied!' : 'Export Prompt'}</span>
          </button>

          {/* Capture & Broadcast option */}
          <button
            onClick={handleCaptureAndBroadcast}
            disabled={isCapturing}
            className={`px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Capture chart snapshot and broadcast to Telegram"
          >
            {isCapturing ? <RefreshCw className="animate-spin" size={12} /> : <Camera size={12} />}
            <span>{isCapturing ? 'Broadcasting...' : 'Snapshot & Broadcast'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Custom SVG TradingView Canvas (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[340px] rounded-2xl bg-slate-950 border border-white/10 overflow-hidden flex flex-col select-none shadow-2xl">
            
            {/* Elegant grid line pattern backdrop */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Watermark Details */}
            <div className="absolute top-4 left-4 flex items-center gap-2 opacity-65">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                {pairName} • 1H Chart
              </p>
            </div>
            
            <div className="absolute top-4 right-16 text-right font-mono opacity-65">
              <h4 className="text-[10px] font-bold text-white tracking-widest">SMC ALGORITHMIC VECTOR</h4>
              <p className="text-[7px] text-indigo-400 uppercase font-bold">1:1 High-Precision Framework</p>
            </div>

            {/* Step Alerts overlay during sequence play */}
            <AnimatePresence>
              {isPlayingAnimation && animationStep > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-indigo-500/30 text-white shadow-2xl flex items-center gap-2 z-10"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                    {animationStep === 1 && "Phase 1: Generating Inducement (Retail bait)"}
                    {animationStep === 2 && "Phase 2: LIQUIDITY SWEEP! (Stop Loss Hunt Completed)"}
                    {animationStep === 3 && "Phase 3: DISPLACEMENT BREAKOUT (CHOCH/BOS shift)"}
                    {animationStep === 4 && "Phase 4: MITIGATION OF ORDER BLOCK (Tapping Entry!)"}
                    {animationStep === 5 && "Phase 5: TAKE PROFIT DISPATCH (Target Liquidation Hit!)"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary SVG Chart */}
            <div className="flex-1 w-full h-full relative">
              <svg ref={svgRef} className="w-full h-full" viewBox="0 0 500 320" preserveAspectRatio="none">
                
                {/* Horizontal grid guidelines */}
                {[50, 100, 150, 200, 250, 300].map((y) => (
                  <line key={y} x1="0" y1={y} x2="435" y2={y} stroke="rgba(255,255,255,0.015)" strokeDasharray="3,3" />
                ))}

                {/* Right price scale vertical divider */}
                <line x1="435" y1="0" x2="435" y2="320" stroke="rgba(255,255,255,0.08)" />

                {/* 1. ORDER BLOCKS (OB) - SHADED BOXES */}
                {/* Bullish OB is shaded in transparent green, Bearish OB is shaded in transparent red */}
                {direction === 'bullish' ? (
                  <g>
                    <rect 
                      x="130" 
                      y={getPriceScaleY(entryPrice + 0.1 * Math.abs(entryPrice - slPrice))} 
                      width="165" 
                      height={Math.abs(getPriceScaleY(entryPrice) - getPriceScaleY(entryPrice - 0.45 * Math.abs(entryPrice - slPrice)))} 
                      fill="url(#bullishObGrad)" 
                      stroke="#10b981" 
                      strokeWidth="1.2"
                      opacity={animationStep === 4 ? 0.35 : 0.18}
                      className="transition-all duration-300"
                    />
                    <text 
                      x="135" 
                      y={getPriceScaleY(entryPrice) + 12} 
                      fill="#10b981" 
                      fontSize="6.5" 
                      fontFamily="monospace" 
                      fontWeight="bold"
                      opacity="0.75"
                    >
                      BULLISH ORDER BLOCK (OB) - SHADED
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect 
                      x="130" 
                      y={getPriceScaleY(entryPrice + 0.45 * Math.abs(entryPrice - slPrice))} 
                      width="165" 
                      height={Math.abs(getPriceScaleY(entryPrice) - getPriceScaleY(entryPrice + 0.45 * Math.abs(entryPrice - slPrice)))} 
                      fill="url(#bearishObGrad)" 
                      stroke="#ef4444" 
                      strokeWidth="1.2"
                      opacity={animationStep === 4 ? 0.35 : 0.18}
                      className="transition-all duration-300"
                    />
                    <text 
                      x="135" 
                      y={getPriceScaleY(entryPrice) - 8} 
                      fill="#ef4444" 
                      fontSize="6.5" 
                      fontFamily="monospace" 
                      fontWeight="bold"
                      opacity="0.75"
                    >
                      BEARISH ORDER BLOCK (OB) - SHADED
                    </text>
                  </g>
                )}

                {/* 2. FAIR VALUE GAPS (FVG) - UNSHADED BOXES */}
                {/* Unshaded transparent boxes with elegant purple dashed borders */}
                {direction === 'bullish' ? (
                  <g>
                    <rect 
                      x="142" 
                      y={getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice))} 
                      width="100" 
                      height={Math.abs(getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice)) - getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice)))} 
                      fill="none" 
                      stroke="#a855f7" 
                      strokeWidth="1" 
                      strokeDasharray="3,3"
                      opacity="0.5"
                    />
                    <text 
                      x="147" 
                      y={getPriceScaleY(entryPrice) - 3} 
                      fill="#a855f7" 
                      fontSize="6" 
                      fontFamily="monospace"
                      opacity="0.65"
                    >
                      FVG (UNSHADED)
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect 
                      x="142" 
                      y={getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice))} 
                      width="100" 
                      height={Math.abs(getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice)) - getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice)))} 
                      fill="none" 
                      stroke="#a855f7" 
                      strokeWidth="1" 
                      strokeDasharray="3,3"
                      opacity="0.5"
                    />
                    <text 
                      x="147" 
                      y={getPriceScaleY(entryPrice) + 10} 
                      fill="#a855f7" 
                      fontSize="6" 
                      fontFamily="monospace"
                      opacity="0.65"
                    >
                      FVG (UNSHADED)
                    </text>
                  </g>
                )}

                {/* 3. DOTTED LINES FOR INDUCEMENT AND LIQUIDITY SWEEPS */}
                {/* Inducement (IDM) Dotted Line */}
                {direction === 'bullish' ? (
                  <g>
                    <line 
                      x1="84" 
                      y1={getPriceScaleY(entryPrice - 0.6 * Math.abs(entryPrice - slPrice))} 
                      x2="280" 
                      y2={getPriceScaleY(entryPrice - 0.6 * Math.abs(entryPrice - slPrice))} 
                      stroke="#eab308" 
                      strokeWidth="1.2" 
                      strokeDasharray="2,3" 
                      opacity={animationStep === 1 ? 0.95 : 0.55}
                    />
                    <text 
                      x="90" 
                      y={getPriceScaleY(entryPrice - 0.6 * Math.abs(entryPrice - slPrice)) - 5} 
                      fill="#eab308" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                      opacity={animationStep === 1 ? 1 : 0.6}
                    >
                      INDUCEMENT LEVEL (IDM)
                    </text>
                  </g>
                ) : (
                  <g>
                    <line 
                      x1="84" 
                      y1={getPriceScaleY(entryPrice + 0.6 * Math.abs(entryPrice - slPrice))} 
                      x2="280" 
                      y2={getPriceScaleY(entryPrice + 0.6 * Math.abs(entryPrice - slPrice))} 
                      stroke="#eab308" 
                      strokeWidth="1.2" 
                      strokeDasharray="2,3" 
                      opacity={animationStep === 1 ? 0.95 : 0.55}
                    />
                    <text 
                      x="90" 
                      y={getPriceScaleY(entryPrice + 0.6 * Math.abs(entryPrice - slPrice)) + 9} 
                      fill="#eab308" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                      opacity={animationStep === 1 ? 1 : 0.6}
                    >
                      INDUCEMENT LEVEL (IDM)
                    </text>
                  </g>
                )}

                {/* Liquidity Sweep Dotted Line */}
                {direction === 'bullish' ? (
                  <g>
                    <line 
                      x1="30" 
                      y1={getPriceScaleY(entryPrice - 0.94 * Math.abs(entryPrice - slPrice))} 
                      x2="150" 
                      y2={getPriceScaleY(entryPrice - 0.94 * Math.abs(entryPrice - slPrice))} 
                      stroke="#ff4444" 
                      strokeWidth="1.2" 
                      strokeDasharray="2,3" 
                      opacity={animationStep === 2 ? 0.95 : 0.55}
                    />
                    <text 
                      x="35" 
                      y={getPriceScaleY(entryPrice - 0.94 * Math.abs(entryPrice - slPrice)) - 5} 
                      fill="#ff4444" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                      opacity={animationStep === 2 ? 1 : 0.6}
                    >
                      LIQUIDITY SWEEP (SSL ✘)
                    </text>
                  </g>
                ) : (
                  <g>
                    <line 
                      x1="30" 
                      y1={getPriceScaleY(entryPrice + 0.94 * Math.abs(entryPrice - slPrice))} 
                      x2="150" 
                      y2={getPriceScaleY(entryPrice + 0.94 * Math.abs(entryPrice - slPrice))} 
                      stroke="#ff4444" 
                      strokeWidth="1.2" 
                      strokeDasharray="2,3" 
                      opacity={animationStep === 2 ? 0.95 : 0.55}
                    />
                    <text 
                      x="35" 
                      y={getPriceScaleY(entryPrice + 0.94 * Math.abs(entryPrice - slPrice)) + 9} 
                      fill="#ff4444" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                      opacity={animationStep === 2 ? 1 : 0.6}
                    >
                      LIQUIDITY SWEEP (BSL ✘)
                    </text>
                  </g>
                )}


                {/* 4. TRENDLINES FOR BOS AND CHOCH LEVELS */}
                {/* CHoCH Trendline */}
                {direction === 'bullish' ? (
                  <g>
                    <line 
                      x1="135" 
                      y1={getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice))} 
                      x2="195" 
                      y2={getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice))} 
                      stroke="#f59e0b" 
                      strokeWidth="1.5" 
                      opacity={animationStep >= 3 ? 0.95 : 0.5}
                    />
                    <text 
                      x="142" 
                      y={getPriceScaleY(entryPrice + 0.25 * Math.abs(entryPrice - slPrice)) - 5} 
                      fill="#f59e0b" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      CHoCH ──
                    </text>
                  </g>
                ) : (
                  <g>
                    <line 
                      x1="135" 
                      y1={getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice))} 
                      x2="195" 
                      y2={getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice))} 
                      stroke="#f59e0b" 
                      strokeWidth="1.5" 
                      opacity={animationStep >= 3 ? 0.95 : 0.5}
                    />
                    <text 
                      x="142" 
                      y={getPriceScaleY(entryPrice - 0.25 * Math.abs(entryPrice - slPrice)) + 9} 
                      fill="#f59e0b" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      CHoCH ──
                    </text>
                  </g>
                )}

                {/* BOS Trendline */}
                {direction === 'bullish' ? (
                  <g>
                    <line 
                      x1="192" 
                      y1={getPriceScaleY(entryPrice + 0.9 * Math.abs(entryPrice - slPrice))} 
                      x2="245" 
                      y2={getPriceScaleY(entryPrice + 0.9 * Math.abs(entryPrice - slPrice))} 
                      stroke="#22c55e" 
                      strokeWidth="1.5" 
                      opacity={animationStep >= 3 ? 0.95 : 0.5}
                    />
                    <text 
                      x="197" 
                      y={getPriceScaleY(entryPrice + 0.9 * Math.abs(entryPrice - slPrice)) - 5} 
                      fill="#22c55e" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      BOS ──
                    </text>
                  </g>
                ) : (
                  <g>
                    <line 
                      x1="192" 
                      y1={getPriceScaleY(entryPrice - 0.9 * Math.abs(entryPrice - slPrice))} 
                      x2="245" 
                      y2={getPriceScaleY(entryPrice - 0.9 * Math.abs(entryPrice - slPrice))} 
                      stroke="#ef4444" 
                      strokeWidth="1.5" 
                      opacity={animationStep >= 3 ? 0.95 : 0.5}
                    />
                    <text 
                      x="197" 
                      y={getPriceScaleY(entryPrice - 0.9 * Math.abs(entryPrice - slPrice)) + 9} 
                      fill="#ef4444" 
                      fontSize="6" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      BOS ──
                    </text>
                  </g>
                )}


                {/* 5. PRICE ACTION CANDLESTICKS */}
                <g>
                  {candles.map((c, i) => {
                    const isBear = c.type === 'bear';
                    let wickColor = isBear ? '#ef4444' : '#22c55e';
                    let bodyColor = isBear ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 197, 94, 0.45)';
                    let strokeColor = isBear ? '#ef4444' : '#22c55e';

                    // Highlight sweeps or mitigation during active sequence step
                    if (c.label === 'SWEEP' && animationStep === 2) {
                      bodyColor = '#ff4444';
                      wickColor = '#ff5555';
                      strokeColor = '#ffffff';
                    } else if (c.label === 'ENTRY' && animationStep === 4) {
                      bodyColor = '#22c55e';
                      wickColor = '#4ade80';
                      strokeColor = '#ffffff';
                    } else if (c.label === 'TARGET' && animationStep === 5) {
                      bodyColor = '#2563eb';
                      wickColor = '#3b82f6';
                      strokeColor = '#ffffff';
                    }

                    return (
                      <g key={i}>
                        {/* Shadow Wick */}
                        <line 
                          x1={c.x} 
                          y1={c.high} 
                          x2={c.x} 
                          y2={c.low} 
                          stroke={wickColor} 
                          strokeWidth="1.5" 
                        />
                        {/* Real Candle Body */}
                        <rect 
                          x={c.x - 4.5} 
                          y={Math.min(c.open, c.close)} 
                          width="9" 
                          height={Math.max(3, Math.abs(c.open - c.close))} 
                          fill={bodyColor} 
                          stroke={strokeColor} 
                          strokeWidth="1" 
                          rx="0.5"
                        />
                        
                        {/* Mini floating labels on essential structural candles */}
                        {c.label && (
                          <g opacity="0.8">
                            <rect 
                              x={c.x - 12} 
                              y={isBear ? c.low + 5 : c.high - 14} 
                              width="24" 
                              height="9" 
                              rx="2" 
                              fill="rgba(15, 23, 42, 0.85)" 
                              stroke="rgba(255,255,255,0.1)" 
                              strokeWidth="0.5" 
                            />
                            <text 
                              x={c.x} 
                              y={isBear ? c.low + 11 : c.high - 8} 
                              fill={c.label === 'SWEEP' ? '#ff4444' : c.label === 'ENTRY' ? '#22c55e' : c.label === 'TARGET' ? '#2563eb' : 'rgba(255,255,255,0.75)'} 
                              fontSize="5.5" 
                              fontFamily="monospace" 
                              fontWeight="bold" 
                              textAnchor="middle"
                            >
                              {c.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>


                {/* 6. EXACT LEVELS PLOT: RED FOR SL, GREEN FOR ENTRY, ROYAL BLUE FOR TPs */}
                {/* STOP LOSS LEVEL (Glowing RED) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(slPrice)} 
                    x2="435" 
                    y2={getPriceScaleY(slPrice)} 
                    stroke="#ef4444" 
                    strokeWidth="1.5" 
                    strokeDasharray="4,2" 
                  />
                  <rect x="437" y={getPriceScaleY(slPrice) - 6} width="60" height="12" rx="2" fill="#ef4444" />
                  <text x="440" y={getPriceScaleY(slPrice) + 2.5} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    SL {slPrice.toFixed(2)}
                  </text>
                </g>

                {/* ENTRY LEVEL (Bright GREEN) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(entryPrice)} 
                    x2="435" 
                    y2={getPriceScaleY(entryPrice)} 
                    stroke="#10b981" 
                    strokeWidth="1.8" 
                  />
                  <rect x="437" y={getPriceScaleY(entryPrice) - 6} width="60" height="12" rx="2" fill="#10b981" />
                  <text x="440" y={getPriceScaleY(entryPrice) + 2.5} fill="#000000" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ENT {entryPrice.toFixed(2)}
                  </text>
                </g>

                {/* TAKE PROFIT 1 LEVEL (Royal Blue) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp1Price)} 
                    x2="435" 
                    y2={getPriceScaleY(tp1Price)} 
                    stroke="#2563eb" 
                    strokeWidth="1.2" 
                    strokeDasharray="3,1" 
                  />
                  <rect x="437" y={getPriceScaleY(tp1Price) - 6} width="60" height="12" rx="2" fill="#2563eb" />
                  <text x="440" y={getPriceScaleY(tp1Price) + 2.5} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP1 {tp1Price.toFixed(2)}
                  </text>
                </g>

                {/* TAKE PROFIT 2 LEVEL (Royal Blue) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp2Price)} 
                    x2="435" 
                    y2={getPriceScaleY(tp2Price)} 
                    stroke="#2563eb" 
                    strokeWidth="1.2" 
                    strokeDasharray="3,1" 
                  />
                  <rect x="437" y={getPriceScaleY(tp2Price) - 6} width="60" height="12" rx="2" fill="#2563eb" />
                  <text x="440" y={getPriceScaleY(tp2Price) + 2.5} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP2 {tp2Price.toFixed(2)}
                  </text>
                </g>

                {/* TAKE PROFIT 3 LEVEL (Royal Blue) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp3Price)} 
                    x2="435" 
                    y2={getPriceScaleY(tp3Price)} 
                    stroke="#2563eb" 
                    strokeWidth="1.2" 
                    strokeDasharray="3,1" 
                  />
                  <rect x="437" y={getPriceScaleY(tp3Price) - 6} width="60" height="12" rx="2" fill="#2563eb" />
                  <text x="440" y={getPriceScaleY(tp3Price) + 2.5} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP3 {tp3Price.toFixed(2)}
                  </text>
                </g>

                {/* TAKE PROFIT 4 LEVEL (Royal Blue) */}
                <g>
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp4Price)} 
                    x2="435" 
                    y2={getPriceScaleY(tp4Price)} 
                    stroke="#2563eb" 
                    strokeWidth="1.2" 
                    strokeDasharray="3,1" 
                    opacity="0.85"
                  />
                  <rect x="437" y={getPriceScaleY(tp4Price) - 6} width="60" height="12" rx="2" fill="#2563eb" opacity="0.85" />
                  <text x="440" y={getPriceScaleY(tp4Price) + 2.5} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP4 {tp4Price.toFixed(2)}
                  </text>
                </g>

                {/* Linear gradient markers definition for shaded order block boxes */}
                <defs>
                  <linearGradient id="bullishObGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
                  </linearGradient>
                  <linearGradient id="bearishObGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>

              </svg>
            </div>

            {/* Timestamps footer alignment */}
            <div className="h-6 border-t border-white/5 bg-black/50 px-4 flex items-center justify-between text-[8px] text-white/30 font-mono">
              <span>08:00 (London Session Begin)</span>
              <span>12:00 (NY overlap - Sweep Window)</span>
              <span>13:30 (Institutional Inflow)</span>
              <span>16:00 (SMC Expansion Complete)</span>
            </div>

          </div>
        </div>

        {/* Educational Sidebar (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Main Title Badge */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-indigo-400">
              <Award size={16} />
              <h4 className="text-xs font-bold uppercase tracking-widest">SMC Orderflow Briefing</h4>
            </div>
            <p className="text-[10px] text-white/40 mt-1 uppercase">Oracle Live Confluence Companion</p>
          </div>

          {/* Color Guide details */}
          <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3">
            <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">High-Precision Legend</h5>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-500 inline-block border border-red-600" />
                <span className="text-xs text-white/80"><strong className="text-red-400">Stop Loss (SL)</strong>: Hard Invalidation Target</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block border border-emerald-600" />
                <span className="text-xs text-white/80"><strong className="text-emerald-400">Entry Zone</strong>: Mitigated Institutional Base</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block border border-blue-700" />
                <span className="text-xs text-white/80"><strong className="text-blue-400">Take Profits (TP)</strong>: Royal Blue Liquidation Nodes</span>
              </div>
            </div>
          </div>

          {/* Educational Concept Guide */}
          <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-3">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Info size={14} />
              <h5 className="text-[11px] font-bold uppercase tracking-wider">Concept Alignment</h5>
            </div>
            <div className="text-xs text-white/60 space-y-2.5 leading-relaxed">
              <p>
                <strong className="text-white">Order Block (OB)</strong>: Represented by the <span className="text-emerald-400 font-bold">shaded boxes</span>, representing high-volume institutional order limits.
              </p>
              <p>
                <strong className="text-white">Fair Value Gaps (FVG)</strong>: Represented by the <span className="text-purple-400 font-bold">unshaded boxes</span>, visualizing market imbalances that algorithms seek to fill.
              </p>
              <p>
                <strong className="text-white">BOS & CHoCH</strong>: Plotted via custom <span className="text-amber-400 font-bold">Trendlines</span>, marking local structural shifts (CHoCH) and trend continuations (BOS).
              </p>
              <p>
                <strong className="text-white">Liquidity Sweep & IDM</strong>: Illustrated via high-precision <span className="text-red-400 font-bold">dotted lines</span>, visualizing stop hunt levels where retail traders are swept before the expansion.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
