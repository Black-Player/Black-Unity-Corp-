import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, Eye, Play, Sparkles, AlertTriangle, ShieldCheck, 
  HelpCircle, Copy, Check, RefreshCw, BarChart2, BookOpen, Layers, Info
} from 'lucide-react';
import { Signal, UserProfile } from '../types';

interface UltimateConfluenceChartProps {
  signal: Partial<Signal>;
  userProfile: UserProfile;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type LayerType = 'all' | 'wyckoff' | 'ict' | 'smc' | 'supply_demand' | 'volume';

export default function UltimateConfluenceChart({ signal, userProfile, addToast }: UltimateConfluenceChartProps) {
  // Setup direction
  const isSignalBuy = signal.decision === 'Buy' || signal.stop_loss < signal.entry;
  const [direction, setDirection] = useState<'bullish' | 'bearish'>(isSignalBuy ? 'bullish' : 'bearish');
  const [activeLayer, setActiveLayer] = useState<LayerType>('all');
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animationStep, setAnimationStep] = useState(0); // 0: idle, 1: gathering retail stops, 2: stop hunt sweep, 3: displacement, 4: mitigation/re-entry
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Sync state if signal changes
  useEffect(() => {
    setDirection(isSignalBuy ? 'bullish' : 'bearish');
    setAnimationStep(0);
    setIsPlayingAnimation(false);
  }, [signal.id, isSignalBuy]);

  // Handle Liquidity Sweep animation sequence
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAnimation) {
      setAnimationStep(1);
      
      const sequence = [
        { step: 1, delay: 1800 }, // Gathering stops
        { step: 2, delay: 1500 }, // Stop hunt sweep (fast spike)
        { step: 3, delay: 1800 }, // Displacement impulse
        { step: 4, delay: 2000 }, // Mitigation & re-entry
        { step: 0, delay: 1000 }  // Back to idle
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

      timer = setTimeout(runNext, 1000);
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

  // Render prices scaled dynamically
  const getPriceScaleY = (price: number) => {
    const minPrice = Math.min(slPrice, entryPrice, tp1Price, tp2Price, tp3Price) * 0.995;
    const maxPrice = Math.max(slPrice, entryPrice, tp1Price, tp2Price, tp3Price) * 1.005;
    const range = maxPrice - minPrice;
    
    // Normalize to SVG height (320px frame)
    const percentage = (price - minPrice) / range;
    // For bullish: sl is low (bottom/higher Y), tp is high (top/lower Y)
    return 300 - (percentage * 240);
  };

  const getFullPromptText = () => {
    return `Create a professional trading chart of ${pairName} on 1H timeframe showing a complete institutional reversal setup during London/NY overlap session. Style: clean, educational, TradingView-style with white background, subtle grid, and volume bars. Direction is ${direction.toUpperCase()}.

1. MARKET STRUCTURE & WYCKOFF PHASE:
- SC, AR, ST, Spring (false breakdown below ST), Test, SOS (Sign of Strength), LPS, BU for BULLISH setup.
- AR, BU, ST, Upthrust (false breakout above ST), Test, SOS↓, LPS↓, BC for BEARISH setup.
- Overlay a smooth Parabolic Curve showing the direction transition.
- Mark Stop Hunt → Compression → Expansion.

2. INNER CIRCLE TRADER (ICT) CONFLUENCE:
- HTF PD Array (${direction === 'bullish' ? 'Discount Zone at accumulation low in Yellow' : 'Premium Zone at distribution high in Yellow'})
- MSS / CHOCH (dashed line at structural shift)
- Fair Value Gap / Imbalance (Purple rectangle)
- Optimal Trade Entry / OTE (62%-79% Fibonacci retracement shaded in Orange)
- Liquidity Mapping: SSL below lows / BSL above highs (Label: Sell-Side/Buy-Side Liquidity - Stop Hunt Zone)

3. SMART MONEY CONCEPTS (SMC):
- Order Block: ${direction === 'bullish' ? 'Blue rectangle on last bearish candle before Spring' : 'Red rectangle on last bullish candle before Upthrust'}
- Breaker Block: Failed OB that flips role.
- Mitigation Zone / Entry at ${entryPrice}.
- Stop Loss placed strictly at ${slPrice} representing the structural invalidation level.

4. RISK MANAGEMENT & EDUCATIONAL DETAILS:
- Entry Zone: ${entryPrice}
- Stop Loss: ${slPrice} (Invalid if price closes beyond this level on 4H)
- Take Profit Targets: TP1: ${tp1Price}, TP2: ${tp2Price}, TP3: ${tp3Price}
- Setup aligns with institutional order flow footprint.`;
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(getFullPromptText());
    setCopiedPrompt(true);
    addToast("Ultimate Confluence Chart Prompt copied to clipboard!", "success");
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Generate mock candlesticks to render the classic Wyckoff pattern nicely in SVG
  const generateCandles = () => {
    // 16 points along the chart representing the narrative flow
    if (direction === 'bullish') {
      return [
        { x: 30, open: 240, close: 260, high: 275, low: 235, type: 'bear', label: 'SC' },     // Selling Climax
        { x: 60, open: 250, close: 180, high: 175, low: 255, type: 'bull', label: 'AR' },     // Automatic Rally
        { x: 90, open: 185, close: 230, high: 245, low: 180, type: 'bear', label: 'ST' },     // Secondary Test
        { x: 120, open: 220, close: 210, high: 225, low: 205, type: 'bear', label: 'CMP' },   // Compression
        { x: 150, open: 210, close: 235, high: 240, low: 205, type: 'bear', label: 'CMP' },   // Compression
        { x: 180, open: 230, close: 265, high: 275, low: 285, type: 'bear', label: 'SPRING', isSweep: true }, // SPRING Stop Hunt wick
        { x: 210, open: 255, close: 220, high: 260, low: 215, type: 'bull', label: 'TEST' },   // Test
        { x: 240, open: 220, close: 170, high: 165, low: 225, type: 'bull', label: 'BOS' },    // CHOCH / Break of Structure
        { x: 270, open: 170, openS: 170, close: 140, high: 135, low: 175, type: 'bull', label: 'SOS' },    // Sign of Strength
        { x: 300, open: 145, close: 185, high: 190, low: 180, type: 'bear', label: 'LPS', isMitigation: true }, // Pullback into OB (Mitigation / Entry Zone)
        { x: 330, open: 180, close: 110, high: 105, low: 185, type: 'bull', label: 'BU' },     // Backup / Markup Launch
        { x: 360, open: 110, close: 80, high: 75, low: 115, type: 'bull', label: 'MU' },      // Markup
        { x: 390, open: 80, close: 50, high: 45, low: 85, type: 'bull', label: 'TP1' },      // TP1 Target
        { x: 420, open: 55, close: 30, high: 25, low: 60, type: 'bull', label: 'TP2' }       // TP2 Target
      ];
    } else {
      // Bearish Distribution candles
      return [
        { x: 30, open: 120, close: 90, high: 85, low: 125, type: 'bull', label: 'BC' },      // Buying Climax
        { x: 60, open: 100, close: 170, high: 175, low: 95, type: 'bear', label: 'AR' },     // Automatic Rally
        { x: 90, open: 165, close: 110, high: 100, low: 170, type: 'bull', label: 'ST' },     // Secondary Test of highs
        { x: 120, open: 120, close: 130, high: 140, low: 115, type: 'bull', label: 'CMP' },   // Compression
        { x: 150, open: 130, close: 115, high: 135, low: 110, type: 'bull', label: 'CMP' },   // Compression
        { x: 180, open: 120, close: 75, high: 60, low: 125, type: 'bull', label: 'UTAD', isSweep: true }, // Upthrust (UTAD) Stop Hunt wick
        { x: 210, open: 85, close: 130, high: 80, low: 135, type: 'bear', label: 'TEST' },    // Test
        { x: 240, open: 130, close: 190, high: 195, low: 125, type: 'bear', label: 'BOS' },    // CHOCH / Break of Structure
        { x: 270, open: 190, close: 220, high: 225, low: 185, type: 'bear', label: 'SOW' },    // Sign of Weakness (SOS↓)
        { x: 300, open: 215, close: 175, high: 170, low: 220, type: 'bull', label: 'LPS', isMitigation: true }, // Pullback into Supply OB (Mitigation / Entry Zone)
        { x: 330, open: 180, close: 250, high: 255, low: 175, type: 'bear', label: 'LPS↓' },   // Last Point of Supply Launch
        { x: 360, open: 250, close: 275, high: 280, low: 245, type: 'bear', label: 'MD' },     // Markdown
        { x: 390, open: 275, close: 295, high: 300, low: 270, type: 'bear', label: 'TP1' },    // TP1 Target
        { x: 420, open: 290, close: 310, high: 315, low: 285, type: 'bear', label: 'TP2' }     // TP2 Target
      ];
    }
  };

  const candles = generateCandles();

  return (
    <div className="space-y-6">
      {/* Upper header action controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400 animate-pulse" size={16} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ultimate Institutional Confluence Dashboard</h3>
          </div>
          <p className="text-xs text-white/40 mt-1">Multi-layered educational framework visualizing live algorithmic setups.</p>
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

          {/* Animation trigger */}
          <button
            onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
            className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isPlayingAnimation ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 animate-pulse' : 'bg-black/40 border-white/10 text-white/80 hover:bg-white/5'}`}
          >
            {isPlayingAnimation ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />}
            <span>{isPlayingAnimation ? 'Animating Sweep...' : 'Play Liquidity Sweep'}</span>
          </button>

          {/* Copy Prompt option */}
          <button
            onClick={copyPromptToClipboard}
            className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-black hover:border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export full bidirectional text prompt to generate this exact setup in any image generator"
          >
            {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedPrompt ? 'Copied!' : 'Export Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual SVG Chart Left, Educational Pane Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Live Render Canvas (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          
          {/* Layer Filter Bar */}
          <div className="flex items-center overflow-x-auto pb-1 gap-1.5 scrollbar-thin scrollbar-thumb-white/10">
            <button
              onClick={() => setActiveLayer('all')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer ${activeLayer === 'all' ? 'bg-white/20 text-white border border-white/20' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              <Layers size={10} />
              All Layers
            </button>
            <button
              onClick={() => setActiveLayer('wyckoff')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${activeLayer === 'wyckoff' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              📊 Wyckoff Schematic
            </button>
            <button
              onClick={() => setActiveLayer('ict')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${activeLayer === 'ict' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              ⚡ ICT Confluence
            </button>
            <button
              onClick={() => setActiveLayer('smc')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${activeLayer === 'smc' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              🛡️ SMC Core
            </button>
            <button
              onClick={() => setActiveLayer('supply_demand')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${activeLayer === 'supply_demand' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              🟢 Supply/Demand
            </button>
            <button
              onClick={() => setActiveLayer('volume')}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${activeLayer === 'volume' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
            >
              📈 Volume Profile
            </button>
          </div>

          {/* TradingView-Style SVG Canvas */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[340px] rounded-2xl bg-slate-950 border border-white/10 overflow-hidden flex flex-col select-none">
            
            {/* Grid Watermark background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Session Indicator Watermark */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <p className="font-mono text-[9px] text-white/60 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                London / NY Overlap Session (1H)
              </p>
            </div>
            
            {/* Asset Identifier */}
            <div className="absolute top-4 right-16 text-right font-mono">
              <h4 className="text-xs font-bold text-white tracking-widest">{pairName} • 1H</h4>
              <p className="text-[8px] text-white/40 uppercase">TradingView Confluence Vector</p>
            </div>

            {/* Live Animation Overlay Alerts */}
            <AnimatePresence>
              {animationStep > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-600/90 border border-indigo-400/30 text-white shadow-xl flex items-center gap-2 z-10"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
                    {animationStep === 1 && "Phase 1: Gathering Retail Stops (Liquidity Pooling)"}
                    {animationStep === 2 && "Phase 2: STOP HUNT SWEEP (Institutional Liquidity Sweep!)"}
                    {animationStep === 3 && "Phase 3: DISPLACEMENT INFLOW (BOS/CHOCH shifting Structure)"}
                    {animationStep === 4 && "Phase 4: MITIGATION & RE-ENTRY (Tapping the demand OB)"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SVG Render Element */}
            <div className="flex-1 w-full h-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 320" preserveAspectRatio="none">
                
                {/* Horizontal grid guide lines */}
                {[50, 100, 150, 200, 250, 300].map((y) => (
                  <line key={y} x1="0" y1={y} x2="450" y2={y} stroke="rgba(255,255,255,0.02)" strokeDasharray="2,4" />
                ))}

                {/* Left/Right Dividers */}
                <line x1="450" y1="0" x2="450" y2="320" stroke="rgba(255,255,255,0.1)" />

                {/* 1. Wyckoff schematic curves & indicators */}
                {(activeLayer === 'all' || activeLayer === 'wyckoff') && (
                  <g>
                    {/* Parabolic Flow Curve */}
                    <path
                      d={direction === 'bullish' 
                        ? "M 20 250 Q 180 300 240 200 T 430 40" 
                        : "M 20 100 Q 180 50 240 150 T 430 300"
                      }
                      fill="none"
                      stroke={direction === 'bullish' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(52, 211, 153, 0.25)'}
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    
                    {/* MM Method Marker label */}
                    <rect x="20" y="295" width="230" height="16" rx="4" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.05)" />
                    <text x="25" y="306" fill="rgba(255,255,255,0.6)" fontSize="7" fontFamily="monospace">
                      CYCLE: STOP HUNT → COMPRESSION → EXPANSION
                    </text>
                  </g>
                )}

                {/* 2. ICT Confluence Zones */}
                {(activeLayer === 'all' || activeLayer === 'ict') && (
                  <g>
                    {/* HTF PD Array - Yellow block */}
                    <rect 
                      x="140" 
                      y={direction === 'bullish' ? "265" : "40"} 
                      width="80" 
                      height="20" 
                      fill="rgba(234, 179, 8, 0.08)" 
                      stroke="rgba(234, 179, 8, 0.25)" 
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text 
                      x="145" 
                      y={direction === 'bullish' ? "277" : "52"} 
                      fill="#eab308" 
                      fontSize="7" 
                      fontFamily="monospace" 
                      fontWeight="bold"
                    >
                      HTF PD ARRAY ({direction === 'bullish' ? 'DISCOUNT' : 'PREMIUM'})
                    </text>

                    {/* FVG Imbalance Area - Purple zone */}
                    <rect 
                      x="230" 
                      y={direction === 'bullish' ? "180" : "130"} 
                      width="50" 
                      height="35" 
                      fill="rgba(168, 85, 247, 0.08)" 
                      stroke="rgba(168, 85, 247, 0.25)" 
                    />
                    <text 
                      x="233" 
                      y={direction === 'bullish' ? "200" : "150"} 
                      fill="#a855f7" 
                      fontSize="7" 
                      fontFamily="monospace"
                    >
                      FVG / IMBALANCE
                    </text>

                    {/* OTE Shading zone (62% - 79%) - Orange Shaded region */}
                    <rect 
                      x="290" 
                      y={direction === 'bullish' ? "140" : "170"} 
                      width="40" 
                      height="25" 
                      fill="rgba(249, 115, 22, 0.1)" 
                      stroke="rgba(249, 115, 22, 0.3)" 
                    />
                    <text x="294" y={direction === 'bullish' ? "155" : "185"} fill="#f97316" fontSize="7" fontFamily="monospace" fontWeight="bold">
                      OTE ZONE
                    </text>

                    {/* Liquidity Sweep / SSL / BSL Highlight */}
                    <path 
                      d={direction === 'bullish' ? "M 140 275 L 210 275" : "M 140 50 L 210 50"} 
                      stroke="rgba(239, 68, 68, 0.4)" 
                      strokeWidth="1" 
                      strokeDasharray="2,2" 
                    />
                    <circle 
                      cx="180" 
                      cy={direction === 'bullish' ? 275 : 50} 
                      r="3" 
                      fill={animationStep === 2 ? '#ef4444' : 'transparent'} 
                      stroke="#ef4444" 
                      strokeWidth="1" 
                      className={animationStep === 2 ? 'animate-ping' : ''}
                    />
                    <text 
                      x="150" 
                      y={direction === 'bullish' ? "286" : "44"} 
                      fill="#ef4444" 
                      fontSize="7" 
                      fontFamily="monospace"
                    >
                      {direction === 'bullish' ? 'SSL (SELL-SIDE) STOP HUNT' : 'BSL (BUY-SIDE) STOP HUNT'}
                    </text>
                  </g>
                )}

                {/* 3. SMC core blocks */}
                {(activeLayer === 'all' || activeLayer === 'smc') && (
                  <g>
                    {/* Order Block Rectangle - Blue / Red */}
                    <rect 
                      x="280" 
                      y={direction === 'bullish' ? "170" : "140"} 
                      width="45" 
                      height="30" 
                      fill={direction === 'bullish' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)'} 
                      stroke={direction === 'bullish' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'} 
                      strokeWidth="1" 
                    />
                    <text 
                      x="284" 
                      y={direction === 'bullish' ? "188" : "158"} 
                      fill={direction === 'bullish' ? '#3b82f6' : '#ef4444'} 
                      fontSize="7" 
                      fontFamily="monospace" 
                      fontWeight="bold"
                    >
                      {direction === 'bullish' ? 'BULLISH OB' : 'BEARISH OB'}
                    </text>

                    {/* Mitigation / Entry marker */}
                    <line 
                      x1="290" 
                      y1={direction === 'bullish' ? "185" : "155"} 
                      x2="450" 
                      y2={direction === 'bullish' ? "185" : "155"} 
                      stroke="#10b981" 
                      strokeWidth="1" 
                      strokeDasharray="2,2" 
                    />
                    <text 
                      x="335" 
                      y={direction === 'bullish' ? "181" : "151"} 
                      fill="#10b981" 
                      fontSize="7" 
                      fontFamily="monospace"
                    >
                      MITIGATION = ENTRY ZONE
                    </text>
                  </g>
                )}

                {/* 4. Supply & Demand Zones */}
                {(activeLayer === 'all' || activeLayer === 'supply_demand') && (
                  <g>
                    {direction === 'bullish' ? (
                      // Demand Zone (Base RBR)
                      <rect 
                        x="200" 
                        y="220" 
                        width="90" 
                        height="30" 
                        fill="rgba(16, 185, 129, 0.08)" 
                        stroke="rgba(16, 185, 129, 0.2)" 
                      />
                    ) : (
                      // Supply Zone (Base DBD)
                      <rect 
                        x="200" 
                        y="80" 
                        width="90" 
                        height="30" 
                        fill="rgba(239, 68, 68, 0.08)" 
                        stroke="rgba(239, 68, 68, 0.2)" 
                      />
                    )}
                    <text 
                      x="205" 
                      y={direction === 'bullish' ? "238" : "98"} 
                      fill={direction === 'bullish' ? '#10b981' : '#ef4444'} 
                      fontSize="7" 
                      fontFamily="monospace"
                    >
                      {direction === 'bullish' ? 'DEMAND ZONE (RBR)' : 'SUPPLY ZONE (DBD)'}
                    </text>
                  </g>
                )}

                {/* 5. Volume Profile on the right axis */}
                {(activeLayer === 'all' || activeLayer === 'volume') && (
                  <g opacity="0.4">
                    {/* Draw volume bars sticking out from the right axis */}
                    <rect x="420" y="60" width="30" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="410" y="75" width="40" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="390" y="90" width="60" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="405" y="105" width="45" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="375" y="120" width="75" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    {/* Point Of Control (POC) Blue horizontal line across */}
                    <line x1="360" y1="127" x2="450" y2="127" stroke="#3b82f6" strokeWidth="1.5" />
                    <text x="365" y="124" fill="#3b82f6" fontSize="6" fontFamily="monospace" fontWeight="bold">POC</text>
                    
                    <rect x="425" y="135" width="25" height="15" fill="rgba(59, 130, 246, 0.2)" />
                    <text x="405" y="146" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="monospace">LVN</text>
                    <rect x="380" y="150" width="70" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="415" y="165" width="35" height="15" fill="rgba(59, 130, 246, 0.3)" />
                    <rect x="430" y="180" width="20" height="15" fill="rgba(59, 130, 246, 0.3)" />
                  </g>
                )}

                {/* 6. Draw Candles */}
                <g>
                  {candles.map((c, i) => {
                    const isBear = c.type === 'bear';
                    const isSweeping = c.isSweep && animationStep === 2;
                    const isMitigating = c.isMitigation && animationStep === 4;
                    
                    let wickColor = isBear ? '#ef4444' : '#10b981';
                    let bodyColor = isBear ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
                    let strokeColor = isBear ? '#ef4444' : '#10b981';

                    // Glow or change colors during animations
                    if (isSweeping) {
                      bodyColor = '#ef4444';
                      wickColor = '#f43f5e';
                      strokeColor = '#ffffff';
                    } else if (isMitigating) {
                      bodyColor = '#10b981';
                      wickColor = '#34d399';
                      strokeColor = '#ffffff';
                    }

                    return (
                      <g key={i}>
                        {/* Candle wick */}
                        <line 
                          x1={c.x} 
                          y1={c.high} 
                          x2={c.x} 
                          y2={c.low} 
                          stroke={wickColor} 
                          strokeWidth={c.isSweep ? "2" : "1.5"} 
                        />
                        {/* Candle body */}
                        <rect 
                          x={c.x - 5} 
                          y={Math.min(c.open, c.close)} 
                          width="10" 
                          height={Math.max(4, Math.abs(c.open - c.close))} 
                          fill={bodyColor} 
                          stroke={strokeColor} 
                          strokeWidth="1" 
                        />
                        
                        {/* Wyckoff Phase Annotation Text Labels */}
                        {(activeLayer === 'all' || activeLayer === 'wyckoff') && c.label && (
                          <g>
                            <rect 
                              x={c.x - 14} 
                              y={isBear ? c.low + 6 : c.high - 16} 
                              width="28" 
                              height="10" 
                              rx="2" 
                              fill="rgba(0,0,0,0.85)" 
                              stroke="rgba(255,255,255,0.15)" 
                              strokeWidth="0.5" 
                            />
                            <text 
                              x={c.x} 
                              y={isBear ? c.low + 13 : c.high - 9} 
                              fill={c.isSweep ? "#ef4444" : "rgba(255,255,255,0.8)"} 
                              fontSize="6" 
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

                {/* 7. Plot exact signal price levels along the right TradingView-style scale */}
                <g>
                  {/* Stop Loss Line */}
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(slPrice)} 
                    x2="450" 
                    y2={getPriceScaleY(slPrice)} 
                    stroke="#ef4444" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />
                  <rect x="452" y={getPriceScaleY(slPrice) - 6} width="45" height="12" rx="2" fill="#ef4444" />
                  <text x="455" y={getPriceScaleY(slPrice) + 3} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    SL: {slPrice.toFixed(2)}
                  </text>

                  {/* Entry Zone */}
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(entryPrice)} 
                    x2="450" 
                    y2={getPriceScaleY(entryPrice)} 
                    stroke="#f59e0b" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />
                  <rect x="452" y={getPriceScaleY(entryPrice) - 6} width="45" height="12" rx="2" fill="#f59e0b" />
                  <text x="455" y={getPriceScaleY(entryPrice) + 3} fill="#000000" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ENT: {entryPrice.toFixed(2)}
                  </text>

                  {/* TP1 Line */}
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp1Price)} 
                    x2="450" 
                    y2={getPriceScaleY(tp1Price)} 
                    stroke="#10b981" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />
                  <rect x="452" y={getPriceScaleY(tp1Price) - 6} width="45" height="12" rx="2" fill="#10b981" />
                  <text x="455" y={getPriceScaleY(tp1Price) + 3} fill="#000000" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP1: {tp1Price.toFixed(2)}
                  </text>

                  {/* TP2 Line */}
                  <line 
                    x1="0" 
                    y1={getPriceScaleY(tp2Price)} 
                    x2="450" 
                    y2={getPriceScaleY(tp2Price)} 
                    stroke="#059669" 
                    strokeWidth="1" 
                    strokeDasharray="4,2" 
                  />
                  <rect x="452" y={getPriceScaleY(tp2Price) - 6} width="45" height="12" rx="2" fill="#059669" />
                  <text x="455" y={getPriceScaleY(tp2Price) + 3} fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    TP2: {tp2Price.toFixed(2)}
                  </text>
                </g>

                {/* Draw CHOCH / MSS Red dotted line */}
                {(activeLayer === 'all' || activeLayer === 'ict') && (
                  <g>
                    <path 
                      d={direction === 'bullish' ? "M 200 170 L 250 170" : "M 200 195 L 250 195"} 
                      stroke="#ef4444" 
                      strokeWidth="1.2" 
                      strokeDasharray="3,3" 
                    />
                    <circle cx="205" cy={direction === 'bullish' ? 170 : 195} r="2.5" fill="#ef4444" />
                    <text 
                      x="212" 
                      y={direction === 'bullish' ? "166" : "205"} 
                      fill="#ef4444" 
                      fontSize="6.5" 
                      fontFamily="monospace" 
                      fontWeight="bold"
                    >
                      {direction === 'bullish' ? 'BULLISH MSS / CHOCH' : 'BEARISH MSS / CHOCH'}
                    </text>
                  </g>
                )}

                {/* Projected path arrow */}
                <g>
                  <path
                    d={direction === 'bullish' 
                      ? "M 300 185 Q 320 180 340 100 T 430 35" 
                      : "M 300 175 Q 320 180 340 240 T 430 295"
                    }
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                  />
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                    </marker>
                  </defs>
                  <text 
                    x="345" 
                    y={direction === 'bullish' ? "120" : "215"} 
                    fill="#10b981" 
                    fontSize="7" 
                    fontFamily="monospace" 
                    fontWeight="bold"
                    transform={`rotate(${direction === 'bullish' ? -35 : 35}, 345, ${direction === 'bullish' ? 120 : 215})`}
                  >
                    PROJECTED {direction === 'bullish' ? 'MARKUP' : 'MARKDOWN'}
                  </text>
                </g>

              </svg>
            </div>

            {/* Bottom Timeline Watermark */}
            <div className="h-6 border-t border-white/5 bg-black/50 px-4 flex items-center justify-between text-[8px] text-white/30 font-mono">
              <span>08:00 (London Open)</span>
              <span>12:00 (NY Session Sweep)</span>
              <span>13:30 (Overlap Sweep)</span>
              <span>16:00 (London Close)</span>
            </div>

          </div>
        </div>

        {/* Educational Sidebar (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Main Title Badge */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-indigo-400">
              <BookOpen size={16} />
              <h4 className="text-xs font-bold uppercase tracking-widest">SMC Educational Briefing</h4>
            </div>
            <p className="text-[10px] text-white/40 mt-1 uppercase">Oracle Companion Guide</p>
          </div>

          {/* Why the Setup Works panel */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck size={14} />
              <h5 className="text-[11px] font-bold uppercase tracking-wider">Why the Signal Will Work</h5>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Price sweeped preceding session high/low stop pools ({direction === 'bullish' ? 'SSL' : 'BSL'}). Retail traders were forced out of their positions, creating rapid order fills for institutional algorithms. A strong displacement impulse shifted the local bias, leaving a highly visible Fair Value Gap (imbalance) and a clean mitigation block at <code className="text-amber-400 bg-amber-400/10 px-1 rounded font-mono">{entryPrice.toFixed(2)}</code> which acts as an optimal springboard.
            </p>
          </div>

          {/* Setup Invalidation / Violation Rules */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={14} />
              <h5 className="text-[11px] font-bold uppercase tracking-wider">What Would Violate Setup</h5>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              If a 1-hour or 4-hour candle closes strictly beyond <code className="text-red-400 bg-red-400/10 px-1 rounded font-mono">{slPrice.toFixed(2)}</code>, the institutional demand base has failed. The Order Block converts to a Bearish/Bullish Breaker block, shifting the medium-term flow direction. We exit immediately to protect capital—capital preservation is our ultimate directive.
            </p>
          </div>

          {/* SMC spotlight explanation */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400">
              <Info size={14} />
              <h5 className="text-[11px] font-bold uppercase tracking-wider">SMC Spotlight: Order Blocks</h5>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              An Order Block is a specialized zone where market makers place heavy, passive buy or sell limit orders. When price aggressively breaks out, it leaves behind an imbalance (FVG). When price re-enters to tap into the unmitigated OB base, it represents the exact spot institutional players add further capital—this represents our lowest risk entry point.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
